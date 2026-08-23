<script setup>
/**
 * 오늘의 추천.
 *
 * 오늘 그 지역 날씨가 미는 방식(비 오면 지붕, 바람 세면 차 옆, 더우면 물가)에 맞는
 * 야영장을 앞세워 보여준다.
 *
 * 지역은 사용자가 고른다. 사는 곳도 갈 수 있는 거리도 사람마다 달라서
 * "오늘 전국 1위" 하나만 들이미는 건 답이 되지 않는다.
 * 처음 들어오면 오늘 지수가 가장 높은 곳을 열어 두고, 거기서부터 바꿔 보게 한다.
 *
 * 고른 지역은 주소(?region=)에 싣는다. 링크를 주고받을 수 있고 뒤로 가기가 통한다.
 * 전국을 다 뒤지는 건 '캠핑장 찾기' 가 맡는다. 여기는 오늘에만 답한다.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { NEmpty, NSkeleton, NTag } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import PageHero from '@/components/PageHero.vue'
import BonfireGauge from '@/components/BonfireGauge.vue'
import CampSheet from '@/components/CampSheet.vue'
import { useFavoriteStore } from '@/stores/favoriteStore'
import { useWeatherStore } from '@/stores/weatherStore'
import { campingStyle, matchesStyle, bonfireGrade } from '@/composables/useBonfireScore'

const route = useRoute()
const router = useRouter()
const weatherStore = useWeatherStore()
const favoriteStore = useFavoriteStore()
const { campPoolLoading, campPoolError, campsByCity } = storeToRefs(weatherStore)

// 고를 수 있는 지역. 지수가 높은 곳부터 늘어놓아 고르는 것 자체가 힌트가 된다.
const regions = computed(() => weatherStore.rankedCities)

const picked = computed(() => {
  const wanted = route.query.region
  return regions.value.find((city) => city.id === wanted) ?? regions.value[0] ?? null
})

function pick(city) {
  if (city.id === picked.value?.id) return
  router.replace({ query: { ...route.query, region: city.id } })
}

const style = computed(() => (picked.value ? campingStyle(picked.value) : null))

/* 사진 있는 곳만. 고캠핑은 등록 사진이 없는 곳이 4분의 1쯤 된다. */
const camps = computed(() => campsByCity.value[picked.value?.id]?.camps ?? [])
const withPhoto = computed(() => camps.value.filter((camp) => camp.image))

// 오늘 방식에 맞는 곳을 앞으로, 그다음 가까운 곳부터
const list = computed(() => {
  if (!style.value) return withPhoto.value
  return [...withPhoto.value].sort((a, b) => {
    const fit = Number(matchesStyle(b, style.value)) - Number(matchesStyle(a, style.value))
    return fit || (a.distance ?? Infinity) - (b.distance ?? Infinity)
  })
})

const fitCount = computed(
  () => (style.value ? withPhoto.value.filter((c) => matchesStyle(c, style.value)) : []).length,
)

function fits(camp) {
  return style.value ? matchesStyle(camp, style.value) : false
}

/* 상세 드로어 */
const openCamp = ref(null)
const sheetOpen = ref(false)
const narrow = ref(false)

function showCamp(camp) {
  openCamp.value = camp
  sheetOpen.value = true
}

/*
 * 원본 사진이 없고 썸네일만 등록된 야영장이 있다(404).
 * 그때는 썸네일로 되돌린다. 안 그러면 깨진 그림 자리에 alt 글자가 그대로 보인다.
 */
function onPhotoError(event, thumb) {
  const el = event.target
  if (thumb && !el.dataset.fellBack) {
    el.dataset.fellBack = '1'
    el.src = thumb
  }
}

function onResize() {
  narrow.value = window.innerWidth < 640
}

onMounted(async () => {
  onResize()
  window.addEventListener('resize', onResize, { passive: true })
  await weatherStore.load()
  if (picked.value) weatherStore.loadCampsFor(picked.value)
})

// 지역을 바꾸면 그 지역 야영장을 받는다. 한 번 받은 지역은 다시 안 부른다.
watch(picked, (city) => {
  if (city) weatherStore.loadCampsFor(city)
})

onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>

<template>
  <div class="today">
    <PageHero
      photo="today"
      eyebrow="오늘의 추천"
      title="오늘 이 지역엔 이런 자리가 맞습니다"
      lead="같은 날이라도 지역마다 날씨가 갈립니다."
    />

    <!-- 지역 고르기. 지수가 높은 곳부터라 고르는 줄 자체가 오늘의 순위다. -->
    <div class="picker">
      <button
        v-for="city in regions"
        :key="city.id"
        class="chip"
        :class="{ 'chip--on': city.id === picked?.id }"
        type="button"
        @click="pick(city)"
      >
        <span class="chip__fill"></span>
        <span class="chip__label">
          {{ city.name }}
          <span class="num chip__score">{{ city.score }}</span>
        </span>
      </button>
    </div>

    <section v-if="picked && style" class="verdict">
      <BonfireGauge :score="picked.score" :size="86" />
      <div class="verdict__text">
        <p class="verdict__where">
          {{ picked.name }}
          <span class="num verdict__score">{{ picked.score }}</span>
          <span class="verdict__grade">{{ bonfireGrade(picked.score).label }}</span>
        </p>
        <p class="verdict__style">{{ style.label }}</p>
        <p class="verdict__why">{{ style.why }}</p>
      </div>
    </section>

    <p v-if="campPoolLoading" class="hint">야영장을 모으는 중입니다</p>
    <p v-else-if="campPoolError" class="hint hint--bad">{{ campPoolError }}</p>
    <p v-else-if="picked" class="hint">
      {{ picked.name }} 반경 40km <b class="num">{{ list.length }}</b
      >곳 · 오늘 조건에 맞는 곳 <b class="num">{{ fitCount }}</b
      >곳
    </p>

    <div v-if="campPoolLoading && !list.length" class="skeletons">
      <NSkeleton v-for="n in 6" :key="n" height="240px" :sharp="true" />
    </div>

    <NEmpty v-else-if="!list.length" description="이 지역 근처에서 찾은 야영장이 없습니다" />

    <ul v-else class="cards">
      <li v-for="camp in list" :key="camp.id" class="card rise">
        <button class="card__open" type="button" @click="showCamp(camp)">
          <span class="sr">{{ camp.name }} 자세히 보기</span>
        </button>

        <!-- 카드에서 바로 찜한다. 상세를 열지 않고도 담아 둘 수 있어야 한다. -->
        <button
          class="card__fav"
          :class="{ 'card__fav--on': favoriteStore.isFavorite(camp.id) }"
          type="button"
          :aria-pressed="favoriteStore.isFavorite(camp.id)"
          :aria-label="`${camp.name} 찜`"
          @click.stop="favoriteStore.toggle(camp)"
        >
          {{ favoriteStore.isFavorite(camp.id) ? '♥' : '♡' }}
        </button>

        <img
          class="card__photo"
          :src="camp.image"
          :alt="`${camp.name} 사진`"
          loading="lazy"
          @error="onPhotoError($event, camp.thumb)"
        />

        <div class="card__body">
          <h3 class="card__name">{{ camp.name }}</h3>
          <p class="card__where">
            {{ camp.district }}
            <span v-if="camp.distance" class="num"> · {{ camp.distance }}km</span>
          </p>
          <p v-if="camp.intro" class="card__intro">{{ camp.intro }}</p>

          <div class="card__tags">
            <NTag v-if="fits(camp)" size="small" :bordered="false" type="success">
              오늘 조건에 맞음
            </NTag>
            <NTag v-if="camp.brazier" size="small" :bordered="false" type="warning">
              화로대 {{ camp.brazier }}
            </NTag>
            <NTag v-for="t in camp.terrain" :key="t" size="small" :bordered="false">{{ t }}</NTag>
          </div>

          <span class="card__more">자세히 ↗</span>
        </div>
      </li>
    </ul>

    <p class="foot">
      찾는 곳이 여기 없다면
      <button class="foot__link" type="button" @click="router.push('/camps')">
        전국에서 찾아보세요 →
      </button>
    </p>

    <CampSheet v-model:show="sheetOpen" :camp="openCamp" :narrow="narrow" />
  </div>
</template>

<style scoped>
.today {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  padding-top: var(--sp-2);
}

/* ── 지역 고르기 ─────────────────────────────── */
.picker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
}

.chip {
  position: relative;
  overflow: hidden;
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--camp-line);
  background: transparent;
  color: var(--camp-muted);
  font-family: inherit;
  font-size: var(--fs-small);
  cursor: pointer;
}

/* 색이 왼쪽에서 차오른다 */
.chip__fill {
  position: absolute;
  inset: 0;
  background: var(--camp-ember);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--dur-2) var(--ease);
}

.chip--on .chip__fill {
  transform: scaleX(1);
}

.chip__label {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
}

.chip__score {
  font-size: var(--fs-micro);
  color: rgba(var(--camp-ink-rgb), 0.42);
}

.chip--on {
  border-color: var(--camp-ember);
}

.chip--on .chip__label {
  color: var(--camp-on-ember);
  font-weight: 700;
}

.chip--on .chip__score {
  color: rgba(0, 0, 0, 0.55);
}

.chip:hover:not(.chip--on) {
  color: var(--camp-text);
  border-color: var(--camp-text);
}

/* ── 고른 지역 요약 ──────────────────────────── */
.verdict {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  padding: var(--sp-4) var(--sp-5);
  border-top: 1px solid rgba(var(--camp-ink-rgb), 0.14);
  background: rgba(var(--camp-shade-rgb), 0.82);
}

.verdict__where {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  font-size: var(--fs-title);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.verdict__score {
  font-size: var(--fs-lead);
}

.verdict__grade {
  font-size: var(--fs-small);
  font-weight: 400;
  color: var(--camp-ember);
}

.verdict__style {
  margin-top: var(--sp-1);
  font-size: var(--fs-body);
  font-weight: 700;
  color: var(--camp-ember);
}

.verdict__why {
  margin-top: var(--sp-0);
  font-size: var(--fs-meta);
  color: var(--camp-muted);
}

.hint {
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.hint b {
  color: var(--camp-muted);
}

.hint--bad {
  color: var(--camp-danger);
}

/* ── 카드 ────────────────────────────────────── */
.cards,
.skeletons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
  gap: var(--sp-4);
  list-style: none;
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--camp-surface);
  transition: background var(--dur-1);
}

.card:hover {
  background: var(--camp-surface-2);
}

/* 사진 위 오른쪽 구석. 평소엔 옅고 찜한 것만 남는다. */
.card__fav {
  position: absolute;
  top: var(--sp-2);
  right: var(--sp-2);
  z-index: 2;
  width: 30px;
  height: 30px;
  border: 0;
  background: rgba(var(--camp-shade-rgb), 0.7);
  color: rgba(var(--camp-ink-rgb), 0.75);
  font-size: var(--fs-body);
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity var(--dur-1),
    color var(--dur-1);
}

.card:hover .card__fav,
.card__fav:focus-visible,
.card__fav--on {
  opacity: 1;
}

.card__fav--on {
  color: var(--camp-ember);
}

.card__open {
  position: absolute;
  inset: 0;
  z-index: 1;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.card__open:focus-visible {
  outline: 2px solid var(--camp-ember);
  outline-offset: -2px;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

.card__photo {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  filter: saturate(0.85) brightness(0.92) contrast(1.02);
}

.card__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: var(--sp-1);
  padding: var(--sp-3) var(--sp-4) var(--sp-4);
}

.card__name {
  font-size: var(--fs-body);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.card__where {
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.card__intro {
  font-size: var(--fs-small);
  line-height: 1.6;
  color: var(--camp-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
  margin-top: auto;
  padding-top: var(--sp-1);
}

.card__more {
  margin-top: var(--sp-2);
  font-size: var(--fs-small);
  font-weight: 600;
  color: var(--camp-ember);
}

.card:hover .card__more {
  text-decoration: underline;
}

/* ── 아래 안내 ───────────────────────────────── */
.foot {
  font-size: var(--fs-meta);
  color: var(--camp-faint);
}

.foot__link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--camp-ember);
  font-family: inherit;
  font-size: var(--fs-meta);
  font-weight: 600;
  cursor: pointer;
}

.foot__link:hover {
  text-decoration: underline;
}

@media (max-width: 620px) {
  .cards,
  .skeletons {
    grid-template-columns: 1fr;
  }

  .verdict {
    gap: var(--sp-4);
    padding: var(--sp-4);
  }
}
</style>
