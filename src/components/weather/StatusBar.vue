<script setup>
/**
 * 하단 상태바.
 * 선택된 도시가 있으면 "{도시}이 선택되었습니다." 를, 없으면 안내 문구를 보여준다. (v-if / v-else)
 */
defineProps({
  message: { type: String, default: '' },
})
</script>

<template>
  <p class="statusbar" :class="{ 'statusbar--active': message }">
    <span v-if="message">{{ message }}</span>
    <span v-else>카드를 클릭하거나 검색해 보세요.</span>
  </p>
</template>

<style scoped>
.statusbar {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: #eef7ee;
  color: #2f6b39;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
}

.statusbar--active {
  background: #e6f0fb;
  color: #1c4e9c;
}
</style>
