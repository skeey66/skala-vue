import axios from 'axios'
import { attachRetry } from './retry'

/**
 * OpenWeatherMap.
 *
 * 무료 플랜에서 쓸 수 있는 네 가지를 쓴다.
 *   /weather          현재 날씨
 *   /air_pollution    대기 오염 (PM10, PM2.5)
 *   /forecast         5일 3시간 예보
 *   /geo/1.0/direct   지역 이름으로 좌표 찾기
 */
const owm = axios.create({
  baseURL: '/api/owm/data/2.5',
  timeout: 8000,
  params: {
    units: 'metric',
    lang: 'kr',
  },
})

attachRetry(owm, '날씨')

export function hasOpenWeatherKey() {
  return __HAS_OWM_KEY__
}

// 현재 날씨
export async function fetchCurrentWeather({ lat, lon }) {
  const { data } = await owm.get('/weather', { params: { lat, lon } })
  return {
    temp: Math.round(data.main.temp * 10) / 10,
    feelsLike: Math.round(data.main.feels_like * 10) / 10,
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    wind: Math.round(data.wind.speed * 10) / 10,
    gust: data.wind.gust ? Math.round(data.wind.gust * 10) / 10 : null, // 순간 최대 풍속
    windDeg: data.wind.deg,
    rain1h: data.rain?.['1h'] ?? 0,
    snow1h: data.snow?.['1h'] ?? 0,
    clouds: data.clouds.all,
    visibility: Math.round((data.visibility ?? 0) / 1000),
    status: data.weather[0]?.description ?? '알 수 없음',
    statusMain: data.weather[0]?.main ?? '',
    icon: data.weather[0]?.icon ?? '',
    sunrise: data.sys.sunrise * 1000,
    sunset: data.sys.sunset * 1000,
    observedAt: data.dt * 1000,
  }
}

// 대기 오염 (미세먼지)
export async function fetchAirPollution({ lat, lon }) {
  const { data } = await owm.get('/air_pollution', { params: { lat, lon } })
  const item = data.list[0]
  return {
    aqi: item.main.aqi,
    pm10: Math.round(item.components.pm10),
    pm25: Math.round(item.components.pm2_5),
  }
}

// 5일 3시간 예보. 앞쪽 구간만 잘라서 쓴다.
export async function fetchForecast({ lat, lon }, slots = 8) {
  const { data } = await owm.get('/forecast', { params: { lat, lon, cnt: slots } })
  return data.list.map((item) => ({
    time: item.dt * 1000,
    temp: Math.round(item.main.temp * 10) / 10,
    feelsLike: Math.round(item.main.feels_like * 10) / 10,
    humidity: item.main.humidity,
    wind: Math.round(item.wind.speed * 10) / 10,
    gust: item.wind.gust ? Math.round(item.wind.gust * 10) / 10 : null,
    clouds: item.clouds.all,
    rainProb: Math.round((item.pop ?? 0) * 100),
    rain3h: item.rain?.['3h'] ?? 0,
    status: item.weather[0]?.description ?? '',
    statusMain: item.weather[0]?.main ?? '',
  }))
}

/**
 * 5일 야간 예보.
 *
 * /forecast 는 3시간 간격 40개 구간(5일)을 준다. 앞의 8개만 쓰면 아까워서
 * 밤 구간(18시~06시)만 골라 날짜별로 묶는다. 캠핑은 밤에 자는 것이라
 * 그날의 최저기온과 그 시간대의 비·바람이 실제로 중요한 값이다.
 *
 * 자정을 넘긴 새벽은 전날 밤에 속하므로 12시간을 빼서 날짜를 정한다.
 */
export async function fetchNightlyOutlook({ lat, lon }) {
  const { data } = await owm.get('/forecast', { params: { lat, lon } })

  const nights = new Map()

  for (const item of data.list) {
    const at = new Date(item.dt * 1000)
    const hour = at.getHours()
    if (hour > 6 && hour < 18) continue // 낮은 건너뛴다

    const nightAt = new Date(at.getTime() - 12 * 60 * 60 * 1000)
    const key = nightAt.toDateString()

    const slot = nights.get(key) ?? {
      key,
      date: nightAt,
      temps: [],
      rainProbs: [],
      winds: [],
      clouds: [],
    }
    slot.temps.push(item.main.temp)
    slot.rainProbs.push((item.pop ?? 0) * 100)
    slot.winds.push(item.wind.gust ?? item.wind.speed)
    slot.clouds.push(item.clouds.all)
    nights.set(key, slot)
  }

  const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

  return [...nights.values()]
    .filter((night) => night.temps.length >= 2) // 구간이 하나뿐인 날은 버린다
    .map((night) => ({
      key: night.key,
      label: `${night.date.getMonth() + 1}/${night.date.getDate()}`,
      weekday: WEEKDAY[night.date.getDay()],
      nightLow: Math.round(Math.min(...night.temps) * 10) / 10,
      rainProb: Math.round(Math.max(...night.rainProbs)),
      wind: Math.round(Math.max(...night.winds) * 10) / 10,
      clouds: Math.round(night.clouds.reduce((a, b) => a + b, 0) / night.clouds.length),
    }))
}

/**
 * 지역 이름으로 좌표 찾기 (Geocoding).
 * 목록에 없는 지역을 검색했을 때 여기서 찾아 추가한다. 한글 이름도 받는다.
 */
const geo = axios.create({
  baseURL: '/api/owm/geo/1.0',
  timeout: 8000,
})

attachRetry(geo, '지역 검색')

export async function searchPlaces(query, limit = 5) {
  const { data } = await geo.get('/direct', { params: { q: query, limit } })
  return data
    .filter((place) => place.country === 'KR')
    .map((place) => ({
      name: place.local_names?.ko ?? place.name,
      englishName: place.name,
      region: place.state ?? '검색으로 추가',
      lat: Math.round(place.lat * 10000) / 10000,
      lon: Math.round(place.lon * 10000) / 10000,
    }))
}

// 날씨 아이콘 이미지 주소
export function iconUrl(icon, size = 2) {
  return icon ? `https://openweathermap.org/img/wn/${icon}@${size}x.png` : ''
}
