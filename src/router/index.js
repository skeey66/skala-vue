import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

/**
 * 라우트 정의 + 지연 로딩(Lazy Loading) + Catch-all
 *
 * 첫 화면만 정적으로 import 하고 나머지는 () => import(...) 로 감싼다.
 * 빌드하면 화면마다 별도 청크로 쪼개진다.
 *
 * meta.tab 은 내비게이션 바에서 어느 항목을 켤지 정하는 값이다.
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { tab: 'home', title: '모닥불' },
    },
    {
      path: '/regions',
      name: 'regions',
      component: () => import('../views/RegionsView.vue'),
      meta: { tab: 'regions', title: '날씨' },
    },
    {
      path: '/camps',
      name: 'camps',
      component: () => import('../views/CampStylesView.vue'),
      meta: { tab: 'camps', title: '캠핑장' },
    },
    {
      path: '/camps/today',
      name: 'camps-today',
      component: () => import('../views/TodayCampsView.vue'),
      meta: { tab: 'camps', title: '오늘의 추천' },
    },
    {
      // 순위는 날씨 화면의 보기 모드로 들어갔다.
      // 예전 주소로 들어와도 끊기지 않게 그 모드로 넘겨준다.
      path: '/ranking',
      redirect: { name: 'regions', query: { view: 'rank' } },
    },
    {
      // 커뮤니티. 두 서비스 모두 서버가 있어야 하는 기능이라 목업 데이터로 화면만 만들었다.
      path: '/community',
      redirect: { name: 'sherpa' },
    },
    {
      path: '/community/sherpa',
      name: 'sherpa',
      component: () => import('../views/SherpaView.vue'),
      meta: { tab: 'community', title: '셰르파' },
    },
    {
      path: '/community/market',
      name: 'market',
      component: () => import('../views/MarketView.vue'),
      meta: { tab: 'community', title: '중고거래' },
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: () => import('../views/FavoritesView.vue'),
      meta: { tab: 'favorites', title: '찜' },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
      meta: { tab: 'about', title: '소개' },
    },
    {
      // 동적 경로 매칭: /weather/city_01 → props 로 cityId 전달
      path: '/weather/:cityId',
      name: 'region-detail',
      component: () => import('../views/RegionDetailView.vue'),
      props: true,
      meta: { tab: 'regions', title: '상세' },
    },
    {
      // Catch-all: 위 규칙에 걸리지 않은 모든 경로
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
      meta: { tab: '', title: '없는 페이지' },
    },
  ],
})

export default router
