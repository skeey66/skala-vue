<script setup>
/**
 * 전국 시도를 모닥불 지수로 칠한 지도.
 *
 * 값의 크기를 나타내므로 색은 무지개가 아니라 한 가지 색의 단계로 간다.
 * 불이 약한 곳은 어둡고 잘 타는 곳은 밝다. 은유가 그대로 눈금이 된다.
 * 다섯 단계 모두 지도 바탕(#0d1512) 대비 3.2:1 이상이고 밝기가 단조 증가한다.
 *
 * 경계는 통계청 2018 시도 경계를 단순화한 것(7.5MB → 79KB).
 * 그 위에 OpenWeatherMap 날씨 타일을 겹쳐 비구름 위치를 같이 본다.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import provinces from '@/data/koreaProvinces.json'

const props = defineProps({
  cities: { type: Array, required: true },
  selectedId: { type: [String, null], default: null },
})

const emit = defineEmits(['select-city', 'open-city'])

const host = ref(null)
let map = null
let shapeLayer = null
let labelLayer = null
let weatherLayer = null
let resizeWatcher = null

function fitKorea() {
  if (!map || !shapeLayer) return
  map.fitBounds(shapeLayer.getBounds(), { padding: [18, 18], animate: false })
}

/*
 * 지역을 고르면 그 도형에 맞춰 들어간다.
 * 전국을 띄워 둔 채로는 "서울을 골랐다" 가 색 하나로만 표시돼서 잘 안 읽힌다.
 * 고른 것을 풀면 다시 한반도 전체로 돌아온다.
 */
function fitSelected() {
  if (!map || !shapeLayer) return
  if (!props.selectedId) return fitKorea()

  const code = props.cities.find((city) => city.id === props.selectedId)?.code
  const target = code && shapeLayer.getLayers().find((l) => l.feature?.properties?.code === code)
  if (!target) return fitKorea()
  map.fitBounds(target.getBounds(), { padding: [40, 40], animate: true })
}

/*
 * 모닥불 지수 램프. 꺼진 숯에서 타오르는 불꽃까지.
 *
 * 예전 램프는 이웃한 칸끼리 명도 대비가 1.27:1 밖에 안 돼서 색이 갈리지 않았다.
 * 폭을 넓혀 1.56~1.79:1 로 벌렸다. 명도는 0.036 → 0.608 로 오른다.
 */
const RAMP = ['#4a2f18', '#7d4820', '#b56a28', '#e39237', '#ffc266']
// 눈금은 절대값이다. 오늘 잘 나온 지역이 실제로 잘 나온 것이지,
// 다른 지역보다 나은 것이 아니다. 여름 밤은 점수가 낮은 쪽에 몰려
// 그 구간을 촘촘하게 잡았다.
const STOPS = [25, 40, 55, 70]

function rampColor(score) {
  let i = 0
  while (i < STOPS.length && score >= STOPS[i]) i += 1
  return RAMP[i]
}

const LAYERS = {
  none: { label: '없음', id: '' },
  precipitation_new: { label: '강수', id: 'precipitation_new' },
  clouds_new: { label: '구름', id: 'clouds_new' },
  wind_new: { label: '바람', id: 'wind_new' },
}
const overlay = ref('none')

// 시도 코드 → 지역 데이터
const byCode = computed(() => {
  const map = {}
  props.cities.forEach((city) => {
    if (city.code) map[city.code] = city
  })
  return map
})

function styleFor(code) {
  const city = byCode.value[code]
  if (!city) {
    return { fillColor: '#1b2723', fillOpacity: 0.55, color: '#2c3d36', weight: 0.8 }
  }
  const selected = city.id === props.selectedId
  return {
    fillColor: rampColor(city.score),
    fillOpacity: selected ? 1 : city.id === topId.value ? 0.95 : 0.82,
    className: city.id === topId.value ? 'sido--top' : '',
    color: selected ? '#f2e3c0' : 'rgba(10,18,15,0.85)',
    weight: selected ? 1.8 : 0.9,
  }
}

function drawShapes() {
  if (!map) return
  shapeLayer?.remove()
  labelLayer?.remove()
  labelLayer = L.layerGroup().addTo(map)

  shapeLayer = L.geoJSON(provinces, {
    style: (feature) => styleFor(feature.properties.code),
    onEachFeature: (feature, layer) => {
      const city = byCode.value[feature.properties.code]
      if (!city) return

      layer.on('click', () => emit('select-city', city))
      layer.on('dblclick', () => emit('open-city', city))
      layer.on('mouseover', () => layer.setStyle({ fillOpacity: 1, weight: 1.6 }))
      layer.on('mouseout', () => layer.setStyle(styleFor(feature.properties.code)))
      layer.bindTooltip(
        `<b>${city.name}</b> ${city.score}점 · ${city.grade.label}<br>밤 최저 ${city.nightLow}℃ · 비 ${city.rainProb}%`,
        { direction: 'top', className: 'sido-tip', sticky: true },
      )
    },
  }).addTo(map)

  // 이름과 점수는 도형 위에 직접 얹는다. 색만으로 읽게 두지 않는다.
  props.cities.forEach((city) => {
    if (!city.code) return
    L.marker([city.lat, city.lon], {
      interactive: false,
      icon: L.divIcon({
        className: 'sido-wrap',
        html: `<div class="sido"><b>${city.name}</b><span class="num">${city.score}</span></div>`,
        iconSize: [46, 26],
        iconAnchor: [23, 13],
      }),
    }).addTo(labelLayer)
  })
}

function drawOverlay() {
  if (!map) return
  weatherLayer?.remove()
  weatherLayer = null
  const layer = LAYERS[overlay.value]
  if (!layer?.id) return
  weatherLayer = L.tileLayer(`/api/owmtile/${layer.id}/{z}/{x}/{y}.png`, {
    opacity: 0.5,
    maxZoom: 12,
  }).addTo(map)
}

onMounted(() => {
  /*
   * 한반도에 고정한다. 옮기거나 확대할 일이 없는 그림이고,
   * 움직일 수 있으면 엉뚱한 데로 가서 되돌리는 방법을 찾게 된다.
   */
  map = L.map(host.value, {
    center: [36.35, 127.9],
    zoom: 7,
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false,
    boxZoom: false,
    keyboard: false,
    zoomSnap: 0.25,
  })
  L.control
    .attribution({ position: 'bottomleft', prefix: false })
    .addAttribution('통계청 시도경계')
    .addTo(map)

  drawOverlay()
  drawShapes()

  /*
   * 움직이지 않는 지도라 한반도가 틀을 꽉 채우게 맞춘다.
   * 고정 zoom 을 쓰면 화면 폭에 따라 여백이 크게 남는다.
   */
  fitKorea()
  resizeWatcher = new ResizeObserver(() => {
    map?.invalidateSize()
    fitSelected()
  })
  resizeWatcher.observe(host.value)
})

onBeforeUnmount(() => {
  resizeWatcher?.disconnect()
  map?.remove()
  map = null
})

watch(
  () => [props.cities, props.selectedId],
  () => {
    drawShapes()
    fitSelected()
  },
  { deep: true },
)
watch(overlay, drawOverlay)

// 범례
const legend = computed(() => RAMP.map((color) => ({ color })))

// 오늘 1위. 지도에서 눈이 먼저 닿을 자리를 하나 만든다.
const topId = computed(() => [...props.cities].sort((a, b) => b.score - a.score)[0]?.id ?? null)

// 오늘 점수가 어느 폭에 걸쳐 있는지. 지도가 밋밋하면 그게 오늘의 사실이다.
const range = computed(() => {
  const scores = props.cities.map((c) => c.score).filter((n) => Number.isFinite(n))
  if (!scores.length) return null
  return { low: Math.min(...scores), high: Math.max(...scores) }
})
</script>

<template>
  <div class="map">
    <div ref="host" class="map__canvas"></div>

    <div class="map__layers">
      <button
        v-for="(info, key) in LAYERS"
        :key="key"
        class="map__layer"
        :class="{ 'map__layer--on': overlay === key }"
        type="button"
        @click="overlay = key"
      >
        {{ info.label }}
      </button>
    </div>

    <!-- 범례. 색이 무엇을 뜻하는지 지도 안에서 읽힌다. -->
    <div class="legend">
      <span class="legend__cap">모닥불 지수</span>
      <span class="legend__ramp">
        <span
          v-for="step in legend"
          :key="step.color"
          class="legend__step"
          :style="{ background: step.color }"
        ></span>
      </span>
      <span class="legend__ends"><span>약함</span><span>활활</span></span>
      <span v-if="range" class="legend__range">
        오늘 <b class="num">{{ range.low }}</b
        >–<b class="num">{{ range.high }}</b
        >점
      </span>
    </div>
  </div>
</template>

<style scoped>
.map {
  position: relative;
  overflow: hidden;
  background: var(--camp-map-bg);
}

/* 1위 지역. 불이 붙은 것처럼 은은하게 번진다. */
:deep(.sido--top) {
  filter: drop-shadow(0 0 6px rgba(var(--camp-ember-rgb), 0.55));
  animation: ember 4.5s var(--ease-inout) infinite;
}

@keyframes ember {
  0%,
  100% {
    filter: drop-shadow(0 0 5px rgba(var(--camp-ember-rgb), 0.4));
  }
  50% {
    filter: drop-shadow(0 0 11px rgba(var(--camp-ember-rgb), 0.7));
  }
}

.map__canvas {
  height: 520px;
  width: 100%;
}

.map__layers {
  position: absolute;
  top: 0.6rem;
  left: 0.6rem;
  z-index: 500;
  display: flex;
  gap: var(--sp-1);
  padding: var(--sp-1);
  border-radius: 3px;
  background: rgba(var(--camp-shade-rgb), 0.82);
  backdrop-filter: blur(8px);
}

.map__layer {
  padding: var(--sp-1) var(--sp-2);
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: rgba(var(--camp-ink-rgb), 0.5);
  font-family: inherit;
  font-size: var(--fs-small);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.map__layer--on {
  background: rgba(var(--camp-ember-rgb), 0.9);
  color: var(--camp-on-ember);
  font-weight: 700;
}

/* 범례 */
.legend {
  position: absolute;
  right: 0.6rem;
  top: 0.6rem;
  z-index: 500;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-2);
  border-radius: 3px;
  background: rgba(var(--camp-shade-rgb), 0.82);
  backdrop-filter: blur(8px);
}

.legend__cap {
  font-size: var(--fs-micro);
  color: rgba(var(--camp-ink-rgb), 0.55);
}

.legend__ramp {
  display: flex;
  gap: 2px;
}

.legend__step {
  width: 18px;
  height: 7px;
  border-radius: 1px;
}

.legend__ends {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-micro);
  color: rgba(var(--camp-ink-rgb), 0.4);
}

.legend__range {
  margin-top: var(--sp-0);
  padding-top: var(--sp-1);
  border-top: 1px solid rgba(var(--camp-ink-rgb), 0.12);
  font-size: var(--fs-micro);
  color: rgba(var(--camp-ink-rgb), 0.5);
}

.legend__range b {
  color: var(--camp-text);
}

@media (max-width: 560px) {
  /* 1위 지역. 불이 붙은 것처럼 은은하게 번진다. */
  :deep(.sido--top) {
    filter: drop-shadow(0 0 6px rgba(var(--camp-ember-rgb), 0.55));
    animation: ember 4.5s var(--ease-inout) infinite;
  }

  @keyframes ember {
    0%,
    100% {
      filter: drop-shadow(0 0 5px rgba(var(--camp-ember-rgb), 0.4));
    }
    50% {
      filter: drop-shadow(0 0 11px rgba(var(--camp-ember-rgb), 0.7));
    }
  }

  .map__canvas {
    height: 400px;
  }
}
</style>

<!-- Leaflet 이 지도 바깥에 붙이는 요소들 -->
<style>
.sido-wrap {
  background: none !important;
  border: 0 !important;
}

.sido {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
  /* 밝은 칸 위에서도 흰 글자가 읽히도록 검은 테두리를 두른다 */
  text-shadow:
    0 0 3px rgba(6, 12, 10, 0.95),
    0 1px 2px rgba(6, 12, 10, 1),
    0 -1px 2px rgba(6, 12, 10, 1),
    1px 0 2px rgba(6, 12, 10, 1),
    -1px 0 2px rgba(6, 12, 10, 1);
  pointer-events: none;
}

.sido b {
  font-size: var(--fs-micro);
  font-weight: 700;
  color: var(--camp-text);
}

.sido .num {
  font-size: var(--fs-micro);
  color: rgba(var(--camp-ink-rgb), 0.75);
}

.sido-tip {
  background: rgba(var(--camp-shade-rgb), 0.94) !important;
  border: 1px solid rgba(var(--camp-ink-rgb), 0.14) !important;
  color: var(--camp-text) !important;
  font-size: var(--fs-small) !important;
  border-radius: 3px !important;
  box-shadow: none !important;
}

.sido-tip::before {
  border-top-color: rgba(var(--camp-ink-rgb), 0.14) !important;
}

.leaflet-container {
  background: var(--camp-map-bg);
  font-family: inherit;
}

.leaflet-control-attribution {
  background: rgba(var(--camp-shade-rgb), 0.6) !important;
  color: rgba(var(--camp-ink-rgb), 0.32) !important;
  font-size: var(--fs-micro) !important;
}

.leaflet-control-zoom a {
  background: rgba(var(--camp-shade-rgb), 0.85) !important;
  border-color: rgba(var(--camp-ink-rgb), 0.12) !important;
  color: rgba(var(--camp-ink-rgb), 0.75) !important;
}

.leaflet-control-zoom a:hover {
  background: var(--camp-surface-2) !important;
}
</style>
