import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

/*
 * 인증키는 브라우저로 내려보내지 않는다.
 *
 * VITE_ 접두사가 붙은 값은 빌드할 때 번들 안에 그대로 박혀서 개발자 도구로 보인다.
 * 저장소가 공개라 더더욱 그러면 안 된다. 그래서 키는 접두사 없이 두고,
 * 개발 중에는 아래 프록시가, 배포된 뒤에는 api/ 의 서버리스 함수가 대신 붙인다.
 * 브라우저는 /api/... 라는 같은 출처 주소만 안다.
 */
function withKey(prefix, name, value) {
  return (path) => {
    const stripped = path.replace(prefix, '')
    const join = stripped.includes('?') ? '&' : '?'
    // 고캠핑 Decoding 키에는 + 와 = 가 들어 있어 그대로 붙이면 깨진다
    return `${stripped}${join}${name}=${encodeURIComponent(value)}`
  }
}

export default defineConfig(({ mode }) => {
  // 세 번째 인자가 '' 라야 VITE_ 없는 값까지 읽는다
  const env = loadEnv(mode, process.cwd(), '')
  const owm = env.OPENWEATHER_API_KEY ?? ''
  const gocamping = env.GOCAMPING_API_KEY ?? ''

  return {
    plugins: [vue(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    /*
     * 키 자체가 아니라 "키가 있는지" 만 알려준다.
     * 화면이 키 없음을 안내하려면 이 값이 필요하고, 이건 새어도 문제가 없다.
     */
    define: {
      __HAS_OWM_KEY__: JSON.stringify(Boolean(owm)),
      __HAS_GOCAMPING_KEY__: JSON.stringify(Boolean(gocamping)),
    },
    server: {
      proxy: {
        '/api/owmtile': {
          target: 'https://tile.openweathermap.org/map',
          changeOrigin: true,
          rewrite: withKey(/^\/api\/owmtile/, 'appid', owm),
        },
        '/api/owm': {
          target: 'https://api.openweathermap.org',
          changeOrigin: true,
          rewrite: withKey(/^\/api\/owm/, 'appid', owm),
        },
        // 공공데이터포털은 CORS 헤더를 주지 않아 브라우저에서 직접 못 부른다
        '/api/gocamping': {
          target: 'https://apis.data.go.kr/B551011/GoCamping',
          changeOrigin: true,
          rewrite: withKey(/^\/api\/gocamping/, 'serviceKey', gocamping),
        },
      },
    },
  }
})
