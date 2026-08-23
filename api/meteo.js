import { proxy } from './_proxy.js'

// Open-Meteo 는 키가 필요 없지만, 브라우저가 외부 도메인을 직접 물면
// 그 도메인이 막힌 망에서 모닥불 지수가 통째로 안 나온다. 그래서 여기를 지난다.
export default function handler(req, res) {
  return proxy(req, res, {
    base: 'https://api.open-meteo.com/v1',
    what: '예보',
  })
}
