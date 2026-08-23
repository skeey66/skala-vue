<script setup>
/**
 * 캠핑장비 중고거래.
 *
 * 처음 시작할 때 가장 큰 벽이 장비값이고, 몇 번 다니면 안 쓰는 장비가 쌓인다.
 * 양쪽을 이어 주는 자리라 캠핑 정보 사이트에 붙일 이유가 있다.
 *
 * 글쓰기와 거래는 서버가 있어야 하므로 지금은 목록·검색·정렬까지만 만든다.
 * 데이터는 communityMock.js 의 목업이다.
 */
import { computed, ref } from 'vue'
import PageHero from '@/components/PageHero.vue'
import BaseDashboardCard from '@/components/BaseDashboardCard.vue'
import MockNotice from '@/components/MockNotice.vue'
import { GEAR_CREDITS, MARKET_CATEGORIES, MARKET_ITEMS } from '@/data/communityMock'
import { buildIndex, makeMatcher } from '@/composables/useHangul'

const CATEGORIES = ['전체', ...MARKET_CATEGORIES]
const category = ref('전체')
const query = ref('')
const sort = ref('new')

const SORTS = [
  { value: 'new', label: '최신순' },
  { value: 'low', label: '낮은 가격순' },
  { value: 'like', label: '찜 많은 순' },
]

// 제목·지역·설명까지 훑는다. 제목만 보면 "강원" 같은 말이 안 걸린다.
function haystack(item) {
  return `${item.title} ${item.region} ${item.category} ${item.note}`.toLowerCase()
}

// 자모로 풀어 두면 "텐ㅌ" 로도 걸린다
const searchIndex = MARKET_ITEMS.map((item) => ({ item, key: buildIndex(haystack(item)) }))

const list = computed(() => {
  const q = query.value.trim().toLowerCase()
  let rows = MARKET_ITEMS

  // 검색 중에는 고른 갈래를 무시한다. 안 그러면 결과 0개인 막다른 길이 생긴다.
  if (q) {
    const hit = makeMatcher(q)
    rows = searchIndex.filter((row) => hit(row.key)).map((row) => row.item)
  } else if (category.value !== '전체') rows = rows.filter((i) => i.category === category.value)

  if (sort.value === 'low') return [...rows].sort((a, b) => a.price - b.price)
  if (sort.value === 'like') return [...rows].sort((a, b) => b.likes - a.likes)
  return rows // 목업 배열이 이미 최신순이다
})

/* 찜은 이 화면이 기억한다. 서버가 없으니 새로고침하면 사라진다. */
const liked = ref(new Set())

function toggleLike(item) {
  const next = new Set(liked.value)
  next.has(item.id) ? next.delete(item.id) : next.add(item.id)
  liked.value = next
}

function won(price) {
  return price.toLocaleString('ko-KR')
}
</script>

<template>
  <div class="market">
    <PageHero
      photo="market"
      eyebrow="중고거래"
      title="쓰던 장비를 다음 사람에게"
      lead="안 쓰는 캠핑 장비를 팔고, 시작하는 사람은 싸게 갖춥니다. 캠퍼끼리 직접 거래합니다."
    />

    <MockNotice />

    <!-- 검색은 판을 깔지 않고 줄 하나로 둔다 -->
    <div class="search">
      <input
        v-model="query"
        class="search__input"
        type="search"
        placeholder="텐트, 침낭, 지역 이름으로 찾아보세요"
        aria-label="장비 검색"
      />
    </div>

    <BaseDashboardCard title="올라온 장비">
      <template #actions>
        <span class="count">
          <b class="num">{{ list.length }}</b
          >개
        </span>
        <div class="sorts">
          <button
            v-for="option in SORTS"
            :key="option.value"
            class="sorts__btn"
            :class="{ 'sorts__btn--on': sort === option.value }"
            type="button"
            @click="sort = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </template>

      <div v-if="!query" class="chips">
        <button
          v-for="item in CATEGORIES"
          :key="item"
          class="chip"
          :class="{ 'chip--on': category === item }"
          type="button"
          @click="category = item"
        >
          <span class="chip__fill"></span>
          <span class="chip__label">{{ item }}</span>
        </button>
      </div>

      <ul v-if="list.length" class="grid">
        <li v-for="item in list" :key="item.id" class="item rise">
          <article class="item__open">
            <img
              class="item__photo"
              :src="`/media/gear/${item.photo}.webp`"
              :alt="item.title"
              width="400"
              height="400"
              loading="lazy"
            />
            <span class="item__state">{{ item.state }}</span>

            <span class="item__body">
              <span class="item__title">{{ item.title }}</span>
              <span class="num item__price">{{ won(item.price) }}원</span>
              <span class="item__where">{{ item.region }} · {{ item.ago }}</span>
              <span class="item__foot">
                <span class="item__deal">{{ item.deal }}</span>
                <button
                  class="num item__like"
                  :class="{ 'item__like--on': liked.has(item.id) }"
                  type="button"
                  :aria-pressed="liked.has(item.id)"
                  @click="toggleLike(item)"
                >
                  {{ liked.has(item.id) ? '♥' : '♡' }}
                  {{ item.likes + (liked.has(item.id) ? 1 : 0) }}
                </button>
              </span>
            </span>
          </article>
        </li>
      </ul>

      <p v-else class="empty">찾는 장비가 아직 없습니다.</p>
    </BaseDashboardCard>

    <!-- CC BY 계열은 저작자를 밝혀야 한다. 빠뜨리면 쓸 수 없는 사진이 된다. -->
    <details class="credits">
      <summary>장비 사진 출처</summary>
      <p class="credits__lead">위키미디어 공용의 자유 이용 저작물입니다.</p>
      <ul class="credits__list">
        <li v-for="credit in GEAR_CREDITS" :key="credit.file">
          {{ credit.file }} — {{ credit.by }} · {{ credit.lic }}
        </li>
      </ul>
    </details>
  </div>
</template>

<style scoped>
.market {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  padding-top: var(--sp-2);
} /* ── 검색 ────────────────────────────────────── */
.search__input {
  width: 100%;
  height: 66px;
  padding: 0 var(--sp-4);
  border: 1px solid var(--camp-line);
  background: transparent;
  color: var(--camp-text);
  font-family: inherit;
  font-size: 1.25rem;
  letter-spacing: -0.02em;
}

.search__input::placeholder {
  color: rgba(var(--camp-ink-rgb), 0.32);
}

.search__input:focus {
  outline: none;
  border-color: var(--camp-ember);
}

.count {
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.count b {
  color: var(--camp-text);
}

.sorts {
  display: flex;
  gap: var(--sp-1);
}

.sorts__btn {
  padding: var(--sp-1) var(--sp-2);
  border: 1px solid transparent;
  background: transparent;
  color: var(--camp-faint);
  font-family: inherit;
  font-size: var(--fs-small);
  cursor: pointer;
}

.sorts__btn:hover {
  color: var(--camp-text);
}

.sorts__btn--on {
  border-color: var(--camp-line);
  color: var(--camp-text);
}

/* ── 갈래 칩 ─────────────────────────────────── */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
  margin-bottom: var(--sp-5);
}

.chip {
  position: relative;
  overflow: hidden;
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--camp-line);
  background: transparent;
  color: var(--camp-muted);
  font-family: inherit;
  font-size: var(--fs-small);
  cursor: pointer;
}

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
}

.chip--on {
  border-color: var(--camp-ember);
}

.chip--on .chip__label {
  color: var(--camp-on-ember);
  font-weight: 700;
}

.chip:hover:not(.chip--on) {
  color: var(--camp-text);
  border-color: var(--camp-text);
}

.hint {
  margin-bottom: var(--sp-5);
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

/* ── 장비 칸 ─────────────────────────────────── */
/*
 * 중고 거래는 사진이 먼저다. 사진 - 이름 - 값 순서로 읽히도록
 * 정사각 사진을 위에 얹고 글은 아래에 붙인다.
 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: var(--sp-4) var(--sp-3);
  list-style: none;
}

.item__open {
  display: block;
}

.item {
  position: relative;
}

.item__photo {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  background: var(--camp-surface);
  filter: saturate(0.9) brightness(0.94);
  transition: filter var(--dur-2) var(--ease);
}

.item:hover .item__photo {
  filter: saturate(1) brightness(1.04);
}

/* 상태는 사진 위 구석에. 목록을 훑을 때 값 다음으로 궁금한 게 이거다. */
.item__state {
  position: absolute;
  top: var(--sp-2);
  left: var(--sp-2);
  padding: var(--sp-0) var(--sp-2);
  background: rgba(var(--camp-shade-rgb), 0.82);
  font-size: var(--fs-micro);
  color: var(--camp-text);
}

.item__body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-0);
  padding-top: var(--sp-3);
}

.item__title {
  font-size: var(--fs-meta);
  line-height: 1.5;
  color: var(--camp-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item__price {
  margin-top: var(--sp-1);
  font-size: var(--fs-lead);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.item__where {
  margin-top: var(--sp-0);
  font-size: var(--fs-micro);
  color: var(--camp-faint);
}

.item__foot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-2);
  margin-top: var(--sp-1);
  font-size: var(--fs-micro);
  color: var(--camp-faint);
}

.item__deal {
  color: var(--camp-muted);
}

/* 상세 화면은 서버가 있어야 하지만 찜은 이 화면 안에서 끝나므로 실제로 눌린다. */
.item__like {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: var(--font-data);
  font-size: var(--fs-micro);
  cursor: pointer;
  transition: color var(--dur-1);
}

.item__like:hover {
  color: var(--camp-muted);
}

.item__like--on {
  color: var(--camp-ember);
}

/* ── 사진 출처 ───────────────────────────────── */
.credits {
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.credits summary {
  cursor: pointer;
  padding: var(--sp-2) 0;
}

.credits summary:hover {
  color: var(--camp-muted);
}

.credits__lead {
  margin-bottom: var(--sp-2);
  line-height: 1.7;
}

.credits__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: var(--sp-0) var(--sp-4);
  list-style: none;
  font-size: var(--fs-micro);
  line-height: 1.8;
}

.empty {
  font-size: var(--fs-body);
  color: var(--camp-faint);
}
</style>
