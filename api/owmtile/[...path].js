import { proxy } from '../_proxy.js'

// 지도 위에 얹는 강수 / 구름 / 바람 타일. 이미지도 키가 필요해서 함께 가린다.
export default function handler(req, res) {
  return proxy(req, res, {
    base: 'https://tile.openweathermap.org/map',
    keyName: 'appid',
    keyValue: process.env.OPENWEATHER_API_KEY,
    what: '날씨 타일',
  })
}
