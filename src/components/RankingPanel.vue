<script setup>
/**
 * 기준별 순위 판.
 *
 * 날씨 화면의 세 번째 보기 모드로 들어간다. 지도·목록과 같은 질문("어디가 좋나")을
 * 정렬로 답하는 자리라, 따로 떨어진 화면으로 두면 같은 걸 두 번 묻는 꼴이 된다.
 *
 * 한 줄씩 쌓는 표를 버리고 바둑판으로 깐다. 칸마다 그 지역의 모닥불이 실제로 타고,
 * 잘 타는 곳일수록 칸이 밝다. 열일곱 칸을 한눈에 보면 어두운 들판에 불이 흩어져 있는
 * 모양이 되는데, 그게 이 사이트가 하려는 말이다.
 *
 * 1위는 두 칸 × 두 줄을 쓴다. 열일곱 칸 중 하나만 다르면 눈이 갈 데가 생긴다.
 * (다섯 열일 때 1위 4칸 + 나머지 16칸 = 20칸으로 판이 정확히 맞아떨어진다)
 */
import { computed, onMounted, ref } from 'vue'
import { NSelect, NSkeleton, NEmpty } from 'naive-ui'
import BaseDashboardCard from '@/components/BaseDashboardCard.vue'
import BonfireGauge from '@/components/BonfireGauge.vue'
import { useWeatherStore } from '@/stores/weatherStore'
import { useTemperature } from '@/composables/useTemperature'
import {
  weakestLink,
  campingStyle,
  effectiveWind,
  bonfireGrade,
  scoreParts,
} from '@/composables/useBonfireScore'

const emit = defineEmits(['close', 'pick'])

const weatherStore = useWeatherStore()
const { unitSymbol, toDisplay } = useTemperature()

onMounted(() => weatherStore.load())

const metric = ref('score')

const METRICS = {
  score: { label: '모닥불 지수', asc: false },
  rainProb: { label: '비', asc: true },
  wind: { label: '바람', asc: true },
  nightLow: { label: '밤 기온', asc: true },
  elevation: { label: '해발고도', asc: false },
}

const METRIC_OPTIONS = Object.entries(METRICS).map(([value, info]) => ({
  value,
  label: info.label,
}))

const current = computed(() => METRICS[metric.value])

const pool = computed(() => weatherStore.scoredCities)

const rankedList = computed(() => {
  const sign = current.value.asc ? 1 : -1
  return [...pool.value].sort((a, b) => (a[metric.value] - b[metric.value]) * sign)
})

// 첫 칸은 크게 쓴다
const lead = computed(() => rankedList.value[0] ?? null)
const rest = computed(() => rankedList.value.slice(1))

/*
 * 큰 숫자 자리는 늘 모닥불 지수다. 정렬 기준이 바뀌어도 이 판이 답하는 건 지수이고,
 * 기준은 순서를 정할 뿐이다. 대신 다른 기준으로 세웠을 때는 그 값을 아래에 따로 적는다 —
 * 안 그러면 왜 이 순서인지 알 수 없다.
 */
function sortedBy(city) {
  if (metric.value === 'score') return null
  if (metric.value === 'rainProb') return `강수확률 ${city.rainProb}%`
  if (metric.value === 'wind') return `바람 ${effectiveWind(city)}m/s`
  if (metric.value === 'nightLow') return `밤 최저 ${toDisplay(city.nightLow)}${unitSymbol.value}`
  return `해발 ${city.elevation}m`
}

// 왜 이 점수인지. 가장 많이 깎은 요소와 깎인 폭을 함께 적는다.
function why(city) {
  const weak = weakestLink(city)
  return weak ? `${weak.key} −${weak.lost}점 · ${weak.label}` : '감점 없음'
}

/*
 * 1위 칸에는 점수를 요소별로 펼쳐 놓는다.
 * 이 판에서 "왜 이 점수인지" 를 끝까지 답하는 자리는 여기뿐이다.
 * 막대 길이가 배점 중 받은 몫이고, 짧은 줄이 오늘 발목을 잡은 요소다.
 */
const leadParts = computed(() => (lead.value ? scoreParts(lead.value) : []))

// 칸이 밝을수록 잘 타는 곳. 불빛이 칸 안으로 번지는 정도를 점수에서 뽑는다.
function litness(city) {
  return { '--lit': (0.06 + Math.min(1, city.score / 100) * 0.4).toFixed(3) }
}

// 여기서 바로 넘기지 않는다. 시군구를 고르는 건 화면 쪽이 맡는다.
function goDetail(city) {
  emit('pick', city)
}
</script>

<template>
  <BaseDashboardCard title="오늘의 모닥불 지수">
    <template #actions>
      <button class="switch" type="button" @click="emit('close')">지도 보기</button>
      <NSelect
        v-model:value="metric"
        class="sort"
        :options="METRIC_OPTIONS"
        size="small"
        :consistent-menu-width="false"
      />
    </template>

    <div v-if="weatherStore.loading && !rankedList.length" class="board">
      <NSkeleton v-for="n in 12" :key="n" height="11rem" :sharp="true" />
    </div>

    <NEmpty v-else-if="!rankedList.length" description="아직 불러온 지역이 없습니다" size="small" />

    <ol v-else class="board">
      <!-- 1위. 두 칸 두 줄을 쓰고 불도 두 배로 크다. -->
      <li
        v-if="lead"
        class="tile tile--lead rise"
        :style="litness(lead)"
        role="button"
        tabindex="0"
        @click="goDetail(lead)"
        @keyup.enter="goDetail(lead)"
      >
        <div class="lead__head">
          <span class="tile__eyebrow">오늘 1위</span>
          <h3 class="lead__name">
            {{ lead.name }}
          </h3>
          <p class="lead__note">
            {{ bonfireGrade(lead.score).note }} · {{ campingStyle(lead).label }}
          </p>
        </div>

        <div class="lead__mark">
          <span class="num lead__score">{{ lead.score }}</span>
          <span class="lead__grade">{{ bonfireGrade(lead.score).label }}</span>
        </div>

        <ul class="parts">
          <li v-for="part in leadParts" :key="part.key" class="part">
            <span class="part__key">{{ part.key }}</span>
            <span class="part__track">
              <span
                class="part__fill"
                :style="{
                  transform: `scaleX(${part.got / part.max})`,
                  opacity: 0.4 + (part.got / part.max) * 0.6,
                }"
              ></span>
            </span>
            <span class="num part__label">{{ part.short }}</span>
            <span class="num part__got"
              >{{ part.got }}<i>/{{ part.max }}</i></span
            >
          </li>
        </ul>

        <BonfireGauge class="lead__fire" :score="lead.score" :size="146" />
      </li>

      <li
        v-for="(city, index) in rest"
        :key="city.id"
        class="tile rise"
        :style="litness(city)"
        role="button"
        tabindex="0"
        @click="goDetail(city)"
        @keyup.enter="goDetail(city)"
      >
        <span class="tile__eyebrow num">{{ index + 2 }}</span>

        <span class="tile__head">
          <span class="tile__name">
            {{ city.name }}
          </span>
          <span class="num tile__score">{{ city.score }}</span>
        </span>

        <span class="tile__grade">
          {{ bonfireGrade(city.score).label }} · {{ campingStyle(city).label }}
        </span>
        <span class="tile__why">{{ why(city) }}</span>
        <span v-if="sortedBy(city)" class="num tile__sorted">{{ sortedBy(city) }}</span>

        <BonfireGauge class="tile__fire" :score="city.score" :size="80" />
      </li>
    </ol>
  </BaseDashboardCard>
</template>

<style scoped>
/* 지도·목록 카드의 전환 버튼과 같은 모양 */
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

.sort {
  width: 8.4rem;
}

/*
 * 칸 사이는 2px 만 띄운다. 넓게 벌리면 카드 열일곱 장이 되고,
 * 붙이면 불이 흩어져 있는 판 하나가 된다. 여기서는 판 하나가 맞다.
 */
.board {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15.5rem, 1fr));
  gap: 2px;
  list-style: none;
}

.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-height: 11rem;
  padding: var(--sp-4) var(--sp-4) var(--sp-2);
  background: var(--camp-surface);
  cursor: pointer;
  transition: background var(--dur-1) var(--ease-inout);
}

/* 불빛이 칸 아래에서 번져 올라온다. 잘 타는 곳일수록 밝다. */
.tile::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    120% 78% at 50% 118%,
    rgba(var(--camp-ember-rgb), 0.9) 0%,
    rgba(var(--camp-ember-rgb), 0) 70%
  );
  opacity: var(--lit);
  transition: opacity var(--dur-2) var(--ease-inout);
}

.tile:hover {
  background: var(--camp-surface-2);
}

.tile:hover::after {
  opacity: calc(var(--lit) * 1.45);
}

.tile:focus-visible {
  outline: 2px solid var(--camp-ember);
  outline-offset: -2px;
}

/* 글과 불은 불빛 위에 온다 */
.tile > * {
  position: relative;
  z-index: 1;
}

.tile__eyebrow {
  font-size: var(--fs-micro);
  letter-spacing: 0.08em;
  color: rgba(var(--camp-ink-rgb), 0.38);
}

.tile__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-2);
}

.tile__name {
  font-size: var(--fs-lead);
  font-weight: 700;
  letter-spacing: -0.03em;
}
.tile__score {
  font-size: var(--fs-title);
  font-weight: 800;
  letter-spacing: -0.04em;
}

.tile__grade {
  font-size: var(--fs-small);
  color: var(--camp-ember);
}

.tile__why {
  font-size: var(--fs-micro);
  color: rgba(var(--camp-ink-rgb), 0.45);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 다른 기준으로 세웠을 때만 나온다 */
.tile__sorted {
  margin-top: var(--sp-1);
  font-size: var(--fs-micro);
  color: var(--camp-muted);
}

/*
 * 불은 칸 아래 한가운데. 글은 위, 불은 아래 — 앉아서 보는 자리와 같은 배치다.
 * 음수 여백으로 칸 밖에 걸치면 마지막 줄에서 판 밖으로 잘려 나간다.
 */
.tile__fire {
  margin: auto auto 0;
}

/* ── 1위 칸 ──────────────────────────────────── */
/*
 * 1위 칸은 두 열 두 줄로 나눈다.
 * 위: 이름과 점수 / 아래: 배점 막대와 모닥불.
 * 한 덩이씩 세로로 쌓으면 넓은 칸에서 귀퉁이가 비고 가운데가 뚫린다.
 */
.tile--lead {
  grid-column: span 2;
  grid-row: span 2;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto 1fr;
  column-gap: var(--sp-5);
  row-gap: var(--sp-4);
  padding: var(--sp-5);
}

.lead__head {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
}

.lead__mark {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.lead__fire {
  align-self: end;
  justify-self: center;
}

.lead__name {
  font-size: var(--fs-display);
  font-weight: 800;
  letter-spacing: -0.04em;
}

.lead__note {
  font-size: var(--fs-body);
  color: var(--camp-ember);
}

/*
 * 배점 막대. 다섯 줄이 남는 세로를 나눠 가져서 왼쪽 칸이 비지 않는다.
 * 길이는 미리 박아 두고 늘어나는 것만 scaleX 로 한다 —
 * keyframe 안에서는 var() 로 준 width 가 해석되지 않는다.
 */
.parts {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--sp-2);
  list-style: none;
}

.part {
  display: grid;
  /*
   * 칸 너비를 고정한다. auto 로 두면 줄마다 값 길이가 달라
   * 막대 칸이 줄마다 다른 폭으로 짓눌린다 (실측: 0~32px 로 제각각).
   */
  grid-template-columns: 2rem 1fr 3.6rem 2.8rem;
  align-items: center;
  gap: var(--sp-2);
}

.part__key {
  font-size: var(--fs-small);
  color: var(--camp-muted);
}

.part__track {
  height: 6px;
  background: rgba(var(--camp-ink-rgb), 0.09);
}

.part__fill {
  display: block;
  height: 100%;
  background: var(--camp-ember);
  transform-origin: left;
  /* to 를 안 쓰면 요소에 박힌 값이 끝점이 된다. keyframe 에 var() 를 넣지 않아도 된다. */
  animation: grow var(--dur-3) var(--ease) backwards;
}

@keyframes grow {
  from {
    transform: scaleX(0);
  }
}

.part__label {
  font-size: var(--fs-micro);
  color: rgba(var(--camp-ink-rgb), 0.42);
  text-align: right;
  white-space: nowrap;
}

.part__got {
  font-size: var(--fs-small);
  font-weight: 700;
  text-align: right;
}

.part__got i {
  font-style: normal;
  font-weight: 400;
  color: rgba(var(--camp-ink-rgb), 0.35);
}

/* 좁아지면 1위도 한 칸씩 쓰고 위아래로 쌓는다 */
/* 두 줄을 차지할 만큼 세로가 남지 않는다. 한 줄만 쓰고 옆으로 두 칸 */
@media (max-width: 900px) {
  .tile--lead {
    grid-row: auto;
    column-gap: var(--sp-4);
  }
}

/*
 * 한 열이 되면 1위도 위아래로 쌓는다.
 * 옆에 불을 세워 두면 남는 폭이 164px 뿐이라 배점 막대가 6px 로 짓눌린다.
 */
@media (max-width: 560px) {
  .board {
    grid-template-columns: 1fr;
  }

  .tile--lead {
    grid-column: auto;
    grid-template-rows: auto auto auto;
  }

  .parts,
  .lead__fire {
    grid-column: 1 / -1;
  }
}
</style>
