import { proxy } from './_proxy.js'

// 공공데이터포털은 CORS 헤더를 주지 않아 브라우저에서 직접 못 부른다.
// 키를 감추는 것과 CORS 우회를 이 함수가 함께 해결한다.
export default function handler(req, res) {
  return proxy(req, res, {
    base: 'https://apis.data.go.kr/B551011/GoCamping',
    keyName: 'serviceKey',
    keyValue: process.env.GOCAMPING_API_KEY,
    what: '야영장',
  })
}
