<script setup>
/**
 * 화면 전체에 깔리는 밤 캠프 배경.
 *
 * 바닥에는 실사 영상(Pixabay Content License, 출처 표기 의무 없음)을 깔고,
 * 그 위에 별 · 모닥불 번짐을 겹쳐 장면을 완성한다.
 * 영상만으로는 밝기와 구도를 원하는 대로 잡을 수 없어서 나눴다.
 *
 * 겹치는 층은 오늘 밤 관측값을 따라간다.
 *   밤 최저기온 → 화면 색 (추우면 푸르게, 더우면 붉게)
 *   구름량      → 별의 밝기
 *
 * 화면을 내리면 영상을 세운다. 읽을 것이 앞에 나오는데 뒤에서 계속 움직이면
 * 눈이 그쪽으로 끌린다. 맨 위로 돌아오면 다시 돌린다.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useWeatherStore } from '@/stores/weatherStore'

const weatherStore = useWeatherStore()
const video = ref(null)
const ready = ref(false)
const reduceMotion = ref(false)

/**
 * 처음 들어오면 영상을 또렷하게 먼저 보여준다.
 * 잠깐 뒤에 서서히 흐려지면서 뒤로 물러나고, 그 위로 글자가 올라온다.
 * 배경이 앱 껍데기에 한 번만 붙으므로 이 연출도 첫 진입에만 돈다.
 */
const settled = ref(false)
let settleTimer = 0

const best = computed(() => weatherStore.bestTonight)

// 추운 밤은 푸르게, 더운 밤은 붉게
const tint = computed(() => {
  const nightLow = best.value?.nightLow ?? 14
  const t = Math.min(1, Math.max(0, (nightLow + 5) / 30))
  const mix = [42, 96, 122].map((c, i) => Math.round(c + ([122, 62, 44][i] - c) * t))
  return `rgba(${mix.join(',')}, 0.28)`
})

// 구름이 많으면 별이 가려진다
const starOpacity = computed(() => {
  const clouds = best.value?.clouds ?? 30
  return 0.5 + (1 - Math.min(1, clouds / 100)) * 0.5
})

/* 별: 위치와 크기를 고정 시드로 만들어 새로고침해도 같은 하늘이 나온다 */
function seeded(i, salt) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const stars = computed(() =>
  Array.from({ length: 90 }, (_, i) => ({
    id: i,
    left: `${seeded(i, 1) * 100}%`,
    top: `${seeded(i, 2) * 62}%`,
    size: `${1 + seeded(i, 3) * 1.8}px`,
    delay: `${seeded(i, 4) * 4}s`,
    duration: `${2.4 + seeded(i, 5) * 3.2}s`,
    dim: 0.35 + seeded(i, 6) * 0.65,
  })),
)

function onLoaded() {
  ready.value = true
  // 새로고침으로 이미 내려온 자리에서 시작했다면 바로 세워 둔다
  if (parked.value) video.value?.pause()
  // 또렷한 화면을 잠깐 보여준 뒤 물러난다
  settleTimer = window.setTimeout(
    () => {
      settled.value = true
    },
    reduceMotion.value ? 0 : 1100,
  )
}

// 화면을 내려서 영상을 세워둔 상태인지
const parked = ref(false)

function resume() {
  if (!video.value || reduceMotion.value || parked.value || document.hidden) return
  video.value.play().catch(() => {})
}

function onVisibility() {
  if (!video.value || reduceMotion.value) return
  if (document.hidden) video.value.pause()
  else resume()
}

/*
 * 기준은 HomeView 의 표지 페이드와 같은 지점(한 화면의 절반 조금 넘게)이다.
 * 표지 글자가 다 걷힐 때쯤 배경도 멈춘다.
 */
function onScroll() {
  const past = window.scrollY > (window.innerHeight || 0) * 0.55
  if (past === parked.value) return
  parked.value = past
  if (!video.value) return
  if (past) video.value.pause()
  else resume()
}

onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion.value) video.value?.pause()
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  clearTimeout(settleTimer)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="backdrop" :class="{ 'backdrop--settled': settled }" aria-hidden="true">
    <video
      ref="video"
      class="backdrop__video"
      :class="{ 'backdrop__video--ready': ready, 'backdrop__video--settled': settled }"
      src="/media/night-camp.mp4"
      autoplay
      muted
      loop
      playsinline
      preload="auto"
      @loadeddata="onLoaded"
    ></video>

    <!-- 별 -->
    <div class="stars" :style="{ opacity: settled ? starOpacity : 0 }">
      <span
        v-for="star in stars"
        :key="star.id"
        class="stars__dot"
        :style="{
          left: star.left,
          top: star.top,
          width: star.size,
          height: star.size,
          animationDelay: star.delay,
          animationDuration: star.duration,
          '--dim': star.dim,
        }"
      ></span>
    </div>

    <!-- 모닥불 번짐 -->
    <div class="embers">
      <div class="ember"></div>
      <div class="ember ember--core"></div>
    </div>

    <!-- 어두운 영역을 끌어올리는 층 -->
    <div class="lift"></div>

    <!-- 오늘 밤 기온에 맞춘 색 -->
    <div class="tint" :style="{ background: tint }"></div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(58% 42% at 60% 68%, #7a5230 0%, transparent 72%),
    linear-gradient(180deg, #22394f 0%, #1f3a2c 100%);
}

.backdrop__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* 영상이 가진 실제 지면이 화면 아래쪽에 더 들어오도록 프레임을 내린다 */
  object-position: center 62%;
  opacity: 0;
  /* 처음에는 또렷하게. 살짝 당겨둔 화면이 천천히 제자리로 돌아온다. */
  transform: scale(1.14);
  filter: blur(0) saturate(1.2) brightness(1.6) contrast(1);
  transition:
    opacity 0.9s ease,
    transform 2.4s var(--ease),
    filter 1.9s var(--ease-inout);
}

.backdrop__video--ready {
  opacity: 1;
}

/* 물러난 뒤. 흐리게 깔되 형체는 남긴다. 너무 흐리면 그냥 어두운 판이 된다. */
.backdrop__video--settled {
  transform: scale(1.06);
  filter: blur(2.5px) saturate(1.3) brightness(3.4) contrast(0.86);
}

/* 별 */
.stars {
  position: absolute;
  inset: 0;
  transition: opacity var(--dur-3) ease;
}

.stars__dot {
  position: absolute;
  border-radius: 50%;
  background: #f6efdd;
  opacity: var(--dim);
  box-shadow: 0 0 6px rgba(246, 239, 221, 0.7);
  animation-name: twinkle;
  animation-iteration-count: infinite;
  animation-timing-function: ease-in-out;
}

@keyframes twinkle {
  0%,
  100% {
    opacity: calc(var(--dim) * 0.35);
    transform: scale(0.85);
  }
  50% {
    opacity: var(--dim);
    transform: scale(1);
  }
}

/* 모닥불 번짐. 두 겹을 다른 박자로 깜빡여 불규칙하게 보이게 한다. */
.embers {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 1.4s ease var(--dur-2);
}

.backdrop--settled .embers {
  opacity: 1;
}

.ember {
  position: absolute;
  left: 58%;
  bottom: 7%;
  width: min(46rem, 78vw);
  height: min(30rem, 52vh);
  transform: translateX(-50%);
  background: radial-gradient(
    closest-side,
    rgba(255, 182, 104, 0.6) 0%,
    rgba(255, 130, 50, 0.2) 38%,
    transparent 72%
  );
  animation: flicker 5.5s ease-in-out infinite;
}

.ember--core {
  width: min(20rem, 40vw);
  height: min(13rem, 24vh);
  bottom: 6%;
  background: radial-gradient(
    closest-side,
    rgba(255, 220, 152, 0.6) 0%,
    rgba(255, 158, 70, 0.26) 45%,
    transparent 74%
  );
  animation: flicker 3.1s ease-in-out infinite reverse;
}

@keyframes flicker {
  0%,
  100% {
    opacity: 0.72;
    transform: translateX(-50%) scale(1);
  }
  35% {
    opacity: 1;
    transform: translateX(-50%) scale(1.06);
  }
  62% {
    opacity: 0.84;
    transform: translateX(-50%) scale(0.97);
  }
}

/* screen 합성은 검은 픽셀을 들어올린다. brightness 로는 안 되는 일이다. */
.lift {
  position: absolute;
  inset: 0;
  opacity: 0;
  mix-blend-mode: screen;
  background:
    radial-gradient(80% 60% at 58% 62%, rgba(96, 66, 40, 0.55) 0%, transparent 72%),
    linear-gradient(180deg, rgba(38, 60, 84, 0.42) 0%, rgba(30, 52, 40, 0.34) 100%);
  transition: opacity 1.4s ease var(--dur-2);
}

.backdrop--settled .lift {
  opacity: 1;
}

/*
 * 배너가 있는 화면은 한 단계 더 밝게.
 *
 * 판이나 글자 색을 건드리는 대신 여기서 바닥을 올린다 — 배경의 결은 그대로 두고
 * 검은 쪽만 들어올리는 층이라 밝기를 다루기에 맞은 자리다.
 *
 * 표지에는 걸지 않는다. 표지 글은 하늘 위에 바로 얹히는데,
 * 하늘까지 같이 밝아지면 글이 묻힌다.
 */
.backdrop--bright .lift {
  background:
    radial-gradient(80% 60% at 58% 62%, rgba(122, 86, 52, 0.62) 0%, transparent 72%),
    linear-gradient(180deg, rgba(56, 86, 116, 0.5) 0%, rgba(44, 76, 58, 0.56) 100%);
}

.backdrop--bright .backdrop__video--settled {
  filter: blur(2.5px) saturate(1.3) brightness(3.9) contrast(0.84);
}

.tint {
  position: absolute;
  inset: 0;
  mix-blend-mode: soft-light;
  transition: background var(--dur-3) ease;
}

@media (max-width: 620px) {
  .backdrop__video--settled {
    filter: blur(2px) saturate(1.3) brightness(3.2) contrast(0.86);
  }
}

@media (prefers-reduced-motion: reduce) {
  .stars__dot,
  .ember {
    animation: none;
  }
}
</style>
