<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="app-header">
    <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="36" height="36" />
    <nav>
      <RouterLink to="/">Weather</RouterLink>
      <RouterLink to="/about">About</RouterLink>
    </nav>
  </header>

  <RouterView />
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 720px;
  margin: 0 auto 1rem;
  padding: 0 1rem;
}

nav a {
  display: inline-block;
  padding: 0 0.9rem;
  font-size: 0.9rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
  padding-left: 0;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}
</style>
