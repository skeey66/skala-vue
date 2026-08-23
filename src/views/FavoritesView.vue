<script setup>
/**
 * 찜한 캠핑장.
 *
 * 가고 싶은 곳을 담아 뒀다가 나중에 예약하는 자리다.
 * 야영장은 고캠핑 API 에서 오지만, 찜은 화면에 필요한 만큼을 함께 저장해 두므로
 * 여기서는 API 를 다시 부르지 않는다. 새로고침해도 바로 뜬다.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { NButton, NEmpty, NTag } from 'naive-ui'
import { useRouter } from 'vue-router'
import PageHero from '@/components/PageHero.vue'
import BaseDashboardCard from '@/components/BaseDashboardCard.vue'
import CampSheet from '@/components/CampSheet.vue'
import { useFavoriteStore } from '@/stores/favoriteStore'

const router = useRouter()
const favoriteStore = useFavoriteStore()

const list = computed(() => favoriteStore.recent)

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
 * 그때는 썸네일로 되돌린다.
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

onMounted(() => {
  onResize()
  window.addEventListener('resize', onResize, { passive: true })
})

onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>

<template>
  <div class="fav">
    <PageHero
      photo="favorites"
      eyebrow="찜"
      title="담아 둔 캠핑장"
      lead="이 브라우저에만 저장되고 서버로는 보내지 않습니다."
    />

    <BaseDashboardCard title="찜한 곳">
      <template #actions>
        <span class="count">
          <b class="num">{{ list.length }}</b
          >곳
        </span>
        <NButton v-if="list.length" size="small" quaternary @click="favoriteStore.clear()">
          모두 비우기
        </NButton>
      </template>

      <NEmpty v-if="!list.length" description="아직 찜한 캠핑장이 없습니다">
        <template #extra>
          <NButton size="small" @click="router.push('/camps')">캠핑장 찾아보기</NButton>
        </template>
      </NEmpty>

      <ul v-else class="cards">
        <li v-for="camp in list" :key="camp.id" class="card rise">
          <button class="card__open" type="button" @click="showCamp(camp)">
            <span class="sr">{{ camp.name }} 자세히 보기</span>
          </button>

          <img
            v-if="camp.image || camp.thumb"
            class="card__photo"
            :src="camp.image || camp.thumb"
            :alt="`${camp.name} 사진`"
            loading="lazy"
            @error="onPhotoError($event, camp.thumb)"
          />
          <span v-else class="card__photo card__photo--none">사진 없음</span>

          <!-- 찜 화면에서는 빼는 것이 주된 동작이라 카드 위에 바로 둔다 -->
          <button class="card__drop" type="button" @click.stop="favoriteStore.remove(camp.id)">
            찜 해제
          </button>

          <div class="card__body">
            <h3 class="card__name">{{ camp.name }}</h3>
            <p class="card__where">{{ camp.district }}</p>
            <p v-if="camp.intro" class="card__intro">{{ camp.intro }}</p>

            <div class="card__tags">
              <NTag v-if="camp.type" size="small" :bordered="false">{{ camp.type }}</NTag>
              <NTag v-if="camp.brazier" size="small" :bordered="false" type="warning">
                화로대 {{ camp.brazier }}
              </NTag>
              <NTag v-for="t in camp.terrain" :key="t" size="small" :bordered="false">{{ t }}</NTag>
            </div>

            <span class="card__more">자세히 ↗</span>
          </div>
        </li>
      </ul>
    </BaseDashboardCard>

    <CampSheet v-model:show="sheetOpen" :camp="openCamp" :narrow="narrow" />
  </div>
</template>

<style scoped>
.fav {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  padding-top: var(--sp-2);
}
.count {
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.count b {
  color: var(--camp-text);
}

.cards {
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

.card__photo--none {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--camp-ink-rgb), 0.05);
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.card__drop {
  position: absolute;
  top: var(--sp-2);
  right: var(--sp-2);
  z-index: 2;
  padding: var(--sp-0) var(--sp-2);
  border: 0;
  background: rgba(var(--camp-shade-rgb), 0.85);
  color: var(--camp-muted);
  font-family: inherit;
  font-size: var(--fs-micro);
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--dur-1);
}

.card:hover .card__drop,
.card__drop:focus-visible {
  opacity: 1;
}

.card__drop:hover {
  color: var(--camp-danger);
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

@media (max-width: 620px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
</style>
