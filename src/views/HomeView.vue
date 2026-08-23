<script setup>
/**
 * 표지.
 *
 * 첫 화면은 배경과 이름만. 내려야 지수 설명이 나오고 그때 내비게이션이 떠오른다.
 * 오늘의 결과는 지역·순위 화면이 맡는다.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useWeatherStore } from '@/stores/weatherStore'

const weatherStore = useWeatherStore()

/*
 * 표지 인트로.
 *
 * 다 뜨기 전에 스크롤이 먹으면 글자가 뜨다 말고 밀려 올라간다.
 * 그래서 인트로가 끝날 때까지 스크롤을 잠가 둔다 — 랜딩이 끝나야 내려갈 수 있다.
 *
 * 잠그는 시간은 CSS 전환 시간에서 그대로 계산한다.
 * 숫자를 따로 적어 두면 한쪽만 고쳤을 때 조용히 어긋난다.
 */
const INTRO_WAIT = 1250 // 글자가 뜨기 시작할 때까지
const INTRO_LAST = 480 // 마지막 줄의 지연 (cover__body)
const INTRO_RUN = 1150 // 전환 시간 (.cover__name 등의 transition)

const entered = ref(false)
const landed = ref(false)
let enterTimer = 0
let landTimer = 0

/*
 * overflow: hidden 이면 스크롤바와 휠은 막히지만, 트랙패드 관성이나
 * 스페이스·방향키는 브라우저마다 새는 경우가 있다. 그것까지 같이 막는다.
 */
function blockScroll(event) {
  event.preventDefault()
}

const SCROLL_KEYS = new Set([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'])

function blockKeys(event) {
  if (SCROLL_KEYS.has(event.key)) event.preventDefault()
}

function lockScroll(on) {
  document.documentElement.classList.toggle('is-landing', on)
  const bind = on ? window.addEventListener : window.removeEventListener
  bind('wheel', blockScroll, { passive: false })
  bind('touchmove', blockScroll, { passive: false })
  bind('keydown', blockKeys)
}

/*
 * 표지를 얼마나 내렸는지. 0 이면 맨 위, 1 이면 한 화면의 절반 이상 내려온 상태다.
 * 이 값 하나로 표지 글자를 걷어내고 스크롤 표시를 지운다.
 * 배경 영상을 세우는 일은 CampBackdrop 이 같은 기준으로 따로 한다.
 */
const fade = ref(0)

function onScroll() {
  const h = window.innerHeight || 1
  fade.value = Math.min(1, window.scrollY / (h * 0.62))
}

// 표지 글자는 내리는 만큼 옅어지면서 살짝 위로 빠진다
const coverStyle = computed(() => ({
  opacity: 1 - fade.value,
  // 위로 빠지면서 살짝 작아진다. 뒤로 물러나는 것처럼 보인다.
  transform: `translateY(${(-fade.value * 26).toFixed(1)}px) scale(${(1 - fade.value * 0.06).toFixed(3)})`,
}))

// 스크롤 표시는 글자보다 먼저 사라진다. 이미 내리고 있는 사람에게는 필요 없다.
const cueOpacity = computed(() => Math.max(0, 1 - fade.value * 1.8))

// 설명은 화면에 들어올 때 떠오른다. 두 절이 각자 자기 차례에 뜬다.
const whatEl = ref(null)
const whatIn = ref(false)
const indexEl = ref(null)
const indexIn = ref(false)
let observer = null

onMounted(() => {
  // 다른 화면으로 넘어갔을 때 곧바로 보이도록 미리 받아둔다
  weatherStore.load()

  // 움직임을 끈 사람에게는 인트로도 잠금도 없다
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    // 움직임을 끈 사람에게는 인트로도 잠금도 컷 넘김도 없다
    entered.value = true
    landed.value = true
  } else {
    lockScroll(true)
    window.scrollTo(0, 0)
    enterTimer = window.setTimeout(() => {
      entered.value = true
    }, INTRO_WAIT)
    landTimer = window.setTimeout(
      () => {
        landed.value = true
        lockScroll(false)
        bindCut(true)
      },
      INTRO_WAIT + INTRO_LAST + INTRO_RUN,
    )
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        if (entry.target === whatEl.value) whatIn.value = true
        if (entry.target === indexEl.value) indexIn.value = true
      })
    },
    { threshold: 0.14 },
  )
  if (whatEl.value) observer.observe(whatEl.value)
  if (indexEl.value) observer.observe(indexEl.value)
})

onBeforeUnmount(() => {
  clearTimeout(enterTimer)
  clearTimeout(landTimer)
  // 화면을 벗어날 때 잠금이나 가로채기가 남으면 다른 화면이 안 내려간다
  lockScroll(false)
  bindCut(false)
  window.removeEventListener('scroll', onScroll)
  observer?.disconnect()
})

/*
 * 이 사이트가 해 주는 일 넷.
 *
 * 어디서 데이터를 받아 오는지는 여기서 말하지 않는다. 그건 소개 화면 몫이고,
 * 처음 들어온 사람에게 필요한 건 "그래서 내가 뭘 할 수 있나" 하나다.
 * 그래서 카드마다 한 문장짜리 약속과, 그 약속을 뒷받침하는 숫자 하나만 둔다.
 */
const CARDS = [
  {
    eyebrow: '야영장 찾기',
    photo: 'camps',
    title: '전국 야영장을 한자리에서',
    body: '지역·종류·시설로 걸러 보고, 마음에 드는 곳을 찾으면 예약처로 바로 넘어갑니다.',
    meta: '3,000곳 넘게',
    to: '/camps',
  },
  {
    eyebrow: '오늘의 추천',
    photo: 'today',
    title: '날씨가 캠핑 방식을 정합니다',
    body: '비가 잦으면 지붕 있는 자리, 바람이 세면 차를 벽으로, 밤이 더우면 물가로. 오늘 조건에 맞는 곳을 앞세웁니다.',
    meta: '매일 바뀜',
    to: '/camps/today',
  },
  {
    eyebrow: '이번 주',
    photo: 'week',
    title: '언제 갈지도 같이 정합니다',
    body: '지역을 고르면 닷새 치 지수를 한 줄로 봅니다. 주말 계획을 세울 때 씁니다.',
    meta: '5일 치',
    to: '/regions?view=week',
  },
  {
    eyebrow: '셰르파',
    photo: 'sherpa',
    title: '처음이면 베테랑과 함께',
    body: '캠핑을 처음 가는 사람 옆에 여러 해 다닌 캠퍼가 동행합니다. 검색으로는 안 풀리는 것들을 그 자리에서 알려 줍니다.',
    meta: '커뮤니티',
    to: '/community/sherpa',
  },
  {
    eyebrow: '중고거래',
    photo: 'market',
    title: '쓰던 장비를 다음 사람에게',
    body: '안 쓰는 캠핑 장비를 팔고, 시작하는 사람은 싸게 갖춥니다. 캠퍼끼리 직접 거래합니다.',
    meta: '커뮤니티',
    to: '/community/market',
  },
  {
    eyebrow: '지역',
    photo: 'districts',
    title: '시·군·구 단위로 봅니다',
    body: '같은 도 안에서도 밤 기온과 바람이 갈립니다. 250개 시군구를 따로 재서 보여드립니다.',
    meta: '250개 시군구',
    to: '/regions',
  },
]

/*
 * 컷 단위 스크롤.
 *
 * 절을 나눠 놓고 그냥 흘려보내면 결국 긴 문서를 훑는 것과 같다.
 * 한 번 굴리면 컷 하나가 통째로 올라오게 가로챈다 — 필름을 한 칸씩 넘기는 느낌.
 *
 * 다만 내용이 화면보다 길면(작은 노트북, 확대해서 보는 사람) 가로채는 순간
 * 아래쪽을 영영 못 본다. 그럴 때는 가로채지 않고 보통 스크롤로 둔다.
 */
const CUT_MS = 760
const COOL_MS = 300 // 트랙패드 관성이 남아 두 칸씩 넘어가는 걸 막는다

let cutting = false
let coolUntil = 0
let touchFrom = 0

function cutTops() {
  const els = [document.querySelector('.stage'), whatEl.value, indexEl.value].filter(Boolean)
  const tops = els.map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY))
  // 마지막 한 칸은 푸터까지
  tops.push(document.documentElement.scrollHeight - window.innerHeight)
  return [...new Set(tops)].sort((a, b) => a - b)
}

function fitsOneScreen() {
  return [document.querySelector('.stage'), whatEl.value, indexEl.value]
    .filter(Boolean)
    .every((el) => el.scrollHeight <= window.innerHeight + 12)
}

// 지금 어느 칸에 있는지. 가장 가까운 칸을 현재로 본다.
function currentCut(tops) {
  let best = 0
  tops.forEach((top, i) => {
    if (Math.abs(top - window.scrollY) < Math.abs(tops[best] - window.scrollY)) best = i
  })
  return best
}

function easeInOut(p) {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
}

function slideTo(to) {
  const from = window.scrollY
  if (Math.abs(to - from) < 2) return
  cutting = true
  const start = performance.now()
  const run = (now) => {
    const p = Math.min(1, (now - start) / CUT_MS)
    window.scrollTo(0, from + (to - from) * easeInOut(p))
    if (p < 1) return requestAnimationFrame(run)
    cutting = false
    coolUntil = performance.now() + COOL_MS
  }
  requestAnimationFrame(run)
}

function step(dir) {
  const tops = cutTops()
  const next = Math.min(tops.length - 1, Math.max(0, currentCut(tops) + dir))
  slideTo(tops[next])
}

function canCut() {
  return landed.value && fitsOneScreen()
}

function onWheel(event) {
  if (!canCut()) return
  event.preventDefault()
  if (cutting || performance.now() < coolUntil || Math.abs(event.deltaY) < 4) return
  step(event.deltaY > 0 ? 1 : -1)
}

function onTouchStart(event) {
  touchFrom = event.touches[0]?.clientY ?? 0
}

function onTouchMove(event) {
  if (canCut()) event.preventDefault()
}

function onTouchEnd(event) {
  if (!canCut() || cutting) return
  const moved = touchFrom - (event.changedTouches[0]?.clientY ?? touchFrom)
  if (Math.abs(moved) > 40) step(moved > 0 ? 1 : -1)
}

function onCutKey(event) {
  if (!canCut()) return
  const down = [' ', 'PageDown', 'ArrowDown'].includes(event.key)
  const up = ['PageUp', 'ArrowUp'].includes(event.key)
  if (!down && !up) return
  event.preventDefault()
  step(down ? 1 : -1)
}

function bindCut(on) {
  const bind = on ? window.addEventListener : window.removeEventListener
  bind('wheel', onWheel, { passive: false })
  bind('touchstart', onTouchStart, { passive: true })
  bind('touchmove', onTouchMove, { passive: false })
  bind('touchend', onTouchEnd, { passive: true })
  bind('keydown', onCutKey)
}

// 모닥불 지수를 이루는 다섯 가지
const FACTORS = [
  { name: '비', weight: 30, note: '불에 가장 치명적이다' },
  { name: '바람', weight: 25, note: '세면 불티가 날린다' },
  { name: '기온', weight: 25, note: '서늘해야 불이 반갑다' },
  { name: '공기', weight: 12, note: '연기에 미세먼지가 겹치면 오래 못 앉는다' },
  { name: '하늘', weight: 8, note: '구름이 걷히면 불 너머로 별이 보인다' },
]

/*
 * 배점을 색으로 옮긴다. 무게가 클수록 밝다 — 지도에서 쓰는 것과 같은 규칙이다.
 * 순위가 아니라 값으로 매기므로 같은 배점(바람 25, 기온 25)은 같은 색이 된다.
 */
const RAMP = ['#f59a4b', '#e0853b', '#c67434', '#a86633', '#8a5b33']

const weightColor = computed(() => {
  const steps = [...new Set(FACTORS.map((f) => f.weight))].sort((a, b) => b - a)
  return Object.fromEntries(steps.map((w, i) => [w, RAMP[i]]))
})

/*
 * 막대의 조각과 아래 목록의 줄은 같은 것을 가리킨다.
 * 한쪽에 올리면 다른 쪽이 같이 살아나야 둘이 한 그림이라는 게 읽힌다.
 */
const hovered = ref(null)

// 막대 하나로 읽는 사람을 위한 요약. 색만으로 읽게 두지 않는다.
const mixLabel = computed(
  () => `배점 합계 100점: ` + FACTORS.map((f) => `${f.name} ${f.weight}점`).join(', '),
)

function scrollToIndex() {
  step(1)
}
</script>

<template>
  <div class="home">
    <!--
      첫 화면. 스크롤해도 표지는 제자리에 붙어 있고, 글자만 옅어지며 물러난다.
      그동안 다음 절이 아래에서 올라와 표지를 덮는다 —
      화면이 통째로 밀려 올라가는 것보다 "랜딩이 끝나고 본문이 드러나는" 느낌이 난다.
    -->
    <div class="stage">
      <section class="cover" :class="{ 'cover--in': entered }" :style="coverStyle">
        <h2 class="cover__name" :style="{ transitionDelay: '0ms' }">모닥불</h2>

        <p class="cover__tagline" :style="{ transitionDelay: '240ms' }">오늘, 어디로 캠핑 갈까요</p>

        <p class="cover__body" :style="{ transitionDelay: '480ms' }">
          오늘 어느 지역이 캠핑하기 좋은지 100점으로 알려드립니다. 조건에 맞는 야영장과 예약처까지
          함께 찾아 드립니다.
        </p>
      </section>
    </div>

    <!--
      스크롤 표시. 글 폭이 아니라 화면 한가운데에 세워야 해서 본문 흐름에서 빼냈다.
      가는 선이 아래로 내려가 화살촉이 되고, 그 밑에 라벨이 붙는다.
    -->
    <div
      class="cue"
      :style="{ opacity: cueOpacity, pointerEvents: cueOpacity < 0.05 ? 'none' : 'auto' }"
    >
      <button
        class="cue__btn"
        :class="{ 'cue__btn--in': landed }"
        type="button"
        aria-label="아래로 내려 소개 보기"
        @click="scrollToIndex"
      >
        <svg class="cue__arrow" viewBox="0 0 12 30" width="12" height="30" aria-hidden="true">
          <path d="M6 0 V26" fill="none" stroke="currentColor" stroke-width="1.1" />
          <path d="M1.2 21 L6 26.6 L10.8 21" fill="none" stroke="currentColor" stroke-width="1.1" />
        </svg>
        <span class="cue__label">SCROLL</span>
      </button>
    </div>

    <!--
      내려오면 먼저 "여기서 뭘 할 수 있나". 지수 설명은 그다음이다.
      큰 칸 하나에 작은 칸 넷을 붙인 판이라, 무엇이 본론인지가 크기로 먼저 읽힌다.
    -->
    <section id="what" ref="whatEl" class="scene what" :class="{ 'what--in': whatIn }">
      <h3 class="what__title">모닥불이 제공하는 서비스</h3>

      <div class="deck">
        <RouterLink class="card card--lead" to="/regions?view=rank">
          <img class="card__photo" src="/media/hero/regions.webp" alt="" loading="lazy" />
          <span class="card__veil"></span>
          <span class="card__eyebrow">모닥불 지수</span>
          <strong class="card__title">오늘 어디가 제일 잘 탈까</strong>
          <span class="card__body">
            비·바람·밤 기온·공기·하늘을 모아 100점으로 잽니다. 전국 열일곱 지역을 한 판에 놓고 높은
            곳부터 보여드립니다.
          </span>
          <span class="card__foot">
            <span class="card__meta">17개 지역</span>
            <span class="card__go" aria-hidden="true">→</span>
          </span>
        </RouterLink>

        <RouterLink
          v-for="(card, i) in CARDS"
          :key="card.eyebrow"
          class="card"
          :to="card.to"
          :style="{ transitionDelay: `${140 + i * 90}ms` }"
        >
          <img class="card__photo" :src="`/media/hero/${card.photo}.webp`" alt="" loading="lazy" />
          <span class="card__veil"></span>
          <span class="card__eyebrow">{{ card.eyebrow }}</span>
          <strong class="card__title">{{ card.title }}</strong>
          <span class="card__body">{{ card.body }}</span>
          <span class="card__foot">
            <span class="card__meta">{{ card.meta }}</span>
            <span class="card__go" aria-hidden="true">→</span>
          </span>
        </RouterLink>
      </div>
    </section>

    <!-- 내려오면 나오는 설명 -->
    <section id="index" ref="indexEl" class="scene index" :class="{ 'index--in': indexIn }">
      <p class="eyebrow">모닥불 지수</p>
      <h3 class="index__title">다섯 가지를 모아 100점으로</h3>

      <!--
        배점이 100 을 어떻게 나눠 갖는지 한 줄로 보여준다.
        제목이 "모아 100점으로" 라고 말하는 것을 눈으로도 확인할 수 있게.
      -->
      <div class="mix" role="img" :aria-label="mixLabel">
        <span
          v-for="(factor, i) in FACTORS"
          :key="factor.name"
          class="mix__seg"
          :class="{ 'mix__seg--off': hovered !== null && hovered !== i }"
          :style="{
            width: indexIn ? `${factor.weight}%` : '0%',
            transitionDelay: `${180 + i * 110}ms`,
          }"
          @mouseenter="hovered = i"
          @mouseleave="hovered = null"
        >
          <i class="mix__fill" :style="{ background: weightColor[factor.weight] }"></i>
        </span>
      </div>

      <ul class="factors">
        <li
          v-for="(factor, i) in FACTORS"
          :key="factor.name"
          class="factor"
          :class="{ 'factor--on': hovered === i }"
          :style="{ transitionDelay: `${420 + i * 90}ms` }"
          @mouseenter="hovered = i"
          @mouseleave="hovered = null"
        >
          <i class="factor__chip" :style="{ background: weightColor[factor.weight] }"></i>
          <span class="num factor__weight">{{ factor.weight }}</span>
          <span class="factor__body">
            <b class="factor__name">{{ factor.name }}</b>
            <span class="factor__note">{{ factor.note }}</span>
          </span>
        </li>
      </ul>

      <p class="index__foot">바람은 평균이 아니라 순간 최대(돌풍)로 봅니다.</p>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
}

/* ── 첫 화면 ─────────────────────────────────── */
/*
 * 붙박이 구간. 이 높이만큼 내리는 동안 표지가 화면에 머문다.
 * 표지 자체를 100vh 로 두고 그보다 긴 틀 안에 붙여야 "머물다가 놓아준다" 가 된다.
 */
.stage {
  height: 100vh;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 var(--sp-6);
}

.cover {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 34rem;
  /* 아래에 스크롤 표시가 서 있다. 그 자리를 비워 두고 글은 위로 올린다. */
  padding-bottom: var(--sp-8);
  text-shadow: 0 2px 30px rgba(var(--camp-shade-rgb), 0.85);
}

/* 배경이 흐려지는 동안 글자는 반대로 또렷해지며 떠오른다 */
.cover__name,
.cover__tagline,
.cover__body {
  opacity: 0;
  transform: translateY(14px);
  filter: blur(7px);
  transition:
    opacity 1.15s var(--ease),
    transform 1.15s var(--ease),
    filter 1.15s var(--ease);
}

.cover--in .cover__name,
.cover--in .cover__tagline,
.cover--in .cover__body {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

.cover__name {
  font-size: clamp(3.2rem, 10.5vw, 5.2rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.035em;
}

.cover__tagline {
  margin-top: var(--sp-4);
  font-size: clamp(1.05rem, 3vw, 1.35rem);
  font-weight: 600;
  color: var(--camp-star);
  letter-spacing: -0.02em;
}

.cover__body {
  margin-top: var(--sp-6);
  font-size: var(--fs-body);
  line-height: 1.85;
  color: var(--camp-muted);
}

/* ── 스크롤 표시 ─────────────────────────────── */
/*
 * 본문 흐름에서 빼내 화면 가로 한가운데에 세운다.
 * 아래에서 조금 띄워야 화면 끝에 붙은 장식처럼 보이지 않는다.
 */
.cue {
  position: fixed;
  left: 50%;
  bottom: clamp(3.5rem, 13vh, 7rem);
  z-index: 5;
  transform: translateX(-50%);
  transition: opacity var(--dur-2) linear;
}

.cue__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  width: 58px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(var(--camp-ink-rgb), 0.9);
  cursor: pointer;
  filter: drop-shadow(0 1px 10px rgba(var(--camp-shade-rgb), 0.9));

  /* 표지 글자와 같은 박자로 떠오른다 */
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 1.15s var(--ease) 760ms,
    transform 1.15s var(--ease) 760ms,
    color 0.18s;
}

.cue__btn--in {
  opacity: 1;
  transform: translateY(0);
}

.cue__btn:hover {
  color: var(--camp-text);
}

/* 선이 아래로 흘러내리는 것처럼. 화살촉은 제자리에 둔다. */
.cue__arrow {
  overflow: visible;
}

.cue__arrow path:first-child {
  animation: cue-drop 2.4s var(--ease-inout) infinite;
  transform-origin: 50% 0;
}

@keyframes cue-drop {
  0%,
  100% {
    transform: scaleY(0.55);
    opacity: 0.45;
  }
  45% {
    transform: scaleY(1);
    opacity: 1;
  }
}

.cue__label {
  font-family: var(--font-data);
  font-size: var(--fs-micro);
  font-weight: 500;
  letter-spacing: 0.2em;
  /* letter-spacing 이 마지막 글자 뒤에도 붙어 가운데가 밀린다. 그만큼 당겨준다. */
  text-indent: 0.2em;
  line-height: 1;
}

/* ── 설명 ────────────────────────────────────── */
/* 표지가 걷히면서 자리를 내주면 그때 떠오른다 */
/*
 * 씬.
 *
 * 절마다 화면을 하나씩 차지하고 제자리에 붙는다. 아래로 내리면 다음 절이
 * 밑에서 올라와 앞 절을 덮는다 — 한 화면씩 갈아 끼우는 느낌이 난다.
 * 그냥 이어서 흘려보내면 절의 경계가 없어 어디까지가 한 덩어리인지 안 읽힌다.
 *
 * 덮으려면 바탕이 있어야 한다.
 */
.scene {
  z-index: 1;
  position: sticky;
  top: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: var(--sp-7) var(--sp-6);
  /*
   * 거의 불투명하게. 0.93 으로 두면 앞 절 카드가 비쳐서 덮는 게 아니라
   * 겹쳐 보인다. 배경 영상은 표지와 절 사이에서 충분히 보인다.
   */
  background: rgba(var(--camp-shade-rgb), 0.985);
  /* 올라오는 윗변. 판을 나누는 가는 선과 같은 말이다. */
  border-top: 1px solid rgba(var(--camp-ember-rgb), 0.16);
}

/* ── 여기서 할 수 있는 것 ─────────────────────── */

/* 글과 칸은 가운데로 모으되 바탕은 화면 끝까지 간다 */
.what > *,
.index > * {
  width: 100%;
  max-width: 1440px;
  margin-inline: auto;
}

/* 참고한 판처럼 제목은 가운데. 아래 칸들이 왼쪽으로 정렬되니 축이 하나 생긴다. */
.what__title,
.deck {
  opacity: 0;
  transform: translateY(18px);
  transition:
    opacity var(--dur-3) var(--ease),
    transform var(--dur-3) var(--ease);
}

.what--in .what__title,
.what--in .deck {
  opacity: 1;
  transform: translateY(0);
}

.what__title {
  margin-bottom: var(--sp-6);
  font-size: var(--fs-display);
  font-weight: 800;
  letter-spacing: -0.04em;
  text-align: center;
}

/*
 * 큰 칸 하나 + 작은 칸 넷. 셋씩 놓고 큰 칸이 두 칸을 먹으면
 * 첫 줄은 큰 칸 + 작은 칸 하나, 둘째 줄은 작은 칸 셋으로 딱 떨어진다.
 */
/*
 * 큰 칸이 두 칸을 먹고 작은 칸이 여섯이라 모두 여덟 칸이다.
 * 네 열로 깔면 두 줄로 딱 떨어진다 (큰 칸 + 작은 칸 둘 / 작은 칸 넷).
 */
.deck {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-height: 12.5rem;
  padding: var(--sp-4) var(--sp-5) var(--sp-5);
  background: var(--camp-surface);
  color: inherit;
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity var(--dur-3) var(--ease),
    transform var(--dur-3) var(--ease),
    background var(--dur-1);
}

.what--in .card {
  opacity: 1;
  transform: translateY(0);
}

.card--lead {
  grid-column: span 2;
}

.card > * {
  position: relative;
  z-index: 1;
}

/*
 * 칸마다 그 화면의 사진을 깐다. 글만 있는 칸 여섯은 결국 표라서,
 * 사진이 있어야 "무엇을 하는 곳인지" 가 읽기 전에 먼저 전해진다.
 */
.card__photo {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--dur-3) var(--ease);
}

.card:hover .card__photo {
  transform: scale(1.05);
}

/* 사진 위에 글을 올리려면 눌러야 한다. 아래쪽을 더 진하게 해 글이 붙는 자리를 만든다. */
.card__veil {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(
    180deg,
    rgba(var(--camp-shade-rgb), 0.7) 0%,
    rgba(var(--camp-shade-rgb), 0.8) 45%,
    rgba(var(--camp-shade-rgb), 0.93) 100%
  );
  transition: background var(--dur-2) var(--ease-inout);
}

.card:hover .card__veil {
  background: linear-gradient(
    180deg,
    rgba(var(--camp-shade-rgb), 0.58) 0%,
    rgba(var(--camp-shade-rgb), 0.72) 45%,
    rgba(var(--camp-shade-rgb), 0.9) 100%
  );
}

.card__eyebrow {
  font-size: var(--fs-small);
  /* 사진이 밝은 칸에서는 주황이 묻힌다. 조금 올리고 그림자를 깐다. */
  color: #ffab5e;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.75);
}

.card__title {
  color: #fff;
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.6);
  font-size: var(--fs-lead);
  font-weight: 700;
  letter-spacing: -0.03em;
}

.card--lead .card__title {
  max-width: 22ch;
  font-size: var(--fs-title);
}

.card__body {
  max-width: var(--measure);
  color: rgba(255, 255, 255, 0.82);
  font-size: var(--fs-meta);
  line-height: 1.75;
  color: var(--camp-muted);
}

.card--lead .card__body {
  max-width: 40ch;
}

.card__foot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-3);
  margin-top: auto;
  padding-top: var(--sp-4);
}

/* 숫자와 말이 섞인 짧은 구절이라 고정폭으로 두면 자간이 벌어져 어색하다 */
.card__meta {
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.card__go {
  color: var(--camp-ember);
  transition: transform var(--dur-1) var(--ease);
}

.card:hover .card__go {
  transform: translateX(5px);
}

@media (max-width: 900px) {
  .deck {
    grid-template-columns: repeat(2, 1fr);
  }

  .card--lead {
    grid-column: span 2;
  }
}

@media (max-width: 560px) {
  .what {
    padding: var(--sp-7) var(--sp-4) var(--sp-6);
  }

  .deck {
    grid-template-columns: 1fr;
  }

  .card--lead {
    grid-column: auto;
  }
}

/*
 * 떠오르는 연출은 안쪽 내용에만 건다.
 * 씬 자체에 opacity 나 transform 을 걸면 붙박이가 흔들리고,
 * 투명한 동안에는 앞 절을 덮지도 못한다.
 */
.index {
  scroll-margin-top: 0;
}

.index > * {
  opacity: 0;
  transform: translateY(26px);
  transition:
    opacity 1s var(--ease),
    transform 1s var(--ease);
}

.index--in > * {
  opacity: 1;
  transform: translateY(0);
}

/* 배경이 밝아 글자가 묻힌다. 뒤에 옅은 판을 깔되 가장자리는 흐리게 지운다. */

.index > * {
  position: relative;
}

.index__title {
  margin-top: var(--sp-2);
  font-size: clamp(1.5rem, 4.5vw, 2.1rem);
  font-weight: 800;
  letter-spacing: -0.035em;
}

/* 100 을 다섯 조각으로 나눈 막대 */
.mix {
  display: flex;
  height: 12px;
  margin-top: var(--sp-6);
  background: rgba(var(--camp-ink-rgb), 0.08);
}

.mix__seg {
  /* 폭이 곧 배점이다. 화면에 들어오면 왼쪽부터 차례로 자란다. */
  transition:
    width 0.95s var(--ease),
    opacity 0.2s ease;
  cursor: default;
}

/* 한 조각을 짚으면 나머지는 물러난다 */
.mix__seg--off {
  opacity: 0.3;
}

/* 조각 사이는 배경색 2px 로 끊는다. 붙여 두면 한 덩어리로 읽힌다. */
.mix__fill {
  display: block;
  height: 100%;
  margin-right: 2px;
}

.mix__seg:last-child .mix__fill {
  margin-right: 0;
}

.factors {
  display: flex;
  flex-direction: column;
  margin-top: var(--sp-5);
  list-style: none;
}

.factor {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  padding: var(--sp-3) 0;
  border-bottom: 1px solid rgba(var(--camp-ink-rgb), 0.1);

  /* 막대가 다 자란 뒤 한 줄씩 따라 올라온다 */
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 0.6s ease,
    transform 0.6s var(--ease);
}

.factor__note {
  transition: color var(--dur-1) ease;
}

.index--in .factor {
  opacity: 1;
  transform: translateY(0);
}

.factor:last-child {
  border-bottom: 0;
}

.index--in .factor--on {
  /* 목록에서 짚은 줄. 막대의 같은 조각도 함께 살아난다. */
  transform: translateX(4px);
}

.factor--on .factor__note {
  color: var(--camp-text);
}

/* 막대의 어느 조각인지 알려주는 표시. 색만으로 읽게 두지 않으려고 숫자 옆에 둔다. */
.factor__chip {
  width: 4px;
  height: 0.95rem;
  flex-shrink: 0;
  align-self: center;
}

.factor__weight {
  width: 2rem;
  flex-shrink: 0;
  font-size: var(--fs-title);
  font-weight: 700;
  color: var(--camp-text);
  text-align: right;
}

.factor__body {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.factor__name {
  font-size: var(--fs-lead);
  font-weight: 700;
}

.factor__note {
  font-size: var(--fs-meta);
  color: var(--camp-muted);
}

.index__foot {
  margin-top: var(--sp-5);
  font-size: var(--fs-meta);
  color: var(--camp-faint);
}

@media (max-width: 620px) {
  .cover__body {
    font-size: var(--fs-body);
    line-height: 1.8;
  }

  .factor {
    gap: var(--sp-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cover__name,
  .cover__tagline,
  .cover__body,
  .cue__btn {
    opacity: 1;
    transform: none;
    filter: none;
    transition: none;
  }

  .cue__arrow path:first-child {
    animation: none;
  }

  .index,
  .factor {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .mix__seg {
    transition: none;
  }
}
</style>

<style>
/* 인트로가 끝날 때까지 스크롤을 잠근다. html 에 걸어야 해서 scoped 밖이다. */
html.is-landing,
html.is-landing body {
  overflow: hidden;
}
</style>
