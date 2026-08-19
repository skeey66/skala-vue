<script setup>
/**
 * 과제 2: 조건부 렌더링 (v-if / v-else)
 * 기준 온도(HOT_THRESHOLD) 이상이면 "더움", 미만이면 "선선함" 라벨을 붙인다.
 */
import { HOT_THRESHOLD } from '@/data/weatherList'

defineProps({
  temp: { type: Number, required: true },
})
</script>

<template>
  <span v-if="temp >= HOT_THRESHOLD" class="badge badge--hot">
    🔥 더움 ({{ HOT_THRESHOLD }}도 이상)
  </span>
  <span v-else class="badge badge--cool"> ❄️ 선선함 ({{ HOT_THRESHOLD }}도 미만) </span>
</template>

<style scoped>
.badge {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}

.badge--hot {
  background: #fde2e1;
  color: #a12d24;
}

.badge--cool {
  background: #dbeafe;
  color: #1c4e9c;
}
</style>
