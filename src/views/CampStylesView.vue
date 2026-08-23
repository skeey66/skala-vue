<script setup>
/**
 * 캠핑장 찾기.
 *
 * **전국 야영장 전체**가 대상이다. 오늘 날씨와는 무관하다 — 그건 '오늘의 추천' 이 맡는다.
 * 고캠핑 전체 목록을 한 번 받아 두고 이름·지역·지형·업종으로 브라우저에서 거른다.
 *
 * 사진 있는 야영장만 쓴다. 사진이 이 화면의 요지라 빈 자리가 섞이면 격자가 무너진다.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NEmpty, NSkeleton, NTag } from 'naive-ui'
import { storeToRefs } from 'pinia'
import PageHero from '@/components/PageHero.vue'
import CampSheet from '@/components/CampSheet.vue'
import { useFavoriteStore } from '@/stores/favoriteStore'
import { useWeatherStore } from '@/stores/weatherStore'
import { buildIndex, makeMatcher } from '@/composables/useHangul'

const route = useRoute()
const router = useRouter()
const weatherStore = useWeatherStore()
const favoriteStore = useFavoriteStore()
const { allCamps, allLoading, allError } = storeToRefs(weatherStore)

/*
 * 고캠핑 업종 네 가지. 설명은 "장비를 얼마나 챙겨야 하는가" 순으로 적었다.
 * 그게 종류를 고르는 실제 기준이다.
 */
const STYLES = [
  { key: '글램핑', name: '글램핑', line: '몸만 가도 됩니다' },
  { key: '카라반', name: '카라반', line: '집을 통째로 빌립니다' },
  { key: '자동차야영장', name: '오토캠핑', line: '차를 옆에 대고' },
  { key: '일반야영장', name: '일반야영장', line: '장비를 챙겨 갑니다' },
]

/* 사진 있는 곳만. 전국 3,100곳 중 2,300곳쯤이 사진을 갖고 있다. */
const withPhoto = computed(() => allCamps.value.filter((camp) => camp.image))

// 종류별 야영장. 한 곳이 여러 종류를 겸하면 양쪽에 다 들어간다.
const byStyle = computed(() => {
  const map = Object.fromEntries(STYLES.map((style) => [style.key, []]))
  for (const camp of withPhoto.value) {
    for (const type of camp.types ?? []) {
      if (map[type]) map[type].push(camp)
    }
  }
  return map
})

/*
 * 타일 배경 사진. 한 야영장이 네 종류를 다 겸하면 네 타일이 같은 사진을 쓰게 된다.
 * 그러면 종류가 구분되지 않아 사진을 까는 의미가 없다. 이미 쓴 사진은 건너뛴다.
 */
const covers = computed(() => {
  const used = new Set()
  const picked = {}
  for (const style of STYLES) {
    const pool = byStyle.value[style.key] ?? []
    const fresh = pool.find((camp) => !used.has(camp.image))
    const camp = fresh ?? pool[0] ?? null
    if (camp) used.add(camp.image)
    picked[style.key] = camp
  }
  return picked
})

/*
 * 원본 사진이 없고 썸네일만 등록된 야영장이 있다.
 * (fullSizeImage 가 /thumb/ 를 벗겨 만든 주소가 404 인 경우)
 * 그때는 썸네일로 되돌린다. 둘 다 실패하면 더 손대지 않는다.
 */
function onPhotoError(event, thumb) {
  const el = event.target
  if (thumb && !el.dataset.fellBack) {
    el.dataset.fellBack = '1'
    el.src = thumb
  }
}

// 내비 드롭다운이 곧바로 한 종류를 열 수 있게 주소로 받는다 (/camps?type=글램핑)
const picked = ref(route.query.type ?? null)

/*
 * 검색어. 한 글자 칠 때마다 아래 목록이 걸러진다.
 * 이름뿐 아니라 지역·지형·업종까지 훑는다. "강원", "계곡", "글램핑" 이 다 통해야
 * 찾는 사람이 머릿속에 있는 말을 그대로 칠 수 있다.
 */
const query = ref('')
const searching = computed(() => query.value.trim().length > 0)

/*
 * 검색 대상. 이름만으로는 부족하다 — 사람은 "강원", "계곡", "글램핑" 을 친다.
 * 시도 이름은 '경상남도' 처럼 길게 들어오는데 '경남' 으로 치는 사람이 많아 약칭도 함께 넣는다.
 */
const SHORT = {
  강원특별자치도: '강원',
  경기도: '경기',
  경상남도: '경남',
  경상북도: '경북',
  전라남도: '전남',
  전북특별자치도: '전북',
  충청남도: '충남',
  충청북도: '충북',
  제주특별자치도: '제주',
}

function haystack(camp) {
  const doName = (camp.district ?? '').split(' ')[0]
  return [
    camp.name,
    camp.district,
    SHORT[doName],
    camp.address,
    ...(camp.types ?? []),
    ...(camp.terrain ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/*
 * 아래 목록. 검색어가 있으면 종류를 건너뛰고 전국에서 찾는다.
 * "글램핑을 고른 채로 '강원' 을 쳤는데 0곳" 같은 막다른 길을 만들지 않는다.
 *
 * 결과가 수백 곳까지 나오므로 한 번에 다 그리지 않고 끊어서 보여준다.
 */
/*
 * 조건으로 고르기.
 *
 * 이름을 아는 사람은 드물다. 사람들은 "강원에 있는 글램핑" 이나
 * "전기 되고 화로대 쓸 수 있는 계곡" 처럼 조건으로 찾는다.
 * 그래서 검색창은 남기되 조건 고르기를 앞에 둔다.
 *
 * 한 묶음 안에서는 하나라도 맞으면 통과(OR), 묶음끼리는 모두 맞아야 통과(AND) 한다.
 * 지형을 둘 고르면 둘 중 하나면 되지만, 지형과 시설을 고르면 둘 다 맞아야 한다.
 */
const REGIONS = [
  ['서울', '서울'],
  ['경기', '경기'],
  ['인천', '인천'],
  ['강원', '강원'],
  ['충북', '충청북'],
  ['충남', '충청남'],
  ['대전', '대전'],
  ['세종', '세종'],
  ['전북', '전북'],
  ['전남', '전라남'],
  ['광주', '광주'],
  ['경북', '경상북'],
  ['경남', '경상남'],
  ['대구', '대구'],
  ['부산', '부산'],
  ['울산', '울산'],
  ['제주', '제주'],
]
const TERRAINS = ['산', '숲', '계곡', '해변', '강', '호수', '섬', '도심']
const AMENITIES = ['전기', '온수', '무선인터넷', '장작판매', '마트.편의점']

const region = ref('')
const terrains = ref([])
const amenities = ref([])
const brazier = ref('') // '가능' | '개별'
const pet = ref(false)

/*
 * 템플릿에서는 ref 가 자동으로 벗겨져 배열 자체가 넘어온다.
 * 그래서 ref 를 인자로 받으면 .value 를 못 바꾼다 — 눌러도 아무 일이 없다.
 * 어느 묶음인지를 받아 여기서 직접 고른다.
 */
function flip(group, value) {
  const target = group === 'terrain' ? terrains : amenities
  target.value = target.value.includes(value)
    ? target.value.filter((v) => v !== value)
    : [...target.value, value]
}

const filterCount = computed(
  () =>
    (region.value ? 1 : 0) +
    terrains.value.length +
    amenities.value.length +
    (brazier.value ? 1 : 0) +
    (pet.value ? 1 : 0),
)

function resetFilters() {
  region.value = ''
  terrains.value = []
  amenities.value = []
  brazier.value = ''
  pet.value = false
}

function passes(camp) {
  if (region.value) {
    const key = REGIONS.find(([short]) => short === region.value)?.[1] ?? region.value
    if (!(camp.district ?? '').startsWith(key)) return false
  }
  if (terrains.value.length && !camp.terrain?.some((t) => terrains.value.includes(t))) return false
  if (amenities.value.length) {
    const has = camp.facilities ?? []
    if (!amenities.value.every((a) => has.includes(a))) return false
  }
  if (brazier.value === '가능' && (!camp.brazier || camp.brazier.includes('불가'))) return false
  if (brazier.value === '개별' && !(camp.brazier ?? '').includes('개별')) return false
  if (pet.value && !(camp.pet ?? '').startsWith('가능')) return false
  return true
}

/*
 * 검색 색인.
 *
 * 자모로 풀어 두면 "울ㅅ" 로도 울산이 걸린다. 다만 2천 곳을 한 글자마다 다시 푸는 건
 * 낭비라, 목록이 바뀔 때 한 번만 만들어 둔다.
 */
const searchIndex = computed(() =>
  withPhoto.value.map((camp) => ({ camp, key: buildIndex(haystack(camp)) })),
)

const PAGE = 24
const shown = ref(PAGE)

/* 조건이 하나라도 걸려 있으면 목록을 연다 */
const filtering = computed(() => Boolean(filterCount.value || picked.value || searching.value))

const found = computed(() => {
  const q = query.value.trim().toLowerCase()
  // 검색어가 있으면 종류는 건너뛴다. "글램핑 고른 채로 강원 쳤는데 0곳" 을 막는다.
  let rows = q || !picked.value ? withPhoto.value : (byStyle.value[picked.value] ?? [])
  if (q) {
    const hit = makeMatcher(q)
    rows = searchIndex.value.filter((row) => hit(row.key)).map((row) => row.camp)
  }
  if (filterCount.value) rows = rows.filter(passes)
  return rows
})

const list = computed(() => found.value.slice(0, shown.value))

// 검색어나 종류가 바뀌면 처음부터 다시 센다
watch([query, picked, region, terrains, amenities, brazier, pet], () => (shown.value = PAGE))

const pickedStyle = computed(() => STYLES.find((style) => style.key === picked.value) ?? null)

// 종류를 고르면 그 자리로 내려준다
const listEl = ref(null)
watch(picked, async (key) => {
  if (!key) return
  await new Promise((resolve) => requestAnimationFrame(resolve))
  listEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})

function toggle(key) {
  picked.value = picked.value === key ? null : key
  router.replace({ query: { ...route.query, type: picked.value ?? undefined } })
}

// 주소가 밖에서 바뀌면(드롭다운에서 다른 종류를 고르면) 따라간다
watch(
  () => route.query.type,
  (next) => {
    if ((next ?? null) !== picked.value) picked.value = next ?? null
  },
)

onMounted(async () => {
  onResize()
  window.addEventListener('resize', onResize, { passive: true })
  await weatherStore.loadAllCamps()
})

onBeforeUnmount(() => window.removeEventListener('resize', onResize))

/* 카드를 누르면 옆에서 상세가 열린다. 지역 상세 화면과 같은 컴포넌트를 쓴다. */
const openCamp = ref(null)
const sheetOpen = ref(false)
const narrow = ref(false)

function showCamp(camp) {
  openCamp.value = camp
  sheetOpen.value = true
}

function onResize() {
  narrow.value = window.innerWidth < 640
}
</script>

<template>
  <div class="styles">
    <PageHero photo="camps" eyebrow="캠핑장" title="전국 야영장을 한자리에서" />

    <!-- 찾기. 이 화면의 본론이라 배너 바로 아래에 둔다. -->
    <section class="find">
      <div class="field">
        <input
          v-model="query"
          class="field__input"
          type="search"
          placeholder="이름 · 지역 · 지형으로 찾기"
          aria-label="캠핑장 검색"
        />
        <span class="field__mark" aria-hidden="true">
          <svg viewBox="0 0 22 22" width="20" height="20">
            <circle
              cx="9.5"
              cy="9.5"
              r="6.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M14.5 14.5 L19 19"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </span>
      </div>

      <p class="find__note">
        전국 야영장 <b class="num">{{ withPhoto.length }}</b
        >곳
      </p>
    </section>

    <!-- 조건으로 고르기. 이름을 아는 사람보다 조건으로 찾는 사람이 훨씬 많다. -->
    <section class="filters">
      <div class="filters__head">
        <h3 class="filters__title">조건으로 고르기</h3>
        <button v-if="filterCount" class="filters__reset" type="button" @click="resetFilters">
          조건 지우기 ({{ filterCount }})
        </button>
      </div>

      <div class="row">
        <span class="row__key">지역</span>
        <div class="row__chips">
          <button
            v-for="[short] in REGIONS"
            :key="short"
            class="chip"
            :class="{ 'chip--on': region === short }"
            type="button"
            @click="region = region === short ? '' : short"
          >
            <span class="chip__fill"></span>
            <span class="chip__label">{{ short }}</span>
          </button>
        </div>
      </div>

      <div class="row">
        <span class="row__key">지형</span>
        <div class="row__chips">
          <button
            v-for="item in TERRAINS"
            :key="item"
            class="chip"
            :class="{ 'chip--on': terrains.includes(item) }"
            type="button"
            @click="flip('terrain', item)"
          >
            <span class="chip__fill"></span>
            <span class="chip__label">{{ item }}</span>
          </button>
        </div>
      </div>

      <div class="row">
        <span class="row__key">시설</span>
        <div class="row__chips">
          <button
            v-for="item in AMENITIES"
            :key="item"
            class="chip"
            :class="{ 'chip--on': amenities.includes(item) }"
            type="button"
            @click="flip('amenity', item)"
          >
            <span class="chip__fill"></span>
            <span class="chip__label">{{ item.replace('.', '·') }}</span>
          </button>
        </div>
      </div>

      <div class="row">
        <span class="row__key">그 밖에</span>
        <div class="row__chips">
          <button
            class="chip"
            :class="{ 'chip--on': brazier === '가능' }"
            type="button"
            @click="brazier = brazier === '가능' ? '' : '가능'"
          >
            <span class="chip__fill"></span>
            <span class="chip__label">화로대 가능</span>
          </button>
          <button
            class="chip"
            :class="{ 'chip--on': brazier === '개별' }"
            type="button"
            @click="brazier = brazier === '개별' ? '' : '개별'"
          >
            <span class="chip__fill"></span>
            <span class="chip__label">개별 화로대</span>
          </button>
          <button class="chip" :class="{ 'chip--on': pet }" type="button" @click="pet = !pet">
            <span class="chip__fill"></span>
            <span class="chip__label">반려동물 동반</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 종류 네 가지. 조건을 걸면 자리를 목록에 내준다. -->
    <ul v-show="!filtering" class="tiles">
      <li v-for="style in STYLES" :key="style.key">
        <button
          class="tile"
          :class="{ 'tile--on': picked === style.key }"
          type="button"
          :aria-pressed="picked === style.key"
          @click="toggle(style.key)"
        >
          <img
            v-if="covers[style.key]"
            class="tile__photo"
            :src="covers[style.key].image"
            alt=""
            loading="lazy"
            @error="onPhotoError($event, covers[style.key].thumb)"
          />
          <span class="tile__veil"></span>

          <span class="tile__body">
            <b class="tile__name">{{ style.name }}</b>
            <span class="tile__line">{{ style.line }}</span>
            <span v-if="byStyle[style.key].length" class="num tile__count">
              {{ byStyle[style.key].length }}곳
            </span>
          </span>
        </button>
      </li>
    </ul>

    <p v-if="allLoading" class="hint">전국 야영장을 받는 중입니다</p>
    <p v-else-if="allError" class="hint hint--bad">{{ allError }}</p>

    <div v-if="allLoading" class="skeletons">
      <NSkeleton v-for="n in 4" :key="n" height="190px" :sharp="true" />
    </div>

    <!-- 고른 종류의 야영장, 또는 검색 결과 -->
    <section v-if="filtering" ref="listEl" class="list">
      <header class="list__head">
        <h3 class="list__title">
          {{ searching ? query : (pickedStyle?.name ?? '조건에 맞는 곳') }}
          <span class="num list__count">{{ found.length }}</span>
        </h3>
      </header>

      <NEmpty
        v-if="!list.length"
        description="조건에 맞는 곳이 없습니다. 조건을 하나 줄여 보세요."
      />

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
            <h4 class="card__name">{{ camp.name }}</h4>
            <p class="card__where">
              {{ camp.district }}
              <span v-if="camp.distance" class="num"> · {{ camp.distance }}km</span>
            </p>
            <p v-if="camp.intro" class="card__intro">{{ camp.intro }}</p>

            <div class="card__tags">
              <NTag v-if="camp.brazier" size="small" :bordered="false" type="warning">
                화로대 {{ camp.brazier }}
              </NTag>
              <NTag v-for="t in camp.terrain" :key="t" size="small" :bordered="false">{{ t }}</NTag>
            </div>

            <span class="card__more">자세히 ↗</span>
          </div>
        </li>
      </ul>

      <button v-if="found.length > list.length" class="more" type="button" @click="shown += PAGE">
        더 보기 <span class="num">{{ found.length - list.length }}</span>
      </button>
    </section>

    <CampSheet v-model:show="sheetOpen" :camp="openCamp" :narrow="narrow" />
  </div>
</template>

<style scoped>
/* ── 조건으로 고르기 ─────────────────────────── */
.filters {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-5) var(--sp-5);
  border-top: 1px solid rgba(var(--camp-ink-rgb), 0.14);
  background: rgba(var(--camp-shade-rgb), 0.82);
}

.filters__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-3);
  margin-bottom: var(--sp-1);
}

.filters__title {
  font-size: var(--fs-lead);
  font-weight: 700;
  letter-spacing: -0.03em;
}

.filters__reset {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--camp-ember);
  font-family: inherit;
  font-size: var(--fs-small);
  cursor: pointer;
}

.filters__reset:hover {
  text-decoration: underline;
}

/* 묶음 이름을 왼쪽에 세워 두면 무엇을 고르는 줄인지 훑기만 해도 안다 */
.row {
  display: grid;
  grid-template-columns: 3.4rem 1fr;
  align-items: start;
  gap: var(--sp-3);
}

.row__key {
  padding-top: var(--sp-1);
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.row__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
}

.chip {
  position: relative;
  overflow: hidden;
  padding: var(--sp-1) var(--sp-3);
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

@media (max-width: 620px) {
  .filters {
    padding: var(--sp-4);
  }

  .row {
    grid-template-columns: 1fr;
    gap: var(--sp-1);
  }
}

.styles {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  padding-top: var(--sp-4);
}

/* ── 캠핑장 찾기 ─────────────────────────────── */
.find {
  padding-top: var(--sp-2);
} /* 사진 위에 놓이는 입력칸. 판을 깔지 않고 테두리만 둔다. */
.field {
  position: relative;
  margin-top: var(--sp-4);
}

.field__input {
  width: 100%;
  height: 4.1rem;
  padding: 0 var(--sp-7) 0 var(--sp-5);
  border: 1px solid rgba(var(--camp-ink-rgb), 0.32);
  background: rgba(var(--camp-shade-rgb), 0.42);
  color: var(--camp-text);
  font-family: inherit;
  font-size: var(--fs-lead);
  letter-spacing: -0.02em;
  transition:
    border-color 0.25s ease,
    background 0.25s ease;
}

.field__input::placeholder {
  color: rgba(var(--camp-ink-rgb), 0.42);
}

.field__input:hover {
  border-color: rgba(var(--camp-ink-rgb), 0.48);
}

.field__input:focus {
  outline: none;
  border-color: var(--camp-ember);
  background: rgba(var(--camp-shade-rgb), 0.62);
}

/* 검색 표시. 입력을 가리지 않게 오른쪽 끝에 둔다. */
.field__mark {
  position: absolute;
  top: 50%;
  right: 1.3rem;
  transform: translateY(-50%);
  display: flex;
  color: rgba(var(--camp-ink-rgb), 0.5);
  pointer-events: none;
}

.field__input:focus ~ .field__mark {
  color: var(--camp-ember);
}

.find__note {
  margin-top: var(--sp-3);
  font-size: var(--fs-meta);
  color: var(--camp-faint);
}

.find__note b {
  color: var(--camp-muted);
}

/* 결과가 많을 때 끊어 보여준다 */
.more {
  display: block;
  width: 100%;
  margin-top: 2px;
  padding: var(--sp-4);
  border: 0;
  background: rgba(var(--camp-ink-rgb), 0.05);
  color: var(--camp-muted);
  font-family: inherit;
  font-size: var(--fs-meta);
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.16s,
    color 0.16s;
}

.more:hover {
  background: rgba(var(--camp-ink-rgb), 0.09);
  color: var(--camp-text);
}

/* ── 종류 타일 ───────────────────────────────── */
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
  gap: var(--sp-4);
  list-style: none;
}

.tile {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 13rem;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: var(--camp-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.tile__photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* 이 화면은 사진을 보러 오는 곳이라 지역 카드보다 덜 누른다 */
  filter: saturate(0.8) brightness(0.88) contrast(1.02);
  transition: transform var(--dur-3) var(--ease);
}

.tile:hover .tile__photo {
  transform: scale(1.06);
}

/* 사진 위에 글자를 올리려면 아래쪽을 눌러야 한다 */
.tile__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(var(--camp-shade-rgb), 0.35) 0%,
    rgba(var(--camp-shade-rgb), 0.72) 55%,
    rgba(var(--camp-shade-rgb), 0.94) 100%
  );
}

.tile__body {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: flex-end;
  gap: var(--sp-1);
  padding: var(--sp-4) var(--sp-4) var(--sp-4);
}
.tile__name {
  font-size: var(--fs-title);
  font-weight: 800;
  letter-spacing: -0.03em;
  text-shadow: 0 1px 14px rgba(var(--camp-shade-rgb), 0.9);
}

.tile__line {
  font-size: var(--fs-meta);
  color: var(--camp-star);
}

.tile__note {
  margin-top: var(--sp-1);
  font-size: var(--fs-small);
  line-height: 1.6;
  color: rgba(var(--camp-ink-rgb), 0.62);
}

.tile__count {
  margin-top: var(--sp-2);
  font-size: var(--fs-micro);
  color: var(--camp-faint);
}

/* 고른 타일은 테두리로 표시한다. 사진을 가리지 않는 방법이다. */
.tile--on {
  box-shadow: inset 0 0 0 2px var(--camp-ember);
}

/* ── 안내 ────────────────────────────────────── */
.hint {
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.hint--bad {
  color: var(--camp-danger);
}

.skeletons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
  gap: var(--sp-4);
}

/* ── 야영장 목록 ─────────────────────────────── */
.list {
  scroll-margin-top: var(--sp-8);
}

.list__head {
  margin-bottom: var(--sp-4);
}

.list__title {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  font-size: var(--fs-title);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.list__count {
  font-size: var(--fs-meta);
  font-weight: 600;
  color: var(--camp-ember);
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

/* 카드 전체가 버튼이다. 안의 글자를 덮되 읽기는 그대로 되게 위에 투명한 판을 깐다. */
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
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
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
  /* 소개 글 길이가 제각각이라 태그부터 아래로 붙인다. 그래야 예약 링크 줄이 맞는다. */
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
  .tiles,
  .cards,
  .skeletons {
    grid-template-columns: 1fr;
  }

  .tile {
    min-height: 11rem;
  }
}
</style>
