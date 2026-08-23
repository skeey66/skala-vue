<script setup>
/**
 * 섭씨 / 화씨 토글. 내비게이션 바 오른쪽에 붙는다.
 *
 * 부모에게서 props 를 받지 않고 스토어를 직접 읽고 쓴다.
 * 어느 화면에 놓든 같은 단위 상태를 보게 된다.
 */
import { useConfigStore } from '@/stores/configStore'

const configStore = useConfigStore()
</script>

<template>
  <div class="unit" role="group" aria-label="온도 단위">
    <button
      class="unit__opt"
      :class="{ 'unit__opt--on': !configStore.isFahrenheit }"
      type="button"
      @click="configStore.setUnit('celsius')"
    >
      °C
    </button>
    <button
      class="unit__opt"
      :class="{ 'unit__opt--on': configStore.isFahrenheit }"
      type="button"
      @click="configStore.setUnit('fahrenheit')"
    >
      °F
    </button>
  </div>
</template>

<style scoped>
.unit {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--camp-line-soft);
  border-radius: 999px;
  background: var(--camp-surface);
}

.unit__opt {
  padding: var(--sp-1) var(--sp-3);
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--camp-faint);
  font-family: var(--font-data);
  font-size: var(--fs-small);
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.unit__opt--on {
  background: var(--camp-surface-2);
  color: var(--camp-text);
}
</style>
