<script setup>
/**
 * 지역 타일 한 장.
 *
 * 근처 야영장 실제 사진을 배경으로 깔고 그 위에 관측값을 얹는다.
 * 색은 사진이 맡고, UI 는 흰 글자와 얇은 선만 쓴다.
 * 등급 색은 점수 옆 점 하나에만 남겨 화면이 알록달록해지지 않게 했다.
 *
 * 타일을 누르면 바로 상세로 간다. 예전에는 [상세] 버튼을 따로 뒀는데,
 * 카드 전체가 이미 눌리는 자리라 버튼이 같은 일을 두 번 말하고 있었다.
 * 관심 별표만 @click.stop 으로 버블링을 끊는다.
 */
import { computed } from 'vue'
import { NTooltip } from 'naive-ui'
import { useTemperature } from '@/composables/useTemperature'
import { sleepingBag, windNote, effectiveWind, campingStyle } from '@/composables/useBonfireScore'
import { iconUrl } from '@/api/openWeatherApi'

const props = defineProps({
  city: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})

defineEmits(['click-detail'])

const { unitSymbol, toDisplay } = useTemperature()

const displayTemp = computed(() => toDisplay(props.city.temp))
const displayNightLow = computed(() => toDisplay(props.city.nightLow))
const bag = computed(() => sleepingBag(props.city.nightLow))
const wind = computed(() => windNote(props.city))
const gust = computed(() => effectiveWind(props.city))
const style = computed(() => campingStyle(props.city))

const GRADE_COLOR = {
  best: '#f0873e',
  good: '#7cc490',
  fair: '#e3b341',
  poor: '#d9634b',
}
const gradeColor = computed(() => GRADE_COLOR[props.city.grade.tone])

// 사진이 있으면 배경으로, 없으면 어두운 판으로
const tileStyle = computed(() =>
  props.city.photo ? { backgroundImage: `url(${props.city.photo})` } : {},
)
</script>

<template>
  <article
    class="tile"
    :class="{ 'tile--selected': selected, 'tile--photo': city.photo }"
    role="button"
    tabindex="0"
    @click="$emit('click-detail', city)"
    @keyup.enter="$emit('click-detail', city)"
  >
    <div class="tile__photo" :style="tileStyle"></div>
    <div class="tile__veil"></div>

    <div class="tile__body">
      <header class="tile__head">
        <div>
          <h3 class="tile__name">{{ city.name }}</h3>
          <p class="tile__region">{{ city.region }}</p>
        </div>
      </header>

      <div class="tile__score">
        <span class="num tile__score-value">{{ city.score }}</span>
        <span class="tile__grade">
          <span class="tile__dot" :style="{ background: gradeColor }"></span>
          {{ city.grade.label }}
        </span>
        <img
          v-if="city.icon"
          class="tile__icon"
          :src="iconUrl(city.icon)"
          :alt="city.status"
          width="34"
          height="34"
          loading="lazy"
        />
      </div>

      <!-- 점수를 채운 막대 하나. 색은 등급 하나만 따른다. -->
      <div class="tile__meter">
        <span :style="{ width: `${city.score}%`, background: gradeColor }"></span>
      </div>

      <NTooltip trigger="hover" placement="top">
        <template #trigger>
          <dl class="tile__stats">
            <div>
              <dt>밤 최저</dt>
              <dd class="num">{{ displayNightLow }}{{ unitSymbol }}</dd>
            </div>
            <div>
              <dt>비</dt>
              <dd class="num">{{ city.rainProb }}%</dd>
            </div>
            <div>
              <dt>바람</dt>
              <dd class="num">{{ gust }}<small>m/s</small></dd>
            </div>
          </dl>
        </template>
        {{ bag.label }} · {{ wind.label }} · 지금 {{ displayTemp }}{{ unitSymbol }}
        {{ city.status }}
      </NTooltip>

      <footer class="tile__foot">
        <span class="tile__note">
          <span class="tile__style">{{ style.label }}</span>
        </span>
        <span class="tile__more" aria-hidden="true">→</span>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.tile {
  position: relative;
  isolation: isolate;
  display: flex;
  min-height: 232px;
  overflow: hidden;
  background: var(--camp-surface);
  cursor: pointer;
  transition:
    transform 0.2s var(--ease),
    box-shadow 0.2s ease;
}

.tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(var(--camp-shade-rgb), 0.45);
}

.tile--selected {
  box-shadow: inset 0 0 0 1px var(--camp-star);
}

/* 사진 */
.tile__photo {
  position: absolute;
  inset: 0;
  z-index: -2;
  background-size: cover;
  background-position: center;
  /* 사진마다 밝기와 색이 제각각이다. 톤을 눌러 타일이 한 벌로 보이게 한다. */
  filter: var(--camp-photo-filter);
  transition: transform var(--dur-3) var(--ease);
}

.tile:hover .tile__photo {
  transform: scale(1.05);
}

/* 사진 위에 깔아 글자를 읽히게 한다. 사진이 없으면 이 층이 배경이 된다. */
.tile__veil {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(
      180deg,
      rgba(var(--camp-shade-rgb), 0.62) 0%,
      rgba(var(--camp-shade-rgb), 0.8) 45%,
      rgba(var(--camp-shade-rgb), 0.96) 100%
    ),
    radial-gradient(120% 80% at 20% 0%, rgba(var(--camp-shade-rgb), 0.55) 0%, transparent 60%);
}

.tile__body {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: var(--sp-4) var(--sp-4) var(--sp-3);
  gap: var(--sp-2);
}

.tile__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-3);
}

.tile__name {
  font-size: var(--fs-title);
  font-weight: 800;
  letter-spacing: -0.03em;
  text-shadow: 0 1px 14px rgba(var(--camp-shade-rgb), 0.9);
}

.tile__region {
  margin-top: var(--sp-0);
  font-size: var(--fs-small);
  color: rgba(var(--camp-ink-rgb), 0.6);
} /* 점수 */
.tile__score {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  margin-top: auto;
}

.tile__score-value {
  font-size: var(--fs-hero);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
}

.tile__grade {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-small);
  color: rgba(var(--camp-ink-rgb), 0.75);
}

.tile__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.tile__icon {
  margin-left: auto;
  align-self: center;
  opacity: 0.85;
  filter: saturate(0.7);
}

.tile__meter {
  height: 2px;
  background: rgba(var(--camp-ink-rgb), 0.14);
  overflow: hidden;
}

.tile__meter span {
  display: block;
  height: 100%;
}

/* 관측값 */
.tile__stats {
  display: flex;
  gap: var(--sp-4);
}

.tile__stats dt {
  font-size: var(--fs-micro);
  color: rgba(var(--camp-ink-rgb), 0.45);
}

.tile__stats dd {
  margin-top: var(--sp-0);
  font-size: var(--fs-body);
  font-weight: 600;
}

.tile__stats dd small {
  font-size: var(--fs-micro);
  font-weight: 400;
  color: rgba(var(--camp-ink-rgb), 0.55);
}

.tile__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding-top: var(--sp-2);
  border-top: 1px solid rgba(var(--camp-ink-rgb), 0.1);
}

.tile__note {
  min-width: 0;
  font-size: var(--fs-small);
  color: rgba(var(--camp-ink-rgb), 0.55);
}

/* 오늘 날씨에 맞는 캠핑 방식 */
.tile__style {
  display: inline-block;
  padding: var(--sp-0) var(--sp-2);
  border: 1px solid rgba(var(--camp-ember-rgb), 0.42);
  border-radius: 2px;
  color: var(--camp-ember);
  font-size: var(--fs-micro);
  white-space: nowrap;
}

.tile__more {
  flex-shrink: 0;
  font-size: var(--fs-body);
  color: rgba(var(--camp-ink-rgb), 0.45);
  transition:
    color var(--dur-1),
    transform var(--dur-1);
}

.tile:hover .tile__more {
  color: var(--camp-ember);
  transform: translateX(3px);
}
</style>
