import axios from 'axios'
import { attachRetry } from './retry'

/**
 * Open-Meteo. 키가 필요 없는 무료 날씨 API.
 *
 * OpenWeatherMap 무료 플랜에 없는 값을 메운다.
 *   uv_index_max          자외선 (One Call 3.0 은 유료라 무료로는 못 받는다)
 *   temperature_2m_min    밤 최저기온 (캠핑은 밤이 기준)
 *   elevation             고도 (고지대는 밤에 더 춥다)
 *
 * 좌표를 콤마로 이어 붙이면 여러 지점을 한 번에 받는다.
 * 도시 10곳을 1콜로 끝낼 수 있어 호출 수를 크게 줄인다. 키도 필요 없다.
 */
const openMeteo = axios.create({
  baseURL: 'https://api.open-meteo.com/v1',
  timeout: 8000,
})

attachRetry(openMeteo, '예보')

const DAILY_FIELDS = [
  'temperature_2m_min',
  'temperature_2m_max',
  'uv_index_max',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'daylight_duration',
].join(',')

export async function fetchDailyOutlook(cities) {
  const { data } = await openMeteo.get('/forecast', {
    params: {
      latitude: cities.map((c) => c.lat).join(','),
      longitude: cities.map((c) => c.lon).join(','),
      daily: DAILY_FIELDS,
      timezone: 'Asia/Seoul',
      // 기본값은 km/h 다. 모닥불 지수의 바람 기준이 m/s 라 단위를 맞춰서 받는다.
      wind_speed_unit: 'ms',
      forecast_days: 1,
    },
  })

  // 지점이 하나면 객체, 여럿이면 배열로 온다.
  const list = Array.isArray(data) ? data : [data]

  return list.map((entry, index) => ({
    cityId: cities[index].id,
    elevation: Math.round(entry.elevation),
    nightLow: entry.daily.temperature_2m_min[0],
    dayHigh: entry.daily.temperature_2m_max[0],
    uvIndex: entry.daily.uv_index_max[0],
    rainProb: entry.daily.precipitation_probability_max[0] ?? 0,
    windMax: entry.daily.wind_speed_10m_max[0],
    daylightHours: Math.round((entry.daily.daylight_duration[0] / 3600) * 10) / 10,
  }))
}

/**
 * 시군구처럼 여러 지점을 한 번에 조회한다.
 *
 * 시도 하나를 열면 그 아래 시군구가 10~30곳이다. OpenWeatherMap 은 지점마다
 * 한 번씩 불러야 하지만 Open-Meteo 는 좌표를 이어 붙여 1콜로 끝난다.
 * 그래서 시군구 단계는 이쪽만 쓴다.
 */
export async function fetchSpotOutlook(spots) {
  if (!spots.length) return []

  const { data } = await openMeteo.get('/forecast', {
    params: {
      latitude: spots.map((s) => s.lat).join(','),
      longitude: spots.map((s) => s.lon).join(','),
      current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,cloud_cover',
      daily: 'temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
      timezone: 'Asia/Seoul',
      // 기본값은 km/h 다. 모닥불 지수의 바람 기준이 m/s 라 단위를 맞춰서 받는다.
      wind_speed_unit: 'ms',
      forecast_days: 1,
    },
  })

  const list = Array.isArray(data) ? data : [data]
  return list.map((entry, index) => ({
    ...spots[index],
    elevation: Math.round(entry.elevation),
    temp: Math.round(entry.current.temperature_2m * 10) / 10,
    humidity: entry.current.relative_humidity_2m,
    wind: Math.round(entry.current.wind_speed_10m * 10) / 10,
    gust: Math.round((entry.current.wind_gusts_10m ?? 0) * 10) / 10,
    clouds: entry.current.cloud_cover,
    nightLow: entry.daily.temperature_2m_min[0],
    rainProb: entry.daily.precipitation_probability_max[0] ?? 0,
    // 시군구 단계에서는 대기오염을 따로 부르지 않는다. 시도 값을 물려받는다.
    pm10: null,
  }))
}

/**
 * 이번 주 밤 예보. 지역 여러 곳을 한 번에 받는다.
 *
 * 캠핑은 낮이 아니라 밤을 넘기는 일이라 하루 단위 예보로는 부족하다.
 * 시간별 값을 받아 저녁 18시부터 다음 날 새벽 6시까지를 '그날 밤' 으로 접는다.
 * 새벽 시간은 하루가 넘어가 있으므로 12시간을 빼서 전날 밤으로 보낸다.
 *
 * 17개 지역 × 6일이 1콜이다. 좌표를 콤마로 이어 붙이면 되고 키도 필요 없다.
 */
const HOURLY_FIELDS = [
  'temperature_2m',
  'precipitation_probability',
  'wind_gusts_10m',
  'cloud_cover',
].join(',')

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

/*
 * 날짜 하나를 'YYYY-MM-DD' 로. toISOString 은 UTC 로 바꿔 버려서 쓰면 안 된다.
 * 한국 시간 저녁 18시에서 12시간을 빼면 같은 날 06시인데, UTC 로 옮기면 전날 21시가 된다.
 * 그러면 오늘 밤의 앞부분(18~23시)이 어젯밤 칸으로 들어간다.
 */
function localKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

export async function fetchWeeklyNights(cities, { days = 6 } = {}) {
  const { data } = await openMeteo.get('/forecast', {
    params: {
      latitude: cities.map((c) => c.lat).join(','),
      longitude: cities.map((c) => c.lon).join(','),
      hourly: HOURLY_FIELDS,
      timezone: 'Asia/Seoul',
      // 기본값은 km/h 다. 모닥불 지수의 바람 기준이 m/s 라 단위를 맞춰서 받는다.
      wind_speed_unit: 'ms',
      forecast_days: days,
    },
  })

  const list = Array.isArray(data) ? data : [data]

  return list.map((entry, index) => {
    const hourly = entry.hourly
    const nights = new Map()

    hourly.time.forEach((stamp, i) => {
      // "2026-08-22T21:00" — 지역 시각이라 그대로 읽는다
      const at = new Date(stamp)
      const hour = at.getHours()
      if (hour > 6 && hour < 18) return // 낮은 건너뛴다

      // 새벽은 전날 밤에 속한다
      const nightAt = new Date(at.getTime() - 12 * 60 * 60 * 1000)
      const key = localKey(nightAt)

      const slot = nights.get(key) ?? {
        key,
        // 칸 이름은 그 밤이 시작하는 날짜다. 새벽 시간이 먼저 들어와도 흔들리지 않게
        // 첫 값이 아니라 key 에서 되돌린다.
        date: new Date(`${key}T20:00`),
        temps: [],
        rains: [],
        winds: [],
        clouds: [],
      }
      slot.temps.push(hourly.temperature_2m[i])
      slot.rains.push(hourly.precipitation_probability[i] ?? 0)
      slot.winds.push(hourly.wind_gusts_10m[i] ?? 0)
      slot.clouds.push(hourly.cloud_cover[i] ?? 0)
      nights.set(key, slot)
    })

    const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length

    return {
      cityId: cities[index].id,
      nights: [...nights.values()]
        // 앞뒤로 잘린 밤은 버린다. 반쪽짜리 밤은 최저기온이 실제보다 높게 나온다.
        .filter((night) => night.temps.length >= 8)
        .map((night) => ({
          key: night.key,
          label: `${night.date.getMonth() + 1}/${night.date.getDate()}`,
          weekday: WEEKDAY[night.date.getDay()],
          nightLow: Math.round(Math.min(...night.temps) * 10) / 10,
          // 비는 한 번이라도 오면 밤을 망친다. 최대로 본다.
          rainProb: Math.round(Math.max(...night.rains)),
          // 바람도 순간 최대(돌풍) 기준
          wind: Math.round(Math.max(...night.winds) * 10) / 10,
          clouds: Math.round(avg(night.clouds)),
        })),
    }
  })
}
