<script setup>
/**
 * 시도 아래 시군구 목록.
 *
 * 시도 하나는 너무 넓어서 "강원 46점"만으로는 어디로 갈지 정할 수 없다.
 * 시군구까지 내려가면 같은 도 안에서도 바람과 밤기온이 갈리는 게 보인다.
 *
 * 좌표를 이어 붙여 Open-Meteo 를 1콜만 쓴다. (시군구가 30곳이어도 1콜)
 * 미세먼지는 시군구 단위로 부르지 않고 시도 값을 물려받는다.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { NSkeleton, NEmpty } from 'naive-ui'
import municipalities from '@/data/koreaMunicipalities.json'
import { fetchSpotOutlook } from '@/api/openMeteoApi'
import {
  bonfireScore,
  bonfireGrade,
  campingStyle,
  effectiveWind,
} from '@/composables/useBonfireScore'
import { useTemperature } from '@/composables/useTemperature'

const props = defineProps({
  sidoCode: { type: String, required: true },
  parentPm10: { type: Number, default: 30 },
  selectedCode: { type: [String, null], default: null },
})

const emit = defineEmits(['select-district', 'loaded'])

const { unitSymbol, toDisplay } = useTemperature()

const spots = computed(() => municipalities.filter((m) => m.sido === props.sidoCode))

const RAMP = ['#8a5b33', '#a86633', '#c67434', '#e0853b', '#f59a4b']
const STOPS = [25, 40, 55, 70]

function rampColor(score) {
  let i = 0
  while (i < STOPS.length && score >= STOPS[i]) i += 1
  return RAMP[i]
}

const rows = ref([])
const loading = ref(false)
const error = ref('')

async function load() {
  if (!spots.value.length) return
  loading.value = true
  error.value = ''
  try {
    const raw = await fetchSpotOutlook(spots.value)
    rows.value = raw
      .map((spot) => {
        const withDust = { ...spot, pm10: props.parentPm10 }
        const score = bonfireScore(withDust)
        return { ...withDust, score, grade: bonfireGrade(score) }
      })
      .sort((a, b) => b.score - a.score)
    emit('loaded', rows.value)
  } catch (e) {
    error.value = '시군구 정보를 불러오지 못했습니다.'
    console.error('[시군구]', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.sidoCode, load)
</script>

<template>
  <div class="districts">
    <NSkeleton v-if="loading && !rows.length" :repeat="6" height="34px" :sharp="false" />

    <NEmpty v-else-if="error" :description="error" size="small" />

    <template v-else-if="rows.length">
      <p class="districts__lead">{{ rows.length }}개 시군구 · 지수가 높은 곳부터</p>

      <ul class="grid">
        <li v-for="row in rows" :key="row.code">
          <button
            class="cell"
            :class="{ 'cell--on': row.code === selectedCode }"
            type="button"
            @click="emit('select-district', row)"
          >
            <span class="cell__bar" :style="{ background: rampColor(row.score) }"></span>
            <span class="cell__name">{{ row.name }}</span>
            <span class="num cell__score">{{ row.score }}</span>
            <span class="cell__meta">
              밤 <span class="num">{{ toDisplay(row.nightLow) }}{{ unitSymbol }}</span> · 바람
              <span class="num">{{ effectiveWind(row) }}</span>
            </span>
            <span class="cell__style">{{ campingStyle(row).label }}</span>
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.districts__lead {
  margin-bottom: var(--sp-3);
  font-size: var(--fs-small);
  color: rgba(var(--camp-ink-rgb), 0.45);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 2px;
  list-style: none;
}

.cell {
  position: relative;
  display: grid;
  grid-template-columns: 3px 1fr auto;
  grid-template-areas:
    'bar name score'
    'bar meta meta'
    'bar style style';
  align-items: baseline;
  gap: var(--sp-0) var(--sp-2);
  width: 100%;
  padding: var(--sp-2) var(--sp-2) var(--sp-2) 0;
  border: 0;
  background: rgba(var(--camp-ink-rgb), 0.028);
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--dur-1);
}

.cell:hover {
  background: rgba(var(--camp-ink-rgb), 0.075);
}

.cell--on {
  background: rgba(var(--camp-ember-rgb), 0.16);
  box-shadow: inset 0 0 0 1px rgba(var(--camp-ember-rgb), 0.5);
}

.cell__bar {
  grid-area: bar;
  align-self: stretch;
}

.cell__name {
  grid-area: name;
  font-size: var(--fs-meta);
  font-weight: 600;
}

.cell__score {
  grid-area: score;
  font-size: var(--fs-body);
  font-weight: 700;
}

.cell__meta {
  grid-area: meta;
  font-size: var(--fs-micro);
  color: rgba(var(--camp-ink-rgb), 0.5);
}

.cell__style {
  grid-area: style;
  margin-top: var(--sp-0);
  font-size: var(--fs-micro);
  color: var(--camp-ember);
}
</style>
