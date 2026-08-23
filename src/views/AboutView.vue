<script setup>
/**
 * 서비스 소개.
 *
 * 모닥불 지수를 무엇으로 어떻게 매기는지, 날씨 값은 어디서 오는지를 밝힌다.
 * 점수를 믿고 캠핑을 갈지 정하는 화면이라 근거를 감추지 않는다.
 */
import { useRouter } from 'vue-router'
import PageHero from '@/components/PageHero.vue'

const router = useRouter()

/* 배점. 홈 화면과 같은 값을 쓴다. */
const FACTORS = [
  { name: '비', weight: 30, note: '불에 가장 치명적이다' },
  { name: '바람', weight: 25, note: '세면 불티가 날린다' },
  { name: '밤 기온', weight: 25, note: '서늘해야 불이 반갑다' },
  { name: '공기', weight: 12, note: '연기에 미세먼지가 겹치면 오래 못 앉는다' },
  { name: '하늘', weight: 8, note: '구름이 걷히면 불 너머로 별이 보인다' },
]

const SOURCES = [
  {
    name: 'OpenWeatherMap',
    items: ['현재 기온·체감·습도·바람·구름', '5일 3시간 예보와 강수확률', '대기 오염(PM10, PM2.5)'],
  },
  {
    name: 'Open-Meteo',
    items: ['자외선 지수', '밤 최저기온', '해발고도'],
    note: 'OpenWeatherMap 무료 플랜에 없는 값을 메운다. 17개 지역을 1회 호출로 받는다.',
  },
  {
    name: '고캠핑 (한국관광공사)',
    items: ['전국 야영장 목록', '지형·부대시설·반려동물 가능 여부'],
    note: '공공데이터포털 제공. 상세 화면에서만 호출한다.',
  },
]
</script>

<template>
  <div class="about">
    <PageHero photo="about" eyebrow="소개" title="날씨를 불의 언어로" />

    <section class="intro">
      <p class="intro__body">
        비가 오면 불은 약해지고, 바람이 불면 위태롭습니다. 더운 밤에는 불이 반갑지 않고, 공기가
        나쁘면 오래 앉아 있기 어렵습니다. 캠핑하기 좋은 조건과 불이 잘 타는 조건이 거의 같아서, 오늘
        그 자리에서 캠핑하기 얼마나 좋은지를 모닥불을 잣대 삼아 100점으로 환산했습니다.
      </p>
    </section>

    <section class="score">
      <p class="eyebrow">모닥불 지수 배점</p>
      <ul class="score__list">
        <li v-for="(f, i) in FACTORS" :key="f.name" class="factor">
          <span class="num factor__weight">{{ f.weight }}</span>
          <span class="factor__body">
            <b class="factor__name">{{ f.name }}</b>
            <span class="factor__note">{{ f.note }}</span>
          </span>
          <!-- 배점 크기를 눈으로도 읽히게. 숫자 옆에 길이를 둔다. -->
          <span
            class="factor__bar"
            :style="{ width: `${f.weight}%`, animationDelay: `${i * 80}ms` }"
          ></span>
        </li>
      </ul>
      <p class="score__note">바람은 평균이 아니라 순간 최대(돌풍)로 본다.</p>
      <p class="score__note">낮 기온이 아니라 밤 최저기온을 본다. 그 자리에서 자기 때문이다.</p>
    </section>

    <section class="sources">
      <p class="eyebrow">데이터 출처</p>
      <div v-for="source in SOURCES" :key="source.name" class="source">
        <h3 class="source__name">{{ source.name }}</h3>
        <ul class="source__items">
          <li v-for="item in source.items" :key="item">{{ item }}</li>
        </ul>
        <p v-if="source.note" class="source__note">{{ source.note }}</p>
      </div>
    </section>

    <button class="home-btn" type="button" @click="router.push('/')">지역 목록으로</button>
  </div>
</template>

<style scoped>
.about {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

/* 다른 화면의 판과 같은 모양. 직사각형에 위쪽 가는 선. */
.intro,
.score,
.sources {
  padding: var(--sp-5) var(--sp-5) var(--sp-6);
  border-top: 1px solid rgba(var(--camp-ink-rgb), 0.14);
  background: rgba(var(--camp-shade-rgb), 0.82);
}
.intro__body {
  max-width: var(--measure);
  font-size: var(--fs-body);
  color: var(--camp-muted);
  max-width: 34rem;
}

.score__list {
  display: flex;
  flex-direction: column;
  margin-top: var(--sp-4);
  list-style: none;
}

.factor {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  padding: var(--sp-3) 0;
  border-bottom: 1px solid rgba(var(--camp-ink-rgb), 0.08);
}

.factor:last-child {
  border-bottom: 0;
}

.factor__weight {
  width: 2rem;
  flex-shrink: 0;
  font-size: var(--fs-title);
  font-weight: 700;
  text-align: right;
}

.factor__body {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.factor__name {
  font-size: var(--fs-body);
  font-weight: 700;
}

.factor__note {
  font-size: var(--fs-meta);
  color: var(--camp-muted);
}

/*
 * 배점 길이. 줄 아래에 깔려 100 을 어떻게 나눠 갖는지 보여준다.
 *
 * 길이는 width 로 박아 두고 늘어나는 것은 scaleX 로 한다.
 * keyframe 안에서 var() 로 width 를 주면 해석되지 않고, scaleX 가 더 가볍다.
 */
.factor__bar {
  position: absolute;
  left: 0;
  bottom: -1px;
  height: 2px;
  background: var(--camp-ember);
  transform: scaleX(0);
  transform-origin: left;
  animation: grow var(--dur-3) var(--ease) forwards;
}

@keyframes grow {
  to {
    transform: scaleX(1);
  }
}

.score__note {
  max-width: var(--measure);
  margin-top: var(--sp-3);
  padding-top: var(--sp-3);
  border-top: 1px solid var(--camp-line-soft);
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.source {
  padding-top: var(--sp-3);
  margin-top: var(--sp-3);
  border-top: 1px solid var(--camp-line-soft);
}

.source:first-of-type {
  padding-top: 0;
  margin-top: var(--sp-3);
  border-top: 0;
}

.source__name {
  font-size: var(--fs-body);
  font-weight: 700;
}

.source__items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
  margin-top: var(--sp-2);
  list-style: none;
}

.source__items li {
  padding: var(--sp-1) var(--sp-2);
  border: 1px solid var(--camp-line-soft);
  font-size: var(--fs-small);
  color: var(--camp-muted);
}

.source__note {
  max-width: var(--measure);
  margin-top: var(--sp-2);
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.home-btn {
  align-self: flex-start;
  padding: var(--sp-2) var(--sp-4);
  border: 0;
  border-radius: var(--camp-radius-sm);
  background: var(--camp-ember);
  color: var(--camp-on-ember);
  font-size: var(--fs-meta);
  font-weight: 700;
  cursor: pointer;
}
</style>
