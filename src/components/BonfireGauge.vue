<script setup>
/**
 * 모닥불 지수를 모닥불로 보여주는 게이지.
 *
 * 크기만 바꾸면 열일곱 개가 전부 같은 그림이 된다. 확대·축소는 눈에 잘 안 들어온다.
 * 그래서 **불의 모습 자체**를 등급에 따라 바꾼다.
 *
 *   연기만   잉걸불만 남고 불꽃은 밑동에서 겨우 흔들린다
 *   가물가물 한 갈래
 *   타닥타닥 두 갈래
 *   활활     세 갈래에 키도 제일 크고 불티가 튄다
 *
 * 갈래 수가 달라지면 곁눈으로도 갈린다. 그 위에 점수만큼 키가 더 자란다.
 *
 * 딱딱한 외곽선은 스티커처럼 보인다. 불은 물체가 아니라 빛이므로
 * 흐림(feGaussianBlur)을 얹고 뒤에 더 크게 번진 겹을 하나 깔아 빛처럼 만든다.
 * 장작만 또렷하게 남긴다 — 그건 실제로 물체다.
 */
import { computed, useId } from 'vue'

const props = defineProps({
  score: { type: Number, default: 0 },
  size: { type: Number, default: 60 },
})

// 한 화면에 여럿이 뜨므로 그라디언트·필터 id 가 겹치면 안 된다
const uid = useId()
const g = (name) => `${name}-${uid}`

const heat = computed(() => Math.min(1, Math.max(0, props.score / 100)))

// 모닥불 지수의 등급과 같은 눈금을 쓴다
const level = computed(() => {
  if (props.score >= 78) return 4
  if (props.score >= 58) return 3
  if (props.score >= 38) return 2
  return 1
})

// 불꽃이 자라는 정도. 등급 안에서도 점수만큼 더 큰다.
const lift = computed(() => {
  const grow = 0.42 + heat.value * 0.72
  // 연기만 남은 자리는 심지 하나뿐이라, 그것마저 낮춰야 "꺼져 간다" 로 읽힌다
  return (level.value === 1 ? grow * 0.62 : grow).toFixed(3)
})

const style = computed(() => ({
  width: `${props.size}px`,
  height: `${(props.size * 72) / 64}px`,
  '--glow': (0.1 + heat.value * 0.6).toFixed(2),
  // 잉걸불은 바닥이 있다. 불이 꺼져 가도 숯은 벌겋다.
  '--ember': (0.4 + heat.value * 0.55).toFixed(2),
}))

const SPARKS = [
  { x: 45, y: 14, r: 1.1 },
  { x: 20, y: 19, r: 0.9 },
  { x: 50, y: 24, r: 0.75 },
  { x: 16, y: 30, r: 0.7 },
  { x: 38, y: 7, r: 0.8 },
]
const sparks = computed(() => SPARKS.slice(0, [0, 0, 1, 3, 5][level.value]))
</script>

<template>
  <svg class="pit" :style="style" viewBox="0 0 64 72" fill="none" aria-hidden="true">
    <defs>
      <!-- 아래가 밝고 위로 갈수록 붉다. 밑동이 제일 뜨겁기 때문이다. -->
      <linearGradient :id="g('hot')" x1="32" y1="56" x2="32" y2="4" gradientUnits="userSpaceOnUse">
        <stop stop-color="#FFD87A" />
        <stop offset="0.24" stop-color="#FFA733" />
        <stop offset="0.55" stop-color="#F76B18" />
        <stop offset="0.82" stop-color="#E04710" />
        <stop offset="1" stop-color="#B8300C" />
      </linearGradient>
      <linearGradient
        :id="g('core')"
        x1="32"
        y1="56"
        x2="32"
        y2="28"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#FFFEF6" />
        <stop offset="0.35" stop-color="#FFF0C2" />
        <stop offset="0.72" stop-color="#FFD474" />
        <stop offset="1" stop-color="#FFAE33" />
      </linearGradient>
      <linearGradient
        :id="g('warmFlame')"
        x1="32"
        y1="56"
        x2="32"
        y2="16"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#FFE9A8" />
        <stop offset="0.45" stop-color="#FFC24F" />
        <stop offset="1" stop-color="#FF8A22" />
      </linearGradient>
      <radialGradient :id="g('warm')">
        <stop stop-color="#FF8A2B" stop-opacity="0.9" />
        <stop offset="1" stop-color="#FF8A2B" stop-opacity="0" />
      </radialGradient>
      <linearGradient :id="g('log')" x1="32" y1="50" x2="32" y2="62" gradientUnits="userSpaceOnUse">
        <stop stop-color="#6E4829" />
        <stop offset="0.45" stop-color="#432B19" />
        <stop offset="1" stop-color="#28180E" />
      </linearGradient>
      <linearGradient
        :id="g('log2')"
        x1="32"
        y1="43"
        x2="32"
        y2="53"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#573820" />
        <stop offset="1" stop-color="#301E0E" />
      </linearGradient>

      <!-- 불은 물체가 아니라 빛이다. 가장자리를 풀어 준다. -->
      <filter :id="g('soft')" x="-60%" y="-40%" width="220%" height="180%">
        <feGaussianBlur stdDeviation="0.22" />
      </filter>
      <filter :id="g('halo')" x="-80%" y="-50%" width="260%" height="200%">
        <feGaussianBlur stdDeviation="2.4" />
      </filter>

      <!-- 불꽃 갈래. 등급이 오를수록 하나씩 늘어난다. -->
      <g :id="g('flame')">
        <g :transform="`translate(32 55) scale(1 ${lift}) translate(-32 -55)`">
          <path
            v-if="level >= 2"
            d="M32 55C23 55 18 48 20 39C22 32 28 28 29 20C30 14 29 10 28 6C35 12 41 21 42 31C43 41 40 55 32 55Z"
            :fill="`url(#${g('hot')})`"
          />
          <path
            v-if="level >= 3"
            d="M44 55C40 55 38.5 51 39.5 46.5C40.5 42 43 40 44 35C47 40 49.5 45.5 48.5 50C47.8 53.2 46.5 55 44 55Z"
            :fill="`url(#${g('hot')})`"
          />
          <path
            v-if="level >= 4"
            d="M20 55C16.5 55 15 51.5 16 47.5C17 43.5 19 42 20 38C22.5 42 24.5 46 23.8 50C23.2 53 22 55 20 55Z"
            :fill="`url(#${g('hot')})`"
          />
          <!-- 겉불과 심지 사이 한 겹. 두 단만 있으면 색이 뚝 끊겨 밋밋하다. -->
          <path
            v-if="level >= 2"
            d="M32 55C26 55 23 50 24 43C25 37 29.5 34 30.5 27C31 23 31 20 30.5 17C35.5 22.5 39 29.5 39 36C39 46 36 55 32 55Z"
            :fill="`url(#${g('warmFlame')})`"
          />
          <path
            d="M32 55C28.5 55 27 51 28 46.5C29 42 31.2 40 32 35.5C33.6 40 36.4 43 36.4 47.5C36.4 51.4 34.6 55 32 55Z"
            :fill="`url(#${g('core')})`"
          />
        </g>
      </g>
    </defs>

    <!-- 바닥에 번지는 불빛 -->
    <ellipse
      cx="32"
      cy="59"
      rx="30"
      ry="11"
      :fill="`url(#${g('warm')})`"
      :opacity="style['--glow']"
    />

    <!-- 뒤 장작 -->
    <g transform="rotate(9 32 47)">
      <rect x="9" y="44" width="46" height="6.5" rx="3.25" :fill="`url(#${g('log2')})`" />
      <ellipse cx="54" cy="47.25" rx="1.4" ry="3.25" fill="#4A2F1A" />
    </g>

    <!-- 잉걸불. 불이 꺼져 가도 숯은 벌겋게 남는다. -->
    <ellipse
      cx="32"
      cy="53"
      rx="13"
      ry="4.5"
      :fill="`url(#${g('warm')})`"
      :opacity="style['--ember']"
    />

    <!-- 불꽃을 두 번 그린다. 뒤는 크게 번지게, 앞은 살짝만 풀어서. -->
    <use :href="`#${g('flame')}`" :filter="`url(#${g('halo')})`" opacity="0.42" />
    <use :href="`#${g('flame')}`" :filter="`url(#${g('soft')})`" />

    <!-- 불티. 잘 탈수록 많이 튄다. -->
    <g :opacity="style['--ember']">
      <circle
        v-for="s in sparks"
        :key="`${s.x}-${s.y}`"
        :cx="s.x"
        :cy="s.y"
        :r="s.r"
        fill="#FFCB6E"
      />
    </g>

    <!-- 앞 장작. 불꽃 위에 와야 불이 장작 사이에서 올라온다. -->
    <g transform="rotate(-5 32 56)">
      <rect x="11" y="52" width="42" height="8.5" rx="4.25" :fill="`url(#${g('log')})`" />
      <rect
        x="18"
        y="53.4"
        width="28"
        height="1.6"
        rx="0.8"
        fill="#C98545"
        :opacity="style['--ember']"
      />
      <ellipse cx="11.6" cy="56.25" rx="1.7" ry="4.25" fill="#54361F" />
      <ellipse cx="11.6" cy="56.25" rx="0.7" ry="2.4" fill="#3A2414" />
      <!-- 나뭇결. 민무늬로 두면 플라스틱처럼 보인다. -->
      <g stroke="#241509" stroke-width="0.5" stroke-linecap="round" opacity="0.55">
        <path d="M20 57.4H33" />
        <path d="M37 56.6H45.5" />
        <path d="M24 59H30" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.pit {
  display: block;
  flex-shrink: 0;
  overflow: visible;
}
</style>
