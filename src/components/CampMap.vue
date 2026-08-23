<script setup>
/**
 * 지역 안의 야영장을 지도에 찍는다.
 *
 * 목록만 보면 "반경 20km" 가 얼마나 되는 거리인지, 산 쪽인지 바다 쪽인지 감이 안 온다.
 *
 * 다만 점만 찍어 두면 어느 점이 어느 야영장인지 알 수 없어 지도가 장식이 된다.
 * 그래서 **아래 목록과 같은 번호**를 붙였다. 1번 점이 목록 1번이다.
 * 목록에 마우스를 올리면 그 점이 커지고, 점에 올리면 이름이 뜬다.
 *
 * 밑그림에는 지명을 남긴다. 글자를 다 지워 봤더니 검은 판에 선만 남아
 * "여기가 어디쯤" 을 알 수가 없었다. 번호 점이 충분히 세서 서로 싸우지 않는다.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  center: { type: Object, required: true }, // { lat, lon, name }
  camps: { type: Array, default: () => [] }, // 아래 목록과 같은 순서여야 한다
  picked: { type: Array, default: () => [] }, // 오늘 방식에 맞는 야영장 id
  radius: { type: Number, default: 20000 },
  activeId: { type: [String, Number, null], default: null },
})

const emit = defineEmits(['open-camp', 'hover-camp'])

const host = ref(null)
let map = null
let layer = null
let markers = new Map()

function draw() {
  if (!map) return
  layer?.remove()
  layer = L.layerGroup().addTo(map)
  markers = new Map()

  // 찾은 범위. 있는지 없는지만 알면 되므로 아주 옅은 점선으로 둔다.
  L.circle([props.center.lat, props.center.lon], {
    radius: props.radius,
    color: 'rgba(240,135,62,0.28)',
    weight: 1,
    dashArray: '3 5',
    fill: false,
    interactive: false,
  }).addTo(layer)

  // 지역(또는 시군구) 중심. 기준점이라는 것만 알면 되므로 십자와 작은 글씨로.
  L.marker([props.center.lat, props.center.lon], {
    icon: L.divIcon({
      className: 'pin-wrap',
      html: `<div class="here"><i></i><span>${props.center.name}</span></div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    }),
    interactive: false,
  }).addTo(layer)

  const points = []
  props.camps.forEach((camp, index) => {
    if (!camp.lat || !camp.lon) return
    const isPick = props.picked.includes(camp.id)
    const marker = L.marker([camp.lat, camp.lon], {
      icon: L.divIcon({
        className: 'pin-wrap',
        html: `<div class="camp-pin ${isPick ? 'camp-pin--pick' : ''}">
                 <span class="camp-pin__no">${index + 1}</span>
                 <span class="camp-pin__label">${camp.name}</span>
               </div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      }),
      title: camp.name,
      riseOnHover: true,
    })
    marker.on('click', () => emit('open-camp', camp))
    marker.on('mouseover', () => emit('hover-camp', camp.id))
    marker.on('mouseout', () => emit('hover-camp', null))
    marker.addTo(layer)
    markers.set(camp.id, marker)
    points.push([camp.lat, camp.lon])
  })

  /*
   * 야영장에 맞춰 확대한다. 예전에는 반경 원까지 넣고 맞춰서
   * 화면의 3분의 2가 아무것도 없는 땅이었다.
   */
  if (points.length) {
    map.fitBounds(L.latLngBounds(points), { padding: [56, 56], maxZoom: 13, animate: false })
  }
  syncActive()
}

// 목록에서 짚은 곳을 지도에서도 짚는다. 다시 그리지 않고 표시만 바꾼다.
function syncActive() {
  markers.forEach((marker, id) => {
    marker.getElement()?.firstChild?.classList.toggle('camp-pin--on', id === props.activeId)
  })
}

onMounted(() => {
  map = L.map(host.value, {
    center: [props.center.lat, props.center.lon],
    zoom: 10,
    zoomControl: false,
    scrollWheelZoom: false,
  })
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map)
  draw()
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})

watch(() => [props.camps, props.picked, props.center], draw, { deep: true })
watch(() => props.activeId, syncActive)
</script>

<template>
  <div class="campmap">
    <div ref="host" class="campmap__canvas"></div>
    <p class="campmap__legend">
      번호는 아래 목록 순서와 같습니다
      <span class="campmap__key campmap__key--pick">오늘 방식에 맞는 곳</span>
      <span class="campmap__key campmap__key--ring">찾은 범위</span>
    </p>
  </div>
</template>

<style scoped>
.campmap__canvas {
  height: 420px;
  width: 100%;
  overflow: hidden;
}

/* 지도만 두면 무엇을 보는 건지 알 수 없다. 읽는 법을 한 줄로 붙인다. */
.campmap__legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-4);
  padding-top: var(--sp-2);
  font-size: var(--fs-micro);
  color: rgba(var(--camp-ink-rgb), 0.42);
}

.campmap__key {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.campmap__key::before {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.campmap__key--pick::before {
  background: var(--camp-ember);
}

.campmap__key--ring::before {
  border-radius: 0;
  border-top: 1px dashed rgba(var(--camp-ember-rgb), 0.6);
  height: 0;
  width: 14px;
}

@media (max-width: 560px) {
  .campmap__canvas {
    height: 300px;
  }
}
</style>

<style>
/* 기준점. 눈에 띄면 야영장 번호와 헷갈리므로 십자와 작은 글씨로만 둔다. */
.here {
  position: relative;
}

.here i {
  position: absolute;
  left: -5px;
  top: -5px;
  width: 10px;
  height: 10px;
  background:
    linear-gradient(var(--camp-ember), var(--camp-ember)) center / 1px 100% no-repeat,
    linear-gradient(var(--camp-ember), var(--camp-ember)) center / 100% 1px no-repeat;
  opacity: 0.8;
}

.here span {
  position: absolute;
  left: 9px;
  top: -8px;
  font-size: var(--fs-micro);
  font-weight: 700;
  color: var(--camp-ember);
  white-space: nowrap;
  text-shadow:
    0 0 3px #000,
    0 0 3px #000;
}

/* 번호 있는 점. 목록과 이어 주는 유일한 끈이라 읽히는 게 제일 중요하다. */
.camp-pin {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid rgba(var(--camp-ember-rgb), 0.55);
  background: rgba(12, 18, 16, 0.88);
  cursor: pointer;
  transition:
    transform var(--dur-1) var(--ease),
    background var(--dur-1);
}

.camp-pin__no {
  font-family: var(--font-data);
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(var(--camp-ink-rgb), 0.9);
}

.camp-pin--pick {
  border-color: var(--camp-ember);
  background: var(--camp-ember);
}

.camp-pin--pick .camp-pin__no {
  color: var(--camp-on-ember);
}

.camp-pin:hover,
.camp-pin--on {
  transform: scale(1.28);
  z-index: 500;
}

.camp-pin--on {
  box-shadow: 0 0 0 5px rgba(var(--camp-ember-rgb), 0.25);
}

.camp-pin__label {
  position: absolute;
  left: 31px;
  top: 3px;
  padding: var(--sp-0) var(--sp-2);
  background: rgba(12, 18, 16, 0.92);
  color: rgba(var(--camp-ink-rgb), 0.92);
  font-size: var(--fs-micro);
  white-space: nowrap;
  opacity: 0;
  transition: opacity var(--dur-1);
  pointer-events: none;
}

.camp-pin:hover .camp-pin__label,
.camp-pin--on .camp-pin__label {
  opacity: 1;
}
</style>
