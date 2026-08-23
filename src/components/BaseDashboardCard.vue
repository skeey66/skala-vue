<script setup>
/**
 * 사이트의 모든 판이 쓰는 껍데기.
 *
 * 직사각형, 위쪽 가는 선, 안쪽 여백까지 판의 생김새는 여기서만 정한다.
 * 안에 무엇이 들어오는지는 <slot> 에 맡기므로 이 컴포넌트는 내용을 모른다.
 * 슬롯 내용의 스크립트는 부모 스코프에서 평가되니, 판을 거쳐도 부모와
 * 자식이 직접 통신하는 데는 지장이 없다.
 *
 * 판은 화면에 들어올 때 한 번 떠오른다. 여러 판이 세로로 쌓이므로
 * 내려가는 동안 차례로 자리를 잡아 읽는 순서가 생긴다.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps({
  title: { type: String, required: true },
})

const root = ref(null)
const shown = ref(false)
let observer = null

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    shown.value = true
    return
  }
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return
      shown.value = true
      observer?.disconnect()
    },
    { threshold: 0.06 },
  )
  observer.observe(root.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section ref="root" class="panel" :class="{ 'panel--in': shown }">
    <header class="panel__head">
      <h2 class="panel__title">{{ title }}</h2>
      <!-- 우측 도구 영역: 정렬 셀렉트, 버튼 등 -->
      <div v-if="$slots.actions" class="panel__actions">
        <slot name="actions" />
      </div>
    </header>

    <!-- 기본 슬롯 -->
    <slot />
  </section>
</template>

<style scoped>
/* 둥근 모서리와 테두리를 걷고 직사각형 판 하나로 둔다.
   구분은 위쪽 가는 선 하나가 맡는다. */
.panel {
  border-top: 1px solid rgba(var(--camp-ink-rgb), 0.14);
  background: rgba(var(--camp-shade-rgb), 0.82);
  padding: var(--sp-5) var(--sp-5) var(--sp-6);

  opacity: 0;
  transform: translateY(18px);
  transition:
    opacity 0.7s var(--ease),
    transform 0.7s var(--ease);
}

.panel--in {
  opacity: 1;
  transform: translateY(0);
}

.panel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-3);
  flex-wrap: wrap;
  margin-bottom: var(--sp-5);
}

/* 제목은 제목답게. 밑에 설명을 덧붙이지 않는다. */
.panel__title {
  font-size: var(--fs-lead);
  font-weight: 700;
  letter-spacing: -0.03em;
}

.panel__actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

@media (max-width: 620px) {
  .panel {
    padding: var(--sp-4) var(--sp-4) var(--sp-5);
  }
}
</style>
