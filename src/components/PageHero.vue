<script setup>
/**
 * 화면 맨 위 사진 배너.
 *
 * 사이트가 전체적으로 어둡다는 말을 들었다. 판마다 색을 밝히면 밤 캠핑이라는 톤이 깨지므로,
 * 대신 화면을 열 때 큰 사진 한 장을 먼저 보여 준다. 밝은 면이 하나 생기면 화면 전체가 가벼워진다.
 *
 * 사진은 화면마다 다르다 — 캠핑장은 텐트, 날씨는 산과 하늘, 셰르파는 걷는 사람들.
 * 어느 화면에 들어왔는지가 글을 읽기 전에 먼저 전해진다.
 */
defineProps({
  photo: { type: String, required: true }, // public/media/hero/<photo>.webp
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  lead: { type: String, default: '' },
})
</script>

<template>
  <header class="hero" :style="{ backgroundImage: `url(/media/hero/${photo}.webp)` }">
    <!-- 사진 위에 글을 얹으려면 막이 필요하다. 아래쪽을 더 덮어 본문으로 자연스럽게 이어지게. -->
    <div class="hero__veil"></div>
    <div class="hero__inner">
      <p v-if="eyebrow" class="hero__eyebrow">{{ eyebrow }}</p>
      <h2 class="hero__title">{{ title }}</h2>
      <p v-if="lead" class="hero__lead">{{ lead }}</p>
    </div>
  </header>
</template>

<style scoped>
/*
 * 본문 폭(1440px) 밖으로 나가 화면 끝까지 채운다.
 * 가운데 정렬된 틀 안에서 통짜로 깔려면 이 방법뿐이다.
 * 가로 스크롤이 생기지 않게 .page 에 overflow-x: clip 을 걸어 뒀다.
 */
.hero {
  position: relative;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  margin-bottom: var(--sp-6);
  min-height: clamp(210px, 24vw, 330px);
  display: flex;
  align-items: flex-end;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
}

.hero__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(var(--camp-shade-rgb), 0.34) 0%,
    rgba(var(--camp-shade-rgb), 0.52) 55%,
    rgba(var(--camp-shade-rgb), 0.88) 100%
  );
}

.hero__inner {
  position: relative;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--sp-7) var(--sp-6) var(--sp-6);
}

.hero__eyebrow {
  font-size: var(--fs-small);
  letter-spacing: 0.06em;
  color: var(--camp-ember);
}

.hero__title {
  margin-top: var(--sp-1);
  font-size: clamp(1.9rem, 3.6vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 1.15;
  color: #fff;
  text-shadow: 0 2px 26px rgba(0, 0, 0, 0.55);
}

.hero__lead {
  max-width: var(--measure);
  margin-top: var(--sp-3);
  font-size: var(--fs-lead);
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.86);
  text-shadow: 0 1px 14px rgba(0, 0, 0, 0.5);
}

@media (max-width: 620px) {
  .hero__inner {
    padding: var(--sp-6) var(--sp-4) var(--sp-5);
  }
}
</style>
