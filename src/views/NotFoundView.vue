<script setup>
/**
 * 어느 라우트에도 걸리지 않은 주소를 Catch-all 이 여기로 보낸다.
 */
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
</script>

<template>
  <section class="lost">
    <p class="lost__mark" aria-hidden="true">
      <svg viewBox="0 0 60 40" width="72" height="48">
        <path d="M30 8 L18 30 H28 Z" fill="currentColor" opacity="0.35" />
        <path d="M31.5 8 L44 30 H34 Z" fill="currentColor" opacity="0.18" />
        <path d="M12 30.6 H50" stroke="currentColor" stroke-width="1.6" opacity="0.25" />
      </svg>
    </p>

    <h2 class="lost__title">없는 페이지입니다</h2>
    <p class="lost__desc">주소가 바뀌었거나 지워진 페이지입니다.</p>
    <p class="num lost__path">{{ route.fullPath }}</p>

    <button class="lost__btn" type="button" @click="router.push('/')">지역 목록으로</button>
  </section>
</template>

<style scoped>
.lost {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-8) var(--sp-5);
  border-top: 1px solid rgba(var(--camp-ink-rgb), 0.14);
  background: rgba(var(--camp-shade-rgb), 0.82);
  text-align: center;
}

.lost__mark {
  color: var(--camp-muted);
  line-height: 0;
  margin-bottom: var(--sp-2);
}

.lost__title {
  font-size: var(--fs-title);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.lost__desc {
  font-size: var(--fs-meta);
  color: var(--camp-muted);
}

.lost__path {
  margin-top: var(--sp-1);
  padding: var(--sp-1) var(--sp-2);
  border-radius: 6px;
  background: var(--camp-bg);
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.lost__btn {
  margin-top: var(--sp-4);
  padding: var(--sp-3) var(--sp-5);
  border: 0;
  background: var(--camp-ember);
  color: var(--camp-on-ember);
  font-size: var(--fs-meta);
  font-weight: 700;
  cursor: pointer;
}
</style>
