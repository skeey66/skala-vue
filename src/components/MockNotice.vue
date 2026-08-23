<script setup>
/**
 * 목업 데이터 안내.
 *
 * 커뮤니티 두 화면은 서버가 있어야 돌아가는 기능이라 화면만 만들었다.
 * 그 사실을 숨기면 눌러 보고 나서야 알게 되므로, 들어오자마자 한 줄로 밝힌다.
 * 문구는 두 화면이 같다 — 같은 이유로 같은 상태이므로 다르게 쓸 이유가 없다.
 * 길게 설명할 것도 아니라 한 문장으로 끝낸다.
 */
</script>

<template>
  <p class="mock">
    <span class="mock__tag">예시</span>
    커뮤니티 기능은 서버가 필요합니다. 그래서 화면만 만들었고 내용은 목업 데이터입니다.
  </p>
</template>

<style scoped>
.mock {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border-top: 1px solid rgba(var(--camp-ember-rgb), 0.35);
  background: rgba(var(--camp-ink-rgb), 0.05);
  font-size: var(--fs-small);
  line-height: 1.7;
  color: var(--camp-muted);
}

.mock__tag {
  flex-shrink: 0;
  font-size: var(--fs-micro);
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--camp-ember);
}
</style>
