<script setup>
/**
 * 날씨 화면. 지도와 지수판, 검색과 정렬이 여기 모인다.
 *
 * 반응형 상태는 전부 이 부모가 들고, 자식은 props 로 받아 emits 로 올린다.
 * 보기 모드(?view=)와 검색어(?q=)는 주소에 실어 링크를 주고받을 수 있게 한다.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSkeleton, NSelect, NEmpty, NButton, NAlert, useMessage } from 'naive-ui'
import PageHero from '@/components/PageHero.vue'
import BaseDashboardCard from '@/components/BaseDashboardCard.vue'
import DistrictPanel from '@/components/DistrictPanel.vue'
import DistrictSheet from '@/components/DistrictSheet.vue'
import RegionMap from '@/components/RegionMap.vue'
import RankingPanel from '@/components/RankingPanel.vue'
import WeekPanel from '@/components/WeekPanel.vue'
import SearchBar from '@/components/SearchBar.vue'
import WeatherCard from '@/components/WeatherCard.vue'
import { useTemperature } from '@/composables/useTemperature'
import { useWeatherStore } from '@/stores/weatherStore'

const router = useRouter()
const route = useRoute()

const message = useMessage()
const weatherStore = useWeatherStore()
const { unitSymbol, toDisplay } = useTemperature()

/* ── 반응형 상태 ─────────────────────────────────────── */
const searchQuery = ref(route.query.q ?? '') // 검색어 (URL ?q= 와 동기화)
const selectedCityInfo = ref(null) // 선택된 지역
const sortKey = ref('score') // 정렬 기준
const SORT_OPTIONS = [
  { label: '모닥불 지수순', value: 'score' },
  { label: '밤 추운순', value: 'night' },
  { label: '이름순', value: 'name' },
]
/*
 * 보기 모드: 지도 / 목록 / 순위.
 * 셋 다 "오늘 어디가 좋은가" 를 답한다. 주소로도 열 수 있게 해서
 * 내비 드롭다운이 곧바로 그 모드로 들어오게 한다.
 */
const VIEWS = ['map', 'list', 'rank', 'week']
const view = ref(VIEWS.includes(route.query.view) ? route.query.view : 'map')

// 주소를 갈아끼워 새로고침하거나 링크를 복사해도 같은 모드가 열리게 한다
watch(view, (next) => {
  router.replace({ query: { ...route.query, view: next === 'map' ? undefined : next } })
})

watch(
  () => route.query.view,
  (next) => {
    if (VIEWS.includes(next) && next !== view.value) view.value = next
    else if (!next && view.value !== 'map') view.value = 'map'
  },
)

onMounted(async () => {
  await weatherStore.load()
  // 날씨보다 급하지 않으므로 목록이 그려진 뒤에 사진을 채운다
  weatherStore.loadPhotos()
})

/* ── 파생값 ─────────────────────────────────────────── */
const cities = computed(() => weatherStore.scoredCities)

// 검색어가 지역 이름에 포함된 항목만
const filteredWeatherList = computed(() =>
  cities.value.filter((city) => city.name.includes(searchQuery.value.trim())),
)

const hasQuery = computed(() => searchQuery.value.trim().length > 0)

// 본인 computed: 검색 → 관심 필터 → 정렬을 차례로 적용한 최종 목록
const visibleList = computed(() => {
  let list = hasQuery.value ? filteredWeatherList.value : cities.value

  const sorted = [...list]
  if (sortKey.value === 'score') sorted.sort((a, b) => b.score - a.score)
  else if (sortKey.value === 'night') sorted.sort((a, b) => a.nightLow - b.nightLow)
  else if (sortKey.value === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  return sorted
})

// 지금 보고 있는 지역들의 밤 최저기온 평균
const averageNightLow = computed(() => {
  if (!visibleList.value.length) return 0
  const sum = visibleList.value.reduce((acc, city) => acc + city.nightLow, 0)
  return Math.round((sum / visibleList.value.length) * 10) / 10
})

const goodCount = computed(() => visibleList.value.filter((city) => city.score >= 62).length)

/* ── 검색어를 주소(?q=)에 실어 둔다 ──────────────────────
 * 값이 같으면 아무것도 하지 않으므로 두 watch 가 서로를 무한히 부르지 않는다.
 */
watch(searchQuery, (query) => {
  const next = query.trim()
  if ((route.query.q ?? '') === next) return
  router.replace({ query: next ? { q: next } : {} })
})

watch(
  () => route.query.q,
  (q) => {
    const next = q ?? ''
    if (next !== searchQuery.value) searchQuery.value = next
  },
)

/* ── 이벤트 핸들러 ───────────────────────────────────── */

// SearchBar 가 올려 보낸 검색어를 받는다
function onUpdateQuery(query) {
  searchQuery.value = query
}

function onSelectCard(city) {
  selectedCityInfo.value = city
}

/*
 * 지도에서 지역을 고르면 지도는 그 지역으로 들어가고,
 * 아래에는 전국 열일곱이 아니라 그 지역의 시군구가 깔린다.
 * 지도만 확대하고 아래는 그대로 두면 무엇을 고른 건지 반쯤만 답한 셈이 된다.
 */
function goDistrict(row) {
  router.push(`/weather/${selectedCityInfo.value.id}?district=${row.code}`)
}

function clearRegion() {
  selectedCityInfo.value = null
}

/* 시군구 고르기 드로어 */
const pickCity = ref(null)
const pickOpen = ref(false)
const pickNarrow = ref(false)
let pickMedia = null

function syncPickNarrow(event) {
  pickNarrow.value = event.matches
}

onMounted(() => {
  pickMedia = window.matchMedia('(max-width: 620px)')
  pickNarrow.value = pickMedia.matches
  pickMedia.addEventListener('change', syncPickNarrow)
})

onBeforeUnmount(() => pickMedia?.removeEventListener('change', syncPickNarrow))

/*
 * 지역을 눌러도 바로 넘기지 않고 시군구를 한 번 더 고르게 한다.
 * "경기" 한 덩어리의 상세는 너무 넓어서 어디로 갈지 정하는 데 쓸 수가 없다.
 */
function onClickDetail(city) {
  pickCity.value = city
  pickOpen.value = true
}

// 검색으로 찾은 지역을 목록에 더하고, 검색어를 그 이름으로 맞춰 바로 보이게 한다.
async function onAddPlace(place) {
  await weatherStore.addPlace(place)
  searchQuery.value = place.name
  message.success(`'${place.name}' 을(를) 목록에 추가했습니다`)
}
</script>

<template>
  <div class="home">
    <PageHero
      photo="regions"
      eyebrow="날씨"
      title="오늘 어디가 제일 잘 탈까"
      lead="비·바람·밤 기온·공기·하늘을 모아 100점으로 잽니다."
    />

    <!-- :value + @input 을 직접 엮는다. 한글 조합 중에도 값을 올리려고 -->
    <!-- 검색은 지도·목록에만 걸린다. 순위·주간 보기에서는 아무것도 안 하므로 숨긴다. -->
    <BaseDashboardCard v-if="view === 'map' || view === 'list'" title="지역 검색">
      <SearchBar :query="searchQuery" @update-query="onUpdateQuery" />
    </BaseDashboardCard>

    <!-- 한반도 지도 위에 지역을 얹는다 -->
    <BaseDashboardCard v-if="view === 'map'" title="지도">
      <template #actions>
        <button class="switch" type="button" @click="view = 'rank'">오늘의 지수</button>
        <button class="switch" type="button" @click="view = 'week'">이번 주</button>
        <button class="switch" type="button" @click="view = 'list'">목록으로</button>
      </template>
      <RegionMap
        :cities="visibleList"
        :selected-id="selectedCityInfo?.id ?? null"
        @select-city="onSelectCard"
        @open-city="onClickDetail"
      />
    </BaseDashboardCard>

    <!-- 순위 · 이번 주 모드 -->
    <RankingPanel v-if="view === 'rank'" @close="view = 'map'" @pick="onClickDetail" />
    <WeekPanel v-else-if="view === 'week'" @close="view = 'map'" />

    <!-- 지도에서 지역을 골랐으면, 아래는 그 지역의 시군구 -->
    <BaseDashboardCard
      v-else-if="view === 'map' && selectedCityInfo"
      :title="`${selectedCityInfo.name} 안에서 고르기`"
    >
      <template #actions>
        <span class="stat">
          <b class="num">{{ selectedCityInfo.score }}</b
          >점 · {{ selectedCityInfo.grade.label }}
        </span>
        <button class="switch" type="button" @click="onClickDetail(selectedCityInfo)">
          {{ selectedCityInfo.name }} 전체 보기
        </button>
        <button class="switch" type="button" @click="clearRegion">전국으로</button>
      </template>

      <DistrictPanel
        :sido-code="selectedCityInfo.code"
        :parent-pm10="selectedCityInfo.pm10"
        @select-district="goDistrict"
      />
    </BaseDashboardCard>

    <BaseDashboardCard v-else title="지역별 모닥불 지수">
      <template #actions>
        <!-- 문장으로 늘어놓지 않고 숫자만 둔다 -->
        <span class="stat">
          <b class="num">{{ visibleList.length }}</b
          >곳
          <span class="stat__sep">·</span>
          추천 <b class="num">{{ goodCount }}</b
          >곳
          <span class="stat__sep">·</span>
          밤 평균 <b class="num">{{ toDisplay(averageNightLow) }}{{ unitSymbol }}</b>
        </span>
        <button v-if="view === 'map'" class="switch" type="button" @click="view = 'list'">
          목록만
        </button>
        <button v-else class="switch" type="button" @click="view = 'map'">지도 보기</button>
        <button class="switch" type="button" @click="view = 'rank'">오늘의 지수</button>
        <button class="switch" type="button" @click="view = 'week'">이번 주</button>
        <NSelect
          v-model:value="sortKey"
          class="sort"
          :options="SORT_OPTIONS"
          size="small"
          :consistent-menu-width="false"
        />
      </template>

      <NAlert
        v-if="weatherStore.error"
        type="error"
        :bordered="false"
        title="관측값을 불러오지 못했습니다"
        class="alert"
      >
        {{ weatherStore.error }}
        <template #action>
          <NButton size="small" @click="weatherStore.refresh()">다시 시도</NButton>
        </template>
      </NAlert>

      <NSkeleton
        v-else-if="weatherStore.loading && !cities.length"
        :repeat="4"
        height="232px"
        :sharp="false"
        class="cards-skeleton"
      />

      <!-- 로딩 / 결과 없음 / 목록 -->
      <!-- (1) 검색어가 비었을 때: 전체 -->
      <template v-else-if="!hasQuery">
        <ul v-if="visibleList.length" class="cards">
          <li v-for="city in visibleList" :key="city.id">
            <WeatherCard
              :city="city"
              :selected="city.id === selectedCityInfo?.id"
              @click-detail="onClickDetail"
            />
          </li>
        </ul>
        <NEmpty v-else description="보여줄 지역이 없습니다" size="small" />
      </template>

      <!-- (2) 검색어와 일치하는 데이터가 있을 때 -->
      <ul v-else-if="filteredWeatherList.length" class="cards">
        <li v-for="city in visibleList" :key="city.id">
          <WeatherCard
            :city="city"
            :selected="city.id === selectedCityInfo?.id"
            @click-detail="onClickDetail"
          />
        </li>
      </ul>

      <!-- (3) 일치하는 데이터가 없을 때: 목록에 없다고 끝내지 않고 Geocoding 으로 찾아본다 -->
      <div v-else class="nomatch">
        <p class="empty">목록에 "{{ searchQuery }}" 가 없습니다.</p>

        <NButton
          v-if="!weatherStore.searchResults.length"
          type="primary"
          :loading="weatherStore.searching"
          @click="weatherStore.searchPlace(searchQuery)"
        >
          {{ weatherStore.searching ? '찾는 중' : `'${searchQuery}' 지역 찾기` }}
        </NButton>

        <ul v-else class="found">
          <li v-for="place in weatherStore.searchResults" :key="`${place.lat},${place.lon}`">
            <button class="found__item" type="button" @click="onAddPlace(place)">
              <span class="found__name">{{ place.name }}</span>
              <span class="found__region">{{ place.region }}</span>
              <span class="num found__coord">{{ place.lat }}, {{ place.lon }}</span>
              <span class="found__add">추가</span>
            </button>
          </li>
        </ul>
      </div>
    </BaseDashboardCard>

    <!-- 지역을 누르면 시군구를 한 번 더 고른다 -->
    <DistrictSheet v-model:show="pickOpen" :city="pickCity" :narrow="pickNarrow" />
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

/* 목록 */
.sort {
  min-width: 7.5rem;
}

.alert {
  margin-bottom: var(--sp-2);
}

.cards-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
  gap: var(--sp-4);
}

/* 바둑판처럼 나란히 놓는다 */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
  gap: var(--sp-4);
  list-style: none;
}

@media (max-width: 560px) {
  .cards,
  .cards-skeleton {
    grid-template-columns: 1fr;
  }
}

.nomatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-1);
  padding-bottom: var(--sp-3);
}

.found {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  width: 100%;
  margin-top: var(--sp-2);
  list-style: none;
}

.found__item {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--camp-line);
  border-radius: var(--camp-radius-sm);
  background: var(--camp-bg);
  color: var(--camp-text);
  font-family: inherit;
  font-size: var(--fs-meta);
  text-align: left;
  cursor: pointer;
}

.found__item:hover {
  border-color: var(--camp-ember-dim);
}

.found__name {
  font-weight: 700;
}

.found__region {
  font-size: var(--fs-small);
  color: var(--camp-muted);
}

.found__coord {
  margin-left: auto;
  font-size: var(--fs-micro);
  color: var(--camp-faint);
}

.found__add {
  font-size: var(--fs-small);
  color: var(--camp-ember);
}

.empty {
  padding: var(--sp-5) 0;
  text-align: center;
  font-size: var(--fs-meta);
  color: var(--camp-faint);
}

/* 컨트롤 */
/* 판 제목 옆의 숫자 요약 */
.stat {
  font-size: var(--fs-small);
  color: var(--camp-faint);
  white-space: nowrap;
}

.stat b {
  color: var(--camp-muted);
}

.stat__sep {
  margin: 0 var(--sp-0);
  opacity: 0.5;
}

.switch {
  flex-shrink: 0;
  white-space: nowrap;
  padding: var(--sp-1) var(--sp-2);
  border: 1px solid var(--camp-line);
  border-radius: var(--camp-radius-sm);
  background: transparent;
  color: var(--camp-muted);
  font-family: inherit;
  font-size: var(--fs-small);
  cursor: pointer;
}

.switch:hover {
  color: var(--camp-text);
}

.chip {
  flex-shrink: 0;
  white-space: nowrap;
  padding: var(--sp-1) var(--sp-2);
  border: 1px solid var(--camp-line);
  border-radius: var(--camp-radius-sm);
  background: var(--camp-bg);
  color: var(--camp-muted);
  font-family: inherit;
  font-size: var(--fs-small);
  cursor: pointer;
}

.chip--on {
  border-color: color-mix(in srgb, var(--camp-star) 45%, transparent);
  color: var(--camp-star);
}
</style>
