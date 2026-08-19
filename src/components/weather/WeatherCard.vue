<script setup>
/**
 * 날씨 카드 1장.
 * - 카드 전체 클릭 → select 이벤트 (상태바 표기용)
 * - [상세보기] 클릭 → @click.stop 으로 버블링을 끊고 detail 이벤트만 발생
 */
import TempBadge from './TempBadge.vue'
import { STATUS_ICON, RAIN_THRESHOLD } from '@/data/weatherList'

defineProps({
  city: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})

defineEmits(['select', 'detail'])
</script>

<template>
  <article
    class="card"
    :class="{ 'card--selected': selected }"
    role="button"
    tabindex="0"
    @click="$emit('select', city)"
    @keyup.enter="$emit('select', city)"
  >
    <div class="card__body">
      <h3 class="card__title">
        <span class="card__icon">{{ STATUS_ICON[city.status] ?? '🌡️' }}</span>
        {{ city.name }} ({{ city.status }})
      </h3>

      <p class="card__temp">
        현재 기온: {{ city.temp }}°C
        <span class="card__feel">(체감 {{ city.feelsLike }}°C)</span>
      </p>

      <!-- 과제 2 -->
      <div class="card__badges">
        <TempBadge :temp="city.temp" />
        <!-- 추가 조건부 렌더링: 강수확률이 높으면 우산 안내 -->
        <span v-if="city.rainProb >= RAIN_THRESHOLD" class="badge badge--rain">
          ☔ 우산 챙기세요 ({{ city.rainProb }}%)
        </span>
      </div>

      <!-- 과제 5: 추가 데이터 -->
      <dl class="card__meta">
        <div>
          <dt>습도</dt>
          <dd>{{ city.humidity }}%</dd>
        </div>
        <div>
          <dt>바람</dt>
          <dd>{{ city.wind }}m/s</dd>
        </div>
        <div>
          <dt>강수확률</dt>
          <dd>{{ city.rainProb }}%</dd>
        </div>
        <div>
          <dt>미세먼지</dt>
          <dd>{{ city.dust }}</dd>
        </div>
        <div>
          <dt>기준</dt>
          <dd>{{ city.updatedAt }}</dd>
        </div>
      </dl>
    </div>

    <!-- 과제 4: .stop 수식어로 카드 클릭(select)까지 전파되지 않게 한다 -->
    <button class="card__detail" type="button" @click.stop="$emit('detail', city)">상세보기</button>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--wx-border);
  border-radius: 10px;
  background: var(--wx-surface);
  cursor: pointer;
  transition:
    border-color 0.15s,
    transform 0.15s;
}

.card:hover {
  border-color: var(--wx-accent);
  transform: translateY(-1px);
}

.card--selected {
  border-color: var(--wx-accent);
  box-shadow: inset 3px 0 0 var(--wx-accent);
}

.card__title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.3rem;
}

.card__icon {
  margin-right: 0.15rem;
}

.card__temp {
  font-size: 0.9rem;
  color: var(--wx-muted);
  margin-bottom: 0.45rem;
}

.card__feel {
  font-size: 0.8rem;
  opacity: 0.8;
}

.card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.badge--rain {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  background: #e3f0f7;
  color: #1c5b7a;
}

.card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.9rem;
  margin-top: 0.6rem;
  font-size: 0.78rem;
  color: var(--wx-muted);
}

.card__meta > div {
  display: flex;
  gap: 0.25rem;
}

.card__meta dt::after {
  content: ':';
}

.card__meta dd {
  color: var(--wx-text);
  font-weight: 600;
}

.card__detail {
  flex-shrink: 0;
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--wx-border);
  border-radius: 6px;
  background: var(--wx-input-bg);
  color: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}

.card__detail:hover {
  border-color: var(--wx-accent);
  color: var(--wx-accent);
}
</style>
