<script setup>
/**
 * 앱 껍데기.
 *
 * 표지에서는 화면에 배경과 소개만 남긴다. 내비게이션도 단위 토글도 없다.
 * 아래로 내리면 그때 내비게이션 바가 떠서 다른 화면으로 갈 수 있다.
 * (표지에서는 온도 단위를 쓸 일이 없으므로 토글은 계속 감춘다)
 *
 * 다른 화면에서는 처음부터 내비게이션과 단위 토글이 함께 있다.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { NConfigProvider, NMessageProvider, NBackTop, darkTheme } from 'naive-ui'
import { campTheme } from '@/theme'
import CampBackdrop from '@/components/CampBackdrop.vue'
import UnitToggler from '@/components/UnitToggler.vue'
import { useFavoriteStore } from '@/stores/favoriteStore'

const route = useRoute()
const favoriteStore = useFavoriteStore()

/*
 * 내비게이션.
 *
 * 화면 이름이 아니라 할 일로 짓는다. 캠핑장을 찾는 게 이 서비스의 본론이라 앞에 둔다.
 * 소개는 내비가 아니라 푸터에 있을 내용이다.
 *
 * children 이 있는 항목은 마우스를 올리거나 키보드로 focus 하면 아래로 펼쳐진다.
 * 하위 항목은 주소에 상태를 붙여 그 모습으로 바로 열리게 한다.
 */
const TABS = [
  {
    to: '/',
    tab: 'home',
    label: '홈',
    d: 'M9.5 2.5 C12 6.5 14 8 14 11 A4.5 4.5 0 0 1 5 11 C5 8 7 6.5 9.5 2.5 Z',
  },
  {
    to: '/camps',
    tab: 'camps',
    label: '캠핑장',
    d: 'M9.5 3 L16.5 15 H2.5 Z M9.5 3 V15',
    children: [
      { to: '/camps', label: '캠핑장 찾기', note: '전국 3천여 곳에서', lead: true },
      { to: '/camps/today', label: '오늘의 추천', note: '오늘 날씨에 맞는 자리' },
      { to: '/camps?type=글램핑', label: '글램핑', note: '몸만 가도 됩니다' },
      { to: '/camps?type=카라반', label: '카라반', note: '집을 통째로 빌립니다' },
      { to: '/camps?type=자동차야영장', label: '오토캠핑', note: '차를 옆에 대고' },
      { to: '/camps?type=일반야영장', label: '일반야영장', note: '장비를 챙겨 갑니다' },
    ],
  },
  {
    to: '/regions',
    tab: 'regions',
    label: '날씨',
    d: 'M2 14 L6.5 5 L11 11 L13.5 7.5 L17 14 Z',
    children: [
      {
        to: '/regions?view=rank',
        label: '오늘의 모닥불 지수',
        note: '어디가 좋은지 순서대로',
        lead: true,
      },
      { to: '/regions?view=week', label: '이번 주', note: '닷새 치 지수를 한눈에' },
      { to: '/regions?view=map', label: '지도', note: '한반도 위에 지역별로' },
    ],
  },
  {
    to: '/community/sherpa',
    tab: 'community',
    label: '커뮤니티',
    d: 'M2.5 4 H16.5 V12 H9 L5.5 15.5 V12 H2.5 Z',
    children: [
      {
        to: '/community/sherpa',
        label: '셰르파',
        note: '처음이라면 먼저 다녀온 사람과',
        lead: true,
      },
      { to: '/community/market', label: '중고거래', note: '쓰던 장비를 다음 사람에게' },
    ],
  },
  {
    to: '/favorites',
    tab: 'favorites',
    label: '찜',
    d: 'M9.5 3 L11.5 7.2 L16 7.8 L12.8 11 L13.6 15.5 L9.5 13.4 L5.4 15.5 L6.2 11 L3 7.8 L7.5 7.2 Z',
  },
]

/*
 * 열려 있는 드롭다운. 마우스를 떼자마자 닫으면 대각선으로 내려가는 동안 사라진다.
 * 짧게 미뤘다 닫아서 그 사이에 다시 들어오면 유지되게 한다.
 */
const openTab = ref('')
let closeTimer = 0

function openMenu(tab) {
  clearTimeout(closeTimer)
  openTab.value = tab
}

function closeMenu(delay = 160) {
  clearTimeout(closeTimer)
  closeTimer = window.setTimeout(() => {
    openTab.value = ''
  }, delay)
}

// 하위 항목을 고르면 바로 닫는다
function pickChild() {
  clearTimeout(closeTimer)
  openTab.value = ''
}

const activeTab = computed(() => route.meta.tab ?? '')
const isLanding = computed(() => route.name === 'home')

// 표지를 얼마나 내렸는지
const scrolled = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > window.innerHeight * 0.42
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

// 표지 맨 위에서는 껍데기를 통째로 감춘다
const showChrome = computed(() => !isLanding.value || scrolled.value)
// 콘텐츠가 바 아래로 지나갈 때만 그늘을 켠다
const shaded = computed(() => scrolled.value || !isLanding.value)
// 단위 토글은 표지에서 아예 쓰지 않는다
const showUnit = computed(() => !isLanding.value)
</script>

<template>
  <NConfigProvider :theme="darkTheme" :theme-overrides="campTheme">
    <NMessageProvider :max="2" placement="top">
      <!-- 화면 전체에 깔리는 모닥불 배경 -->
      <!-- 배너가 있는 화면은 배경을 한 단계 밝게 (표지는 그대로) -->
      <CampBackdrop :class="{ 'backdrop--bright': !isLanding }" />
      <div class="scrim" :class="{ 'scrim--deep': !isLanding }"></div>

      <!-- 내비게이션. 표지에서는 내려야 떠오른다. -->
      <header class="bar" :class="{ 'bar--hidden': !showChrome, 'bar--shaded': shaded }">
        <div class="bar__inner">
          <RouterLink to="/" class="brand" :class="{ 'brand--mark-only': isLanding }">
            <span class="brand__mark" aria-hidden="true">
              <svg viewBox="0 0 20 22" width="20" height="22">
                <path
                  d="M10 1.5 C13.4 6.2 16.5 8.4 16.5 12.6 A6.5 6.5 0 0 1 3.5 12.6 C3.5 8.4 6.6 6.2 10 1.5 Z"
                  fill="currentColor"
                  opacity="0.42"
                />
                <path
                  d="M10 8.4 C11.7 10.8 13 11.9 13 14 A3 3 0 0 1 7 14 C7 11.9 8.3 10.8 10 8.4 Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span class="brand__text">
              <span class="brand__name">모닥불</span>
              <span class="brand__sub">오늘, 어디로 캠핑 갈까요</span>
            </span>
          </RouterLink>

          <nav class="tabs" @keyup.esc="pickChild">
            <div
              v-for="item in TABS"
              :key="item.tab"
              class="tabs__slot"
              @mouseenter="item.children && openMenu(item.tab)"
              @mouseleave="item.children && closeMenu()"
            >
              <RouterLink
                :to="item.to"
                class="tabs__item"
                :class="{ 'tabs__item--on': activeTab === item.tab }"
                :aria-haspopup="item.children ? 'true' : undefined"
                :aria-expanded="item.children ? String(openTab === item.tab) : undefined"
                @focus="item.children && openMenu(item.tab)"
              >
                {{ item.label }}
                <span
                  v-if="item.tab === 'favorites' && favoriteStore.count"
                  class="num tabs__count"
                >
                  {{ favoriteStore.count }}
                </span>
                <span v-if="item.children" class="tabs__caret" aria-hidden="true"></span>
              </RouterLink>

              <!-- 하위 메뉴. 주소에 상태를 붙여 그 모습으로 바로 열린다. -->
              <div
                v-if="item.children"
                class="menu"
                :class="{ 'menu--open': openTab === item.tab }"
                @mouseenter="openMenu(item.tab)"
                @mouseleave="closeMenu()"
              >
                <RouterLink
                  v-for="child in item.children"
                  :key="child.to"
                  :to="child.to"
                  class="menu__item"
                  :class="{ 'menu__item--lead': child.lead }"
                  :tabindex="openTab === item.tab ? 0 : -1"
                  @click="pickChild"
                  @blur="closeMenu(80)"
                  @focus="openMenu(item.tab)"
                >
                  <b class="menu__label">{{ child.label }}</b>
                  <span class="menu__note">{{ child.note }}</span>
                </RouterLink>
              </div>
            </div>
          </nav>

          <div class="bar__right">
            <UnitToggler v-if="showUnit" />
          </div>
        </div>
      </header>

      <main class="page" :class="{ 'page--landing': isLanding }">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>

      <!-- 좁은 화면: 하단 바 -->
      <nav class="dock" :class="{ 'dock--hidden': !showChrome }">
        <RouterLink
          v-for="item in TABS"
          :key="item.tab"
          :to="item.to"
          class="dock__item"
          :class="{ 'dock__item--on': activeTab === item.tab }"
        >
          <span class="dock__icon" aria-hidden="true">
            <svg viewBox="0 0 19 18" width="20" height="19">
              <path
                :d="item.d"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
            </svg>
            <span v-if="item.tab === 'favorites' && favoriteStore.count" class="dock__dot"></span>
          </span>
          <span class="dock__label">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- 푸터. 소개와 출처는 내비가 아니라 여기 있을 내용이다. -->
      <footer v-if="!isLanding" class="foot">
        <div class="foot__inner">
          <p class="foot__name">모닥불</p>
          <nav class="foot__links">
            <RouterLink to="/about">서비스 소개</RouterLink>
            <RouterLink to="/about">모닥불 지수</RouterLink>
            <RouterLink to="/about">데이터 출처</RouterLink>
          </nav>
          <p class="foot__note">
            기상 관측값은 OpenWeatherMap · Open-Meteo, 야영장 정보는 한국관광공사 고캠핑에서
            받아옵니다.
          </p>
        </div>
      </footer>

      <NBackTop :right="24" :bottom="90" />
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(var(--camp-shade-rgb), 0.14) 0%,
    transparent 40%,
    rgba(var(--camp-shade-rgb), 0.16) 100%
  );
  opacity: 0;
  animation: scrim-in 1.6s ease 1.1s forwards;
}

.scrim--deep {
  background: linear-gradient(
    180deg,
    rgba(var(--camp-shade-rgb), 0.52) 0%,
    rgba(var(--camp-shade-rgb), 0.72) 45%
  );
}

@keyframes scrim-in {
  to {
    opacity: 1;
  }
}

/* ── 상단 바 ─────────────────────────────────── */
.bar {
  position: sticky;
  top: 0;
  z-index: 10;
  transition:
    opacity 0.45s ease,
    transform 0.45s ease;
}

/* 판을 깔지 않는다. 위에서 아래로 사라지는 그늘만 둬서
   글자는 읽히고 배경은 그대로 보이게 한다. */
.bar::before {
  content: '';
  position: absolute;
  inset: -1px 0 auto 0;
  height: 190%;
  background: linear-gradient(
    180deg,
    rgba(var(--camp-shade-rgb), 0.62) 0%,
    rgba(var(--camp-shade-rgb), 0.34) 42%,
    transparent 100%
  );
  opacity: 0;
  transition: opacity var(--dur-3) ease;
  pointer-events: none;
}

.bar--shaded::before {
  opacity: 1;
}

.bar--hidden {
  opacity: 0;
  transform: translateY(-14px);
  pointer-events: none;
}

.bar__inner {
  position: relative;
  padding: var(--sp-5) var(--sp-6) var(--sp-5);
  display: flex;
  align-items: center;
  gap: var(--sp-6);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-shrink: 0;
  margin-right: auto;
}

.brand__mark {
  color: var(--camp-ember);
  display: flex;
}

.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}

/* 표지에서는 이름을 표지가 대신 말한다 */
.brand--mark-only .brand__text {
  opacity: 0;
  transform: translateX(-6px);
  pointer-events: none;
}

.brand__name {
  font-size: var(--fs-lead);
  font-weight: 800;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 12px rgba(var(--camp-shade-rgb), 0.8);
}

.brand__sub {
  font-size: var(--fs-micro);
  color: var(--camp-muted);
  white-space: nowrap;
  text-shadow: 0 1px 12px rgba(var(--camp-shade-rgb), 0.8);
}

/* 메뉴는 가운데 */
.tabs {
  display: flex;
  gap: var(--sp-6);
}

/* 항목과 하위 메뉴를 함께 담는 자리. 마우스가 이 안에 있는 동안 메뉴가 열려 있다. */
.tabs__slot {
  position: relative;
}

.tabs__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-1) 0;
  font-size: var(--fs-meta);
  font-weight: 600;
  color: rgba(var(--camp-ink-rgb), 0.55);
  text-shadow: 0 1px 12px rgba(var(--camp-shade-rgb), 0.85);
  transition: color var(--dur-1);
}

.tabs__item:hover {
  color: rgba(var(--camp-ink-rgb), 0.85);
}

.tabs__item--on {
  color: var(--camp-text);
}

/* 밑줄 대신 작은 점 하나. 가로줄이 사진을 자르지 않는다. */
.tabs__item--on::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -0.42rem;
  width: 3px;
  height: 3px;
  margin-left: -1.5px;
  border-radius: 50%;
  background: var(--camp-ember);
}

.bar__right {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  min-width: 4.4rem;
}

.tabs__count {
  padding: var(--sp-0) var(--sp-1);
  border-radius: 999px;
  background: var(--camp-surface-2);
  color: var(--camp-star);
  font-size: var(--fs-micro);
}

/* 하위 메뉴가 있다는 표시. 글자를 밀지 않게 작게 둔다. */
.tabs__caret {
  width: 0;
  height: 0;
  margin-left: var(--sp-0);
  border-left: 3px solid transparent;
  border-right: 3px solid transparent;
  border-top: 3.5px solid currentColor;
  opacity: 0.5;
  transition: transform var(--dur-1) ease;
}

.tabs__slot:hover .tabs__caret {
  transform: rotate(180deg);
  opacity: 0.9;
}

/* ── 하위 메뉴 ───────────────────────────────── */
.menu {
  position: absolute;
  top: 100%;
  left: 50%;
  z-index: 20;
  min-width: 12.5rem;
  padding: var(--sp-2);
  margin-top: var(--sp-3);
  transform: translateX(-50%) translateY(-6px);
  border: 1px solid var(--camp-line-soft);
  background: color-mix(in srgb, var(--camp-surface) 94%, transparent);
  backdrop-filter: blur(14px);
  box-shadow: 0 18px 40px rgba(var(--camp-shade-rgb), 0.55);
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.16s ease,
    transform 0.16s ease,
    visibility 0.16s;
}

/* 항목과 메뉴 사이의 빈 틈. 대각선으로 내려가는 동안 마우스가 빠지지 않게 덮는다. */
.menu::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -0.75rem;
  height: 0.75rem;
}

.menu--open {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

.menu__item {
  display: block;
  padding: var(--sp-2) var(--sp-3);
  color: var(--camp-muted);
  transition:
    background 0.14s,
    color 0.14s;
}

/* 그 절의 본론. 나머지는 그 안의 갈래다. */
.menu__item--lead {
  color: var(--camp-text);
  border-bottom: 1px solid var(--camp-line-soft);
  margin-bottom: var(--sp-1);
  padding-bottom: var(--sp-2);
}

.menu__item:hover,
.menu__item:focus-visible {
  background: var(--camp-surface-2);
  color: var(--camp-text);
}

.menu__label {
  display: block;
  font-size: var(--fs-meta);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.menu__note {
  display: block;
  margin-top: var(--sp-0);
  font-size: var(--fs-micro);
  color: var(--camp-faint);
}

/* ── 본문 ────────────────────────────────────── */
.page {
  position: relative;
  z-index: 1;
  /* 웹에서 보는 화면이다. 가운데 좁게 쓰지 않는다.
     대신 글줄이 길어지는 곳은 --measure 로 따로 좁힌다. */
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--sp-2) var(--sp-6) var(--sp-8);
}

/*
 * 홈은 절마다 화면을 꽉 채우는 씬이라 폭 제한을 푼다.
 * 씬 바탕이 1440px 에서 끊기면 좌우로 앞 절이 비쳐 덮는 느낌이 안 난다.
 * 가운데 정렬은 각 절이 알아서 한다.
 */
.page--landing {
  max-width: none;
  padding: 0;
}

.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.page-leave-to {
  opacity: 0;
}

/* ── 푸터 ────────────────────────────────────── */
.foot {
  position: relative;
  z-index: 1;
  margin-top: var(--sp-7);
  border-top: 1px solid var(--camp-line-soft);
  background: rgba(var(--camp-shade-rgb), 0.55);
}

.foot__inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--sp-6) var(--sp-6) var(--sp-7);
}

.foot__name {
  font-size: var(--fs-body);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.foot__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-4);
  margin-top: var(--sp-3);
  font-size: var(--fs-small);
  color: var(--camp-muted);
}

.foot__links a:hover {
  color: var(--camp-text);
  text-decoration: underline;
}

.foot__note {
  max-width: var(--measure);
  margin-top: var(--sp-4);
  font-size: var(--fs-small);
  line-height: 1.7;
  color: var(--camp-faint);
}

/* ── 하단 바 (좁은 화면) ─────────────────────── */
.dock {
  display: none;
}

@media (max-width: 620px) {
  .bar__inner {
    gap: var(--sp-4);
    padding: var(--sp-4) var(--sp-4) var(--sp-4);
  }

  .brand__sub {
    display: none;
  }

  .tabs {
    display: none;
  }

  .page {
    padding: var(--sp-1) var(--sp-4) calc(var(--sp-8) + env(safe-area-inset-bottom));
  }

  .foot__inner {
    padding: var(--sp-5) var(--sp-4) calc(var(--sp-8) + env(safe-area-inset-bottom));
  }

  .dock {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: flex;
    justify-content: space-around;
    padding: var(--sp-2) var(--sp-1) calc(var(--sp-2) + env(safe-area-inset-bottom));
    border-top: 1px solid var(--camp-line-soft);
    background: color-mix(in srgb, var(--camp-bg) 92%, transparent);
    backdrop-filter: blur(12px);
    transition:
      opacity 0.4s ease,
      transform 0.4s ease;
  }

  .dock--hidden {
    opacity: 0;
    transform: translateY(100%);
    pointer-events: none;
  }

  .dock__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-0);
    flex: 1;
    padding: var(--sp-1) 0;
    color: var(--camp-faint);
  }

  .dock__item--on {
    color: var(--camp-ember);
  }

  .dock__icon {
    position: relative;
    display: flex;
  }

  .dock__dot {
    position: absolute;
    top: -1px;
    right: -3px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--camp-star);
  }

  .dock__label {
    font-size: var(--fs-micro);
    font-weight: 600;
  }
}
</style>
