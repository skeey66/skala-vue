// 과제 5: 기본 3개 도시(서울/수원/부산)에 본인 데이터를 추가한 목업 데이터.
// - 도시 7곳 추가 (제주 ~ 울릉도)
// - 필드 추가: feelsLike(체감온도) / humidity(습도) / wind(풍속) / rainProb(강수확률) / dust(미세먼지) / updatedAt(기준시각)
// 강의자료처럼 한 줄에 한 도시씩 쓰기 위해 prettier 줄바꿈을 끈다. (printWidth: 100)
// prettier-ignore
export const WEATHER_LIST = [
  { id: 'city_01', name: '서울',   status: '맑음',   temp: 28, feelsLike: 31, humidity: 45, wind: 2.1, rainProb: 10, dust: '보통',     updatedAt: '21:00' },
  { id: 'city_02', name: '수원',   status: '비',     temp: 24, feelsLike: 26, humidity: 82, wind: 3.4, rainProb: 80, dust: '좋음',     updatedAt: '21:00' },
  { id: 'city_03', name: '부산',   status: '구름',   temp: 26, feelsLike: 29, humidity: 61, wind: 4.8, rainProb: 30, dust: '보통',     updatedAt: '20:50' },
  { id: 'city_04', name: '제주',   status: '흐림',   temp: 29, feelsLike: 33, humidity: 74, wind: 6.2, rainProb: 40, dust: '좋음',     updatedAt: '20:55' },
  { id: 'city_05', name: '강릉',   status: '맑음',   temp: 22, feelsLike: 22, humidity: 38, wind: 1.6, rainProb:  0, dust: '좋음',     updatedAt: '21:05' },
  { id: 'city_06', name: '대관령', status: '눈',     temp: -2, feelsLike: -7, humidity: 88, wind: 7.5, rainProb: 90, dust: '매우좋음', updatedAt: '21:05' },
  { id: 'city_07', name: '인천',   status: '소나기', temp: 25, feelsLike: 27, humidity: 70, wind: 5.1, rainProb: 60, dust: '나쁨',     updatedAt: '21:00' },
  { id: 'city_08', name: '대구',   status: '맑음',   temp: 31, feelsLike: 35, humidity: 33, wind: 1.2, rainProb:  0, dust: '나쁨',     updatedAt: '20:45' },
  { id: 'city_09', name: '광주',   status: '구름',   temp: 27, feelsLike: 30, humidity: 58, wind: 2.7, rainProb: 20, dust: '보통',     updatedAt: '20:45' },
  { id: 'city_10', name: '울릉도', status: '안개',   temp: 19, feelsLike: 19, humidity: 91, wind: 8.3, rainProb: 50, dust: '매우좋음', updatedAt: '21:10' },
]

// 상태 문자열 → 이모지. 없는 상태는 기본값으로 떨어진다.
// prettier-ignore
export const STATUS_ICON = {
  맑음: '☀️', 비: '🌧️', 구름: '⛅', 흐림: '☁️', 눈: '❄️', 소나기: '🌦️', 안개: '🌁',
}

// 조건부 렌더링(과제 2)의 기준 온도
export const HOT_THRESHOLD = 25

// 강수확률이 이 값 이상이면 우산 안내를 띄운다.
export const RAIN_THRESHOLD = 60
