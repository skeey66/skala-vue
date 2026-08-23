import { proxy } from '../_proxy.js'

// /api/owm/data/2.5/weather → api.openweathermap.org/data/2.5/weather
// /api/owm/geo/1.0/direct   → api.openweathermap.org/geo/1.0/direct
export default function handler(req, res) {
  return proxy(req, res, {
    base: 'https://api.openweathermap.org',
    keyName: 'appid',
    keyValue: process.env.OPENWEATHER_API_KEY,
    what: '날씨',
  })
}
