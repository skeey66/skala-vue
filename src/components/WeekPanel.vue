<script setup>
/**
 * 이번 주.
 *
 * 지도와 순위가 "오늘 어디가" 를 답한다면 여기는 "언제 가면" 을 답한다.
 *
 * 17개 지역을 한 판에 다 깔면 85칸짜리 표가 된다. 그건 훑는 것이지 읽는 게 아니다.
 * 지역을 하나 고르고 그 지역의 한 주를 크게 본다. 일기예보를 보는 방식 그대로다.
 *
 * 값은 전 지역을 한 번에 받아 두었으므로(1콜) 지역을 바꿔도 다시 부르지 않는다.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NEmpty, NSkeleton } from 'naive-ui'
import { storeToRefs } from 'pinia'
import BaseDashboardCard from '@/components/BaseDashboardCard.vue'
import { useWeatherStore } from '@/stores/weatherStore'
import { useTemperature } from '@/composables/useTemperature'
import { nightFireScore, bonfireGrade } from '@/composables/useBonfireScore'

const emit = defineEmits(['close'])

const router = useRouter()
const weatherStore = useWeatherStore()
const { weekNights, weekLoading, weekError } = storeToRefs(weatherStore)
const { unitSymbol, toDisplay } = useTemperature()

onMounted(async () => {
  await weatherStore.load()
  await weatherStore.loadWeek()
})

/* 고를 수 있는 지역. 오늘 점수가 높은 순으로 세운다. */
const regions = computed(() =>
  weatherStore.rankedCities.filter((city) => (weekNights.value[city.id] ?? []).length),
)

const pickedId = ref('')

// 처음 열리면 오늘 제일 좋은 지역을 잡아 둔다. 빈 화면으로 시작하지 않는다.
watch(
  regions,
  (list) => {
    if (!pickedId.value && list.length) pickedId.value = list[0].id
  },
  { immediate: true },
)

const picked = computed(() => regions.value.find((city) => city.id === pickedId.value) ?? null)

const nights = computed(() =>
  (weekNights.value[pickedId.value] ?? []).map((night) => {
    const score = nightFireScore(night)
    return { ...night, score, grade: bonfireGrade(score) }
  }),
)

// 고른 지역에서 가장 좋은 밤
const bestNight = computed(() => [...nights.value].sort((a, b) => b.score - a.score)[0] ?? null)

/*
 * 점수 흐름을 선으로 그린다. 숫자만 늘어놓으면 "언제가 오르막인지" 가 안 보인다.
 * 세로 눈금은 0~100 고정이다. 주마다 다른 눈금을 쓰면 나쁜 주가 좋아 보인다.
 *
 * 뷰박스를 실제 픽셀 크기에 맞춘다. 작은 좌표계를 preserveAspectRatio="none" 으로
 * 늘리면 가로로만 몇 배가 되어 점이 타원으로 뭉개진다.
 */
const CHART_H = 96
const PAD = 10

const box = ref(null)
const boxWidth = ref(720)
let observer = null

/*
 * 지역을 바꾸면 :key 때문에 이 덩어리가 통째로 새로 만들어진다.
 * 그러면 ref 가 새 요소를 가리키므로, 보던 대상을 갈아타야 한다.
 * 한 번만 observe 해 두면 떨어져 나간 옛 요소를 계속 보게 되어 폭이 안 따라온다.
 */
function measure(el) {
  if (el) boxWidth.value = Math.round(el.getBoundingClientRect().width)
}

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    const w = Math.round(entry.contentRect.width)
    if (w > 0) boxWidth.value = w
  })
  if (box.value) {
    observer.observe(box.value)
    measure(box.value)
  }
})

watch(box, (el, prev) => {
  if (prev) observer?.unobserve(prev)
  if (el) {
    observer?.observe(el)
    measure(el)
  }
})

onBeforeUnmount(() => observer?.disconnect())

const points = computed(() => {
  const list = nights.value
  if (list.length < 2) return []
  // 점은 아래 칸 한가운데에 맞춘다. 어긋나면 선과 숫자가 따로 논다.
  return list.map((night, i) => ({
    x: (boxWidth.value * (i + 0.5)) / list.length,
    y: CHART_H - PAD - (night.score / 100) * (CHART_H - PAD * 2),
    night,
  }))
})

const linePath = computed(() =>
  points.value.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' '),
)

const areaPath = computed(() => {
  if (!points.value.length) return ''
  const first = points.value[0]
  const last = points.value[points.value.length - 1]
  return `${linePath.value} L${last.x.toFixed(2)} ${CHART_H} L${first.x.toFixed(2)} ${CHART_H} Z`
})

function goDetail() {
  if (pickedId.value) router.push(`/weather/${pickedId.value}`)
}
</script>

<template>
  <BaseDashboardCard title="이번 주">
    <template #actions>
      <button class="switch" type="button" @click="emit('close')">지도 보기</button>
    </template>

    <NSkeleton v-if="weekLoading && !regions.length" :repeat="4" height="40px" class="skeleton" />

    <p v-else-if="weekError" class="bad">{{ weekError }}</p>

    <NEmpty
      v-else-if="!regions.length"
      description="주간 예보를 아직 받지 못했습니다"
      size="small"
    />

    <template v-else>
      <!-- 지역 고르기 -->
      <ul class="picker">
        <li v-for="region in regions" :key="region.id">
          <button
            class="chip"
            :class="{ 'chip--on': region.id === pickedId }"
            type="button"
            :aria-pressed="region.id === pickedId"
            @click="pickedId = region.id"
          >
            <span class="chip__label">{{ region.name }}</span>
          </button>
        </li>
      </ul>

      <!-- 고른 지역의 한 주. key 를 바꿔 다시 그리게 한다. -->
      <div v-if="picked" :key="pickedId" class="week">
        <header class="week__head">
          <div>
            <h3 class="week__name">{{ picked.name }}</h3>
            <p v-if="bestNight" class="week__best">
              가장 좋은 밤은
              <b>{{ bestNight.label }}({{ bestNight.weekday }})</b>
              <span class="num week__best-score">{{ bestNight.score }}</span>
            </p>
          </div>
          <button class="week__go" type="button" @click="goDetail">
            {{ picked.name }} 자세히 →
          </button>
        </header>

        <!-- 점수 흐름 -->
        <div ref="box" class="curve-box">
          <svg
            v-if="points.length"
            class="curve"
            :viewBox="`0 0 ${boxWidth} ${CHART_H}`"
            :width="boxWidth"
            :height="CHART_H"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="weekFade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--camp-ember)" stop-opacity="0.3" />
                <stop offset="100%" stop-color="var(--camp-ember)" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path class="curve__area" :d="areaPath" fill="url(#weekFade)" />
            <path class="curve__line" :d="linePath" fill="none" stroke="var(--camp-ember)" />
            <circle
              v-for="p in points"
              :key="p.night.key"
              class="curve__dot"
              :cx="p.x"
              :cy="p.y"
              :r="p.night.key === bestNight?.key ? 4.5 : 2.6"
            />
          </svg>
        </div>

        <!-- 하루씩 -->
        <ol class="days">
          <li
            v-for="(night, i) in nights"
            :key="night.key"
            class="day"
            :class="{ 'day--best': night.key === bestNight?.key }"
            :style="{ animationDelay: `${140 + i * 70}ms` }"
          >
            <span class="day__weekday">{{ night.weekday }}</span>
            <span class="num day__date">{{ night.label }}</span>

            <span class="num day__score">{{ night.score }}</span>
            <span class="day__grade">{{ night.grade.label }}</span>

            <span class="num day__temp">{{ toDisplay(night.nightLow) }}{{ unitSymbol }}</span>
            <span class="day__rain" :class="{ 'day__rain--on': night.rainProb >= 50 }">
              {{ night.rainProb > 0 ? `비 ${night.rainProb}%` : '비 없음' }}
            </span>
          </li>
        </ol>

        <p class="week__foot">그날 저녁 6시부터 다음 날 아침 6시까지의 예보로 셉니다</p>
      </div>
    </template>
  </BaseDashboardCard>
</template>

<style scoped>
.switch {
  flex-shrink: 0;
  white-space: nowrap;
  padding: var(--sp-1) var(--sp-2);
  border: 1px solid var(--camp-line);
  border-radius: var(--camp-radius-sm);
  background: transparent;
  color: var(--camp-muted);
  font-family: inherit;
  font-size: var(--fs-small);
  cursor: pointer;
}

.switch:hover {
  color: var(--camp-text);
}

.bad {
  font-size: var(--fs-meta);
  color: var(--camp-danger);
}

/* ── 지역 고르기 ─────────────────────────────── */
.picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(4.6rem, 1fr));
  gap: 1px;
  list-style: none;
  margin-bottom: var(--sp-6);
}

.chip {
  position: relative;
  width: 100%;
  padding: var(--sp-2) var(--sp-2);
  border: 0;
  background: rgba(var(--camp-ink-rgb), 0.04);
  color: var(--camp-muted);
  font-family: inherit;
  font-size: var(--fs-meta);
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  transition: color var(--dur-1) ease;
}

/* 고른 칩은 색이 왼쪽에서 차오른다 */
.chip::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--camp-ember);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--dur-2) var(--ease);
}

.chip__label {
  position: relative;
}

.chip:hover {
  color: var(--camp-text);
}

.chip--on {
  color: var(--camp-on-ember);
}

.chip--on::before {
  transform: scaleX(1);
}

/* ── 고른 지역 ───────────────────────────────── */
.week__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sp-4);
  flex-wrap: wrap;
  margin-bottom: var(--sp-5);
}

.week__name {
  font-size: var(--fs-display);
  font-weight: 800;
  letter-spacing: -0.04em;
}

.week__best {
  margin-top: var(--sp-1);
  font-size: var(--fs-meta);
  color: var(--camp-muted);
}

.week__best b {
  color: var(--camp-text);
}

.week__best-score {
  margin-left: var(--sp-1);
  color: var(--camp-ember);
  font-weight: 700;
}

.week__go {
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--camp-line);
  background: transparent;
  color: var(--camp-muted);
  font-family: inherit;
  font-size: var(--fs-small);
  cursor: pointer;
  transition:
    color 0.18s,
    border-color 0.18s;
}

.week__go:hover {
  color: var(--camp-text);
  border-color: var(--camp-text);
}

/* ── 점수 흐름 ───────────────────────────────── */
.curve-box {
  width: 100%;
  height: 96px;
  margin-bottom: -1px;
}

.curve {
  display: block;
}

.curve__line {
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 2000;
  stroke-dashoffset: 2000;
  animation: draw 1.15s var(--ease) forwards;
}

.curve__area {
  opacity: 0;
  animation: fade 0.9s ease var(--dur-2) forwards;
}

.curve__dot {
  fill: var(--camp-ember);
  opacity: 0;
  animation: fade var(--dur-2) ease var(--dur-3) forwards;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes fade {
  to {
    opacity: 1;
  }
}

/* ── 하루씩 ──────────────────────────────────── */
.days {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr));
  gap: 1px;
  list-style: none;
  border-top: 1px solid rgba(var(--camp-ink-rgb), 0.12);
}

.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-0);
  padding: var(--sp-4) var(--sp-2) var(--sp-4);
  background: rgba(var(--camp-ink-rgb), 0.03);

  opacity: 0;
  transform: translateY(10px);
  animation: rise var(--dur-3) var(--ease) forwards;
}

@keyframes rise {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.day--best {
  background: rgba(var(--camp-ember-rgb), 0.1);
}

.day__weekday {
  font-size: var(--fs-small);
  font-weight: 700;
  color: var(--camp-text);
}

.day__date {
  font-size: var(--fs-micro);
  color: var(--camp-faint);
}

.day__score {
  margin-top: var(--sp-2);
  font-size: var(--fs-display);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
}

.day--best .day__score {
  color: var(--camp-ember);
}

.day__grade {
  margin-top: var(--sp-0);
  font-size: var(--fs-micro);
  color: var(--camp-muted);
}

.day__temp {
  margin-top: var(--sp-2);
  font-size: var(--fs-meta);
  color: var(--camp-text);
}

.day__rain {
  font-size: var(--fs-micro);
  color: var(--camp-faint);
}

.day__rain--on {
  color: var(--camp-dawn);
}

.week__foot {
  margin-top: var(--sp-4);
  font-size: var(--fs-micro);
  color: var(--camp-faint);
}

@media (max-width: 620px) {
  .picker {
    grid-template-columns: repeat(auto-fill, minmax(3.9rem, 1fr));
  }

  .chip {
    font-size: var(--fs-small);
    padding: var(--sp-2) var(--sp-1);
  }

  .days {
    grid-template-columns: repeat(auto-fit, minmax(4.2rem, 1fr));
  }

  .day__score {
    font-size: var(--fs-title);
  }
}

@media (prefers-reduced-motion: reduce) {
  .curve__line,
  .curve__area,
  .curve__dot,
  .day {
    animation: none;
    opacity: 1;
    stroke-dashoffset: 0;
    transform: none;
  }

  .chip::before {
    transition: none;
  }
}
</style>
