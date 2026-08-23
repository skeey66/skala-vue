import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // 공공데이터포털(고캠핑)은 CORS 헤더를 주지 않아 브라우저에서 직접 못 부른다.
      // 개발 서버가 대신 호출하도록 프록시를 둔다.
      '/api/gocamping': {
        target: 'https://apis.data.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gocamping/, '/B551011/GoCamping'),
      },
    },
  },
})
