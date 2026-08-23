import { defineStore } from 'pinia'
import { CITY_LIST } from '@/data/cityList'
import {
  fetchCurrentWeather,
  fetchAirPollution,
  hasOpenWeatherKey,
  searchPlaces,
} from '@/api/openWeatherApi'
import { fetchDailyOutlook, fetchWeeklyNights } from '@/api/openMeteoApi'
import { fetchNearbyCampsites, fetchAllCampsites, hasGoCampingKey } from '@/api/goCampingApi'
import { bonfireScore, bonfireGrade } from '@/composables/useBonfireScore'

/**
 * 지역별 날씨를 API 에서 받아와 보관한다.
 *
 * 지도와 지수판과 목록이 같은 데이터를 보고, 화면을 오갈 때마다 다시 부르면
 * 낭비라서 스토어에 담고 10분 동안은 캐시를 그대로 쓴다.
 *
 * 17개 시도를 한 번 채우는 데 드는 호출은 35콜이다.
 *   현재 날씨 17 + 대기 오염 17 + Open-Meteo 1 (17개 지점을 한 번에)
 */
const CACHE_MS = 10 * 60 * 1000
// 야영장 목록은 날씨처럼 자주 바뀌지 않는다
const ALL_CAMPS_CACHE_MS = 60 * 60 * 1000
const EXTRA_KEY = 'skala-vue:extra-places'

// 검색으로 더한 지역은 새로고침해도 남아야 상세 링크가 끊기지 않는다.
function loadExtraPlaces() {
  try {
    const saved = JSON.parse(localStorage.getItem(EXTRA_KEY))
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

// 한국 기준 미세먼지(PM10) 등급
function dustGrade(pm10) {
  if (pm10 <= 30) return '좋음'
  if (pm10 <= 80) return '보통'
  if (pm10 <= 150) return '나쁨'
  return '매우나쁨'
}

export const useWeatherStore = defineStore('weather', {
  state: () => ({
    cities: [],
    loading: false,
    error: null,
    loadedAt: 0,

    // Geocoding 으로 찾아서 목록에 더한 지역. 기본 10곳 뒤에 붙는다.
    extraPlaces: loadExtraPlaces(),
    searching: false,
    searchResults: [],

    // 지역마다 근처 야영장 대표 사진 한 장. 카드 배경으로 쓴다.
    photos: {},

    // 지역 id → { at, camps }. 오늘의 추천에서 지역을 바꿔 가며 본다.
    campsByCity: {},
    campPoolLoading: false,
    campPoolError: '',

    // 이번 주 밤 예보. 지역마다 5일 정도의 밤이 들어온다.
    weekNights: {},
    weekLoading: false,
    weekError: '',
    weekAt: 0,

    // 전국 야영장 전체. 캠핑장 찾기의 검색 대상이다.
    allCamps: [],
    allLoading: false,
    allError: '',
    allAt: 0,
  }),

  getters: {
    // 기본 지역 + 검색으로 추가한 지역
    targets: (state) => [...CITY_LIST, ...state.extraPlaces],

    isStale: (state) => Date.now() - state.loadedAt > CACHE_MS,
    isEmpty: (state) => state.cities.length === 0,

    // 모닥불 지수를 붙인 목록. 목록·순위·표지가 같은 값을 본다.
    scoredCities: (state) =>
      state.cities.map((city) => {
        const score = bonfireScore(city)
        return { ...city, score, grade: bonfireGrade(score), photo: state.photos[city.id] ?? '' }
      }),

    getCity() {
      return (cityId) => this.scoredCities.find((city) => city.id === cityId) ?? null
    },

    // 오늘 1위
    bestTonight() {
      return [...this.scoredCities].sort((a, b) => b.score - a.score)[0] ?? null
    },

    // 지수가 높은 순
    rankedCities() {
      return [...this.scoredCities].sort((a, b) => b.score - a.score)
    },
  },

  actions: {
    async load(force = false) {
      if (this.loading) return
      if (!force && this.cities.length && !this.isStale) return

      if (!hasOpenWeatherKey()) {
        this.error =
          'OpenWeatherMap API 키가 없습니다. .env 의 VITE_OPENWEATHER_API_KEY 를 확인하세요.'
        return
      }

      this.loading = true
      this.error = null

      const targets = this.targets

      try {
        const [currents, airs, outlooks] = await Promise.all([
          Promise.all(targets.map((city) => fetchCurrentWeather(city))),
          Promise.all(targets.map((city) => fetchAirPollution(city))),
          fetchDailyOutlook(targets),
        ])

        this.cities = targets.map((city, index) => {
          const { cityId, ...outlook } = outlooks[index]
          const air = airs[index]
          return {
            ...city,
            ...currents[index],
            ...outlook,
            pm10: air.pm10,
            pm25: air.pm25,
            aqi: air.aqi,
            dust: dustGrade(air.pm10),
          }
        })
        this.loadedAt = Date.now()
        console.log(`[weatherStore] ${this.cities.length}개 지역을 API 에서 받아왔습니다`)
      } catch (error) {
        const status = error.response?.status
        this.error =
          status === 401
            ? 'API 키가 아직 활성화되지 않았거나 잘못되었습니다. (401)'
            : `날씨 정보를 불러오지 못했습니다. ${error.message}`
        console.error('[weatherStore]', error)
      } finally {
        this.loading = false
      }
    },

    refresh() {
      this.photos = {}
      return this.load(true)
    },

    /**
     * 지역마다 근처 야영장 사진을 한 장씩 받아 카드 배경으로 쓴다.
     * 날씨보다 급하지 않으므로 목록이 그려진 뒤에 따로 부른다.
     * 한 곳이라도 실패하면 그 지역만 사진 없이 간다.
     */
    async loadPhotos() {
      if (!hasGoCampingKey()) return
      const targets = this.cities.filter((city) => !this.photos[city.id])
      if (!targets.length) return

      const results = await Promise.allSettled(
        targets.map((city) =>
          fetchNearbyCampsites({ lat: city.lat, lon: city.lon }, { radius: 30000, count: 4 }),
        ),
      )

      const next = { ...this.photos }
      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') return
        // 지형이 적힌 야영장(산·숲·해변 등)이 풍경 사진일 확률이 높다.
        // 없으면 사진이 있는 아무 곳이나 쓴다.
        const scenic = result.value.find((camp) => camp.image && camp.terrain.length)
        const withPhoto = scenic ?? result.value.find((camp) => camp.image)
        if (withPhoto) next[targets[index].id] = withPhoto.image
      })
      this.photos = next
    },

    // 검색으로 더한 지역 제거
    removePlace(cityId) {
      this.extraPlaces = this.extraPlaces.filter((place) => place.id !== cityId)
      localStorage.setItem(EXTRA_KEY, JSON.stringify(this.extraPlaces))
      this.cities = this.cities.filter((city) => city.id !== cityId)
    },

    /**
     * 목록에 없는 지역을 OpenWeatherMap Geocoding 으로 찾는다.
     * 검색 결과가 없을 때 막다른 길로 끝내지 않고 여기서 이어간다.
     */
    async searchPlace(query) {
      const keyword = query.trim()
      if (!keyword || !hasOpenWeatherKey()) return

      this.searching = true
      this.searchResults = []
      try {
        const found = await searchPlaces(keyword)
        // 이미 목록에 있는 지역은 뺀다
        const known = new Set(this.targets.map((city) => `${city.lat},${city.lon}`))
        this.searchResults = found.filter((place) => !known.has(`${place.lat},${place.lon}`))
      } catch (error) {
        console.error('[weatherStore] 지역 검색 실패', error)
        this.searchResults = []
      } finally {
        this.searching = false
      }
    },

    /**
     * 이번 주 밤 예보를 받는다. 전 지역이 1콜이라 따로 아낄 게 없다.
     */
    async loadWeek() {
      if (this.weekLoading) return
      if (Object.keys(this.weekNights).length && Date.now() - this.weekAt < CACHE_MS) return

      this.weekLoading = true
      this.weekError = ''
      try {
        const rows = await fetchWeeklyNights(this.targets)
        this.weekNights = Object.fromEntries(rows.map((row) => [row.cityId, row.nights]))
        this.weekAt = Date.now()
        console.log(`[weatherStore] 이번 주 밤 예보를 ${rows.length}개 지역에서 받았습니다`)
      } catch (error) {
        console.error('[weatherStore] 주간 예보 실패', error)
        this.weekError = error?.message ?? '주간 예보를 불러오지 못했습니다.'
      } finally {
        this.weekLoading = false
      }
    },

    /**
     * 전국 야영장을 한 번 받아 둔다.
     *
     * 검색은 이름뿐 아니라 지역·지형으로도 해야 하는데 고캠핑 검색 오퍼레이션은 이름만 훑는다.
     * 그래서 전체를 받아 브라우저에서 거른다. 압축하면 1.2MB 라 한 번은 감당할 만하고,
     * 목록이 자주 바뀌는 자료가 아니라 오래 들고 있어도 된다.
     */
    async loadAllCamps() {
      if (this.allLoading) return
      if (this.allCamps.length && Date.now() - this.allAt < ALL_CAMPS_CACHE_MS) return

      if (!hasGoCampingKey()) {
        this.allError = '고캠핑 API 키가 없습니다. .env 의 VITE_GOCAMPING_API_KEY 를 확인하세요.'
        return
      }

      this.allLoading = true
      this.allError = ''
      try {
        this.allCamps = await fetchAllCampsites()
        this.allAt = Date.now()
        console.log(`[weatherStore] 전국 야영장 ${this.allCamps.length}곳을 받았습니다`)
      } catch (error) {
        console.error('[weatherStore] 전국 야영장 실패', error)
        this.allError = error?.message ?? '야영장 목록을 불러오지 못했습니다.'
      } finally {
        this.allLoading = false
      }
    },

    /**
     * 캠핑 종류 화면에 쓸 야영장을 모은다.
     *
     * 전국을 다 긁으면 17콜이라 과하다. 오늘 지수가 높은 지역 몇 곳에서만 모으면
     * 콜도 적고, '추천'이라는 말이 실제로 오늘 날씨에 근거하게 된다.
     * 같은 야영장이 두 지역 반경에 걸쳐 있을 수 있어 id 로 한 번 걸러낸다.
     */
    /**
     * 지역 하나 근처의 야영장. '오늘의 추천' 에서 고른 지역에 쓴다.
     * 고른 지역이 여기저기 오갈 수 있으므로 id 별로 담아 두고 10분간 다시 안 부른다.
     */
    async loadCampsFor(city, { radius = 40000, count = 40 } = {}) {
      if (!city) return
      const cached = this.campsByCity[city.id]
      if (cached && Date.now() - cached.at < CACHE_MS) return

      if (!hasGoCampingKey()) {
        this.campPoolError =
          '고캠핑 API 키가 없습니다. .env 의 VITE_GOCAMPING_API_KEY 를 확인하세요.'
        return
      }

      this.campPoolLoading = true
      this.campPoolError = ''
      try {
        const camps = await fetchNearbyCampsites(city, { radius, count })
        this.campsByCity = {
          ...this.campsByCity,
          [city.id]: { at: Date.now(), camps: camps.map((camp) => ({ ...camp, from: city })) },
        }
      } catch (error) {
        console.error('[weatherStore] 지역 야영장 실패', error)
        this.campPoolError = error?.message ?? '야영장 정보를 불러오지 못했습니다.'
      } finally {
        this.campPoolLoading = false
      }
    },

    // 찾은 지역을 목록에 더하고 관측값을 다시 받는다.
    async addPlace(place) {
      const id = `geo_${place.lat}_${place.lon}`
      if (this.targets.some((city) => city.id === id)) return

      this.extraPlaces = [...this.extraPlaces, { ...place, id }]
      localStorage.setItem(EXTRA_KEY, JSON.stringify(this.extraPlaces))
      this.searchResults = []
      await this.load(true)
      console.log(`[weatherStore] '${place.name}' 을(를) 목록에 추가했습니다`)
    },
  },
})
