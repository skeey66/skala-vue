<script setup>
/**
 * 지역 상세.
 *
 * /weather/:cityId 로 들어온다. 시군구는 ?district= 로 한 겹 더 좁힌다.
 *
 * 5일 야간 예보와 근처 야영장은 이 화면에 들어왔을 때만 부른다.
 * 목록 화면에서 열일곱 지역을 미리 받아 두면 호출이 감당이 안 된다.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWeatherStore } from '@/stores/weatherStore'
import { useTemperature } from '@/composables/useTemperature'
import {
  sleepingBag,
  windNote,
  nightFireScore,
  campingStyle,
  matchesStyle,
  weakestLink,
  effectiveWind,
} from '@/composables/useBonfireScore'
import { NSkeleton, NEmpty, NTag, NButton, NAlert } from 'naive-ui'
import { fetchForecast, fetchNightlyOutlook, iconUrl } from '@/api/openWeatherApi'
import { fetchNearbyCampsites, hasGoCampingKey } from '@/api/goCampingApi'
import CampMap from '@/components/CampMap.vue'
import CampSheet from '@/components/CampSheet.vue'
import DistrictPanel from '@/components/DistrictPanel.vue'
import municipalities from '@/data/koreaMunicipalities.json'

const props = defineProps({
  cityId: { type: String, required: true },
})

const route = useRoute()
const router = useRouter()
const weatherStore = useWeatherStore()
const { unitSymbol, toDisplay } = useTemperature()

const city = computed(() => weatherStore.getCity(props.cityId))

// 검색으로 더한 지역인지 (기본 10곳은 city_ 로 시작한다)
const isAddedPlace = computed(() => props.cityId.startsWith('geo_'))

function removePlace() {
  weatherStore.removePlace(props.cityId)
  router.push('/')
}
const bag = computed(() => (subject.value ? sleepingBag(subject.value.nightLow) : null))
const wind = computed(() => (subject.value ? windNote(subject.value) : null))

// 오늘 날씨에 맞는 캠핑 방식. 아래 야영장 목록도 이 기준으로 표시한다.
const style = computed(() => (subject.value ? campingStyle(subject.value) : null))
const weak = computed(() => (subject.value ? weakestLink(subject.value) : null))

// 지도에 강조할 야영장
const pickedIds = computed(() =>
  style.value
    ? campsites.value.filter((camp) => matchesStyle(camp, style.value)).map((camp) => camp.id)
    : [],
)

/*
 * 사진 있는 야영장만, 추천 방식에 맞는 곳을 앞으로.
 * 고캠핑은 등록 사진이 없는 곳이 3분의 1쯤 되는데, 빈 자리가 섞이면 목록이 성기게 보인다.
 */
const sortedCamps = computed(() => {
  const withPhoto = campsites.value.filter((camp) => camp.image)
  if (!style.value) return withPhoto
  return [...withPhoto].sort(
    (a, b) => Number(matchesStyle(b, style.value)) - Number(matchesStyle(a, style.value)),
  )
})

/*
 * 시군구 드릴다운.
 *
 * 고른 시군구는 주소(?district=)에 싣는다. 그래야 링크를 주고받을 수 있고
 * 뒤로 가기가 "시도 전체" 로 되돌아간다. 상태를 컴포넌트 안에만 두면 둘 다 안 된다.
 *
 * 좌표와 이름은 정적 파일에서 바로 꺼내 쓰고(기다릴 필요가 없다),
 * 점수는 아래 DistrictPanel 이 계산해 올려 주는 것을 받는다. 같은 값을 두 번 부르지 않으려고.
 */
const districtCode = computed(() => route.query.district || null)

const district = computed(
  () => municipalities.find((spot) => spot.code === districtCode.value) ?? null,
)

const districtRows = ref([])
const districtRow = computed(
  () => districtRows.value.find((row) => row.code === districtCode.value) ?? null,
)

/*
 * 이 화면이 답하는 대상. 시군구를 골랐으면 그 시군구가 주인공이다.
 * 아직 점수가 안 올라왔으면 시도 값으로 버틴다 — 빈 화면보다는 낫다.
 */
const subject = computed(() => districtRow.value ?? city.value)
const subjectName = computed(() => district.value?.name ?? city.value?.name ?? '')

const forecast = ref([])
const nights = ref([])
const campsites = ref([])

// 야영장 상세는 드로어로 연다. 목록이 길어지지 않고 사진을 크게 볼 수 있다.
/*
 * 고캠핑은 원본 사진이 없고 썸네일만 등록된 곳이 있다(404).
 * 그때는 썸네일로 되돌린다. 안 그러면 빈 칸이 그대로 남는다.
 */
function onPhotoError(event, thumb) {
  const el = event.target
  if (thumb && !el.dataset.fellBack) {
    el.dataset.fellBack = '1'
    el.src = thumb
  }
}

// 지도와 목록을 잇는 끈. 어느 쪽에 마우스를 올려도 반대쪽이 같이 켜진다.
const activeCamp = ref(null)

const openCamp = ref(null)
// 드로어 열림 여부. openCamp 는 내용이라 닫는 애니메이션 동안 남겨 둬야 한다.
const sheetOpen = ref(false)

/**
 * 좁은 화면에서는 오른쪽 드로어 대신 아래에서 올라오는 시트로 연다.
 * 폭 480px 을 그대로 쓰면 화면 밖으로 넘어간다.
 */
const isNarrow = ref(false)
let mediaQuery = null

function syncNarrow(event) {
  isNarrow.value = event.matches
}

onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 620px)')
  isNarrow.value = mediaQuery.matches
  mediaQuery.addEventListener('change', syncNarrow)
})

onBeforeUnmount(() => {
  clearTimeout(loadTimer)
  mediaQuery?.removeEventListener('change', syncNarrow)
})
const loadingExtra = ref(false)
const campError = ref('')

const sunTimes = computed(() => {
  if (!city.value) return { rise: '', set: '' }
  return {
    rise: new Date(city.value.sunrise).toTimeString().slice(0, 5),
    set: new Date(city.value.sunset).toTimeString().slice(0, 5),
  }
})

/**
 * Mount 시점에 해당 지역의 예보와 야영장을 받아온다.
 * 순위 화면에서 다른 지역으로 넘어오면 같은 컴포넌트가 재사용되어
 * 재마운트가 일어나지 않으므로 cityId 변화도 함께 감시한다.
 */
async function loadDetail() {
  if (weatherStore.isEmpty) await weatherStore.load()
  if (!city.value) return

  loadingExtra.value = true
  campError.value = ''
  forecast.value = []
  nights.value = []
  campsites.value = []
  sheetOpen.value = false

  const target = district.value
    ? { lat: district.value.lat, lon: district.value.lon }
    : { lat: city.value.lat, lon: city.value.lon }

  const [forecastResult, nightResult, campResult] = await Promise.allSettled([
    fetchForecast(target, 8),
    fetchNightlyOutlook(target),
    hasGoCampingKey()
      ? fetchNearbyCampsites(target, { radius: district.value ? 15000 : 20000, count: 8 })
      : Promise.reject(new Error('고캠핑 API 키가 없습니다.')),
  ])

  if (forecastResult.status === 'fulfilled') forecast.value = forecastResult.value
  if (nightResult.status === 'fulfilled') nights.value = nightResult.value
  if (campResult.status === 'fulfilled') campsites.value = campResult.value
  else campError.value = campResult.reason?.message ?? '야영장 정보를 불러오지 못했습니다.'

  loadingExtra.value = false
}

onMounted(loadDetail)
/*
 * 시군구를 훑어보듯 눌러 보면 누를 때마다 예보·야간·야영장 세 곳을 부른다.
 * 그러면 금세 429(요청이 몰림)가 난다. 손이 멎은 뒤에 한 번만 부른다.
 */
let loadTimer = 0

function scheduleLoad() {
  clearTimeout(loadTimer)
  loadTimer = window.setTimeout(loadDetail, 320)
}

watch([() => props.cityId, districtCode], scheduleLoad)

/*
 * 시군구를 고르면 주소만 바꾼다. 나머지는 위 watch 가 알아서 다시 받는다.
 * 같은 곳을 다시 누르면 시도 전체로 되돌아간다.
 */
function onSelectDistrict(row) {
  const next = districtCode.value === row.code ? undefined : row.code
  router.replace({ query: { ...route.query, district: next } })
}

function hourLabel(time) {
  return new Date(time).toTimeString().slice(0, 5)
}

// 예보 막대 높이. 8구간 중 최고/최저 사이에서 상대 위치를 잡는다.
const forecastRange = computed(() => {
  if (!forecast.value.length) return { min: 0, max: 1 }
  const temps = forecast.value.map((slot) => slot.temp)
  return { min: Math.min(...temps), max: Math.max(...temps) }
})

// 5일 밤 중 가장 좋은 날
const bestNight = computed(() => {
  if (!nights.value.length) return null
  return [...nights.value].sort((a, b) => nightFireScore(b) - nightFireScore(a))[0]
})

/*
 * 관측값 아홉 가지. 표가 아니라 목록으로 두고, 단위를 값에 붙여서 만든다.
 * 라벨과 값을 다른 칸에 나눠 넣으면 읽는 사람이 눈으로 다시 짝지어야 한다.
 */
const observations = computed(() => {
  if (!city.value) return []
  const c = city.value
  return [
    { label: '지금 기온', value: `${toDisplay(c.temp)}${unitSymbol.value}` },
    { label: '체감', value: `${toDisplay(c.feelsLike)}${unitSymbol.value}` },
    { label: '하늘', value: c.status },
    { label: '습도', value: `${c.humidity}%` },
    { label: '구름', value: `${c.clouds}%` },
    { label: '자외선', value: `${c.uvIndex}` },
    { label: '미세먼지', value: `${c.dust} ${c.pm10}` },
    { label: '해발', value: `${c.elevation}m` },
    { label: '일출 · 일몰', value: `${sunTimes.value.rise} · ${sunTimes.value.set}` },
  ]
})

// 사진은 CampSheet 가 열릴 때 스스로 받는다
function showCamp(camp) {
  openCamp.value = camp
  sheetOpen.value = true
}

function barHeight(temp) {
  const { min, max } = forecastRange.value
  if (max === min) return 50
  return 18 + ((temp - min) / (max - min)) * 62
}
</script>

<template>
  <div v-if="city" class="detail">
    <header class="detail__head">
      <div>
        <p class="eyebrow">
          <button v-if="district" class="up" type="button" @click="onSelectDistrict(district)">
            <span aria-hidden="true">←</span> {{ city.name }} 전체
          </button>
          <template v-else>{{ city.region }}</template>
        </p>
        <h2 class="detail__name">
          <img
            v-if="city.icon"
            class="detail__icon"
            :src="iconUrl(city.icon)"
            :alt="city.status"
            width="42"
            height="42"
          />
          {{ subjectName }}
        </h2>
      </div>

      <div class="detail__actions">
        <NButton v-if="isAddedPlace" quaternary size="small" @click="removePlace">
          목록에서 제거
        </NButton>
      </div>
    </header>

    <!-- 오늘 요약 -->
    <section class="verdict" :class="`verdict--${subject.grade.tone}`">
      <div class="verdict__score">
        <span class="num verdict__value">{{ subject.score }}</span>
        <span class="verdict__label">{{ subject.grade.label }}</span>
      </div>
      <div class="verdict__lines">
        <p>
          밤 최저
          <strong class="num">{{ toDisplay(subject.nightLow) }}{{ unitSymbol }}</strong>
          · {{ bag.label }}<span class="verdict__hint"> ({{ bag.hint }})</span>
        </p>
        <p>
          <!-- 판정은 돌풍으로 하므로 표시도 돌풍으로. 평균을 적으면 판정과 어긋나 보인다. -->
          바람 <strong class="num">{{ effectiveWind(subject) }}</strong
          >m/s · {{ wind.label }}
        </p>
        <p v-if="weak" class="verdict__weak">
          <strong>{{ weak.key }}</strong
          >에서 <strong class="num">{{ weak.lost }}점</strong> 깎였습니다 · {{ weak.label }}
        </p>
      </div>
    </section>

    <!-- 오늘에 맞는 캠핑 방식 -->
    <section class="style">
      <p class="eyebrow">오늘은</p>
      <h3 class="style__label">{{ style.label }}</h3>
      <p class="style__why">{{ style.why }}</p>
    </section>

    <!-- 관측값 -->
    <section class="panel">
      <p class="eyebrow">관측값{{ district ? ' · ' + city.name + ' 관측소' : '' }}</p>
      <!-- 야영장 상세와 같은 형태로 둔다. 라벨 위에 값. -->
      <ul class="obs">
        <li v-for="item in observations" :key="item.label" class="obs__item">
          <span class="obs__label">{{ item.label }}</span>
          <span class="num obs__value">{{ item.value }}</span>
        </li>
      </ul>
    </section>

    <!-- 5일 야간 예보 -->
    <section class="panel">
      <p class="eyebrow">이번 주</p>
      <NSkeleton v-if="loadingExtra && !nights.length" :repeat="5" height="30px" :sharp="false" />
      <template v-else-if="nights.length">
        <p class="nights__lead">
          가장 좋은 밤은
          <strong>{{ bestNight.label }}({{ bestNight.weekday }})</strong>
          입니다. 밤 최저
          <strong class="num">{{ toDisplay(bestNight.nightLow) }}{{ unitSymbol }}</strong>
        </p>
        <table class="nights">
          <thead>
            <tr>
              <th scope="col" class="nights__day">날짜</th>
              <th scope="col">지수</th>
              <th scope="col">밤 최저</th>
              <th scope="col">비</th>
              <th scope="col">돌풍</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="night in nights"
              :key="night.key"
              class="night"
              :class="{ 'night--best': night.key === bestNight.key }"
            >
              <th scope="row" class="nights__day">
                {{ night.label }} <span class="night__weekday">{{ night.weekday }}</span>
              </th>
              <td class="num night__score">{{ nightFireScore(night) }}</td>
              <td class="num">{{ toDisplay(night.nightLow) }}{{ unitSymbol }}</td>
              <td class="num" :class="{ 'night__rain--on': night.rainProb >= 50 }">
                {{ night.rainProb }}%
              </td>
              <td class="num">{{ night.wind }}m/s</td>
            </tr>
          </tbody>
        </table>
        <p class="nights__foot">그날 저녁 6시부터 다음 날 아침 6시까지의 예보로 셉니다</p>
      </template>
      <p v-else class="muted">야간 예보를 불러오지 못했습니다.</p>
    </section>

    <!-- 시간대별 예보 -->
    <section class="panel">
      <p class="eyebrow">24시간 예보</p>
      <NSkeleton v-if="loadingExtra && !forecast.length" height="120px" :sharp="false" />
      <ul v-else-if="forecast.length" class="chart">
        <li v-for="slot in forecast" :key="slot.time" class="chart__col">
          <span class="num chart__temp">{{ toDisplay(slot.temp) }}</span>
          <span
            class="chart__bar"
            :class="{ 'chart__bar--rain': slot.rainProb >= 50 }"
            :style="{ height: `${barHeight(slot.temp)}px` }"
          ></span>
          <span
            v-if="slot.rainProb > 0"
            class="num chart__pop"
            :class="{ 'chart__pop--on': slot.rainProb >= 50 }"
          >
            {{ slot.rainProb }}%
          </span>
          <span class="num chart__hour">{{ hourLabel(slot.time) }}</span>
        </li>
      </ul>
      <p v-else class="muted">예보를 불러오지 못했습니다.</p>
    </section>

    <!-- 시군구 -->
    <section class="panel">
      <p class="eyebrow">{{ city.region }} 안에서</p>
      <DistrictPanel
        :sido-code="city.code"
        :parent-pm10="city.pm10"
        :selected-code="districtCode"
        @select-district="onSelectDistrict"
        @loaded="districtRows = $event"
      />
    </section>

    <!-- 근처 야영장 -->
    <section class="panel">
      <p class="eyebrow camps__head">
        <template v-if="district">{{ district.name }} 반경 15km 야영장</template>
        <template v-else>{{ city.name }} 반경 20km 야영장</template>
      </p>

      <CampMap
        v-if="campsites.length"
        class="camps__map"
        :center="
          district
            ? { lat: district.lat, lon: district.lon, name: district.name }
            : { lat: city.lat, lon: city.lon, name: city.name }
        "
        :camps="sortedCamps"
        :picked="pickedIds"
        :radius="district ? 15000 : 20000"
        :active-id="activeCamp"
        @open-camp="showCamp"
        @hover-camp="activeCamp = $event"
      />

      <NSkeleton
        v-if="loadingExtra && !campsites.length"
        :repeat="3"
        height="70px"
        :sharp="false"
      />
      <NAlert v-else-if="campError" type="warning" :bordered="false" size="small">
        {{ campError }}
        <template #action>
          <NButton size="small" @click="loadDetail">다시 시도</NButton>
        </template>
      </NAlert>
      <ul v-else-if="campsites.length" class="camps">
        <li
          v-for="(camp, index) in sortedCamps"
          :key="camp.id"
          class="camp"
          :class="{ 'camp--on': activeCamp === camp.id }"
          @mouseenter="activeCamp = camp.id"
          @mouseleave="activeCamp = null"
        >
          <button class="camp__main" type="button" @click="showCamp(camp)">
            <span class="num camp__no">{{ index + 1 }}</span>
            <span class="camp__thumb">
              <img
                v-if="camp.image"
                :src="camp.image"
                :alt="camp.name"
                loading="lazy"
                @error="onPhotoError($event, camp.thumb)"
              />
              <span v-else class="camp__thumb-empty">사진 없음</span>
            </span>

            <span class="camp__body">
              <span class="camp__title">
                <span class="camp__name">
                  {{ camp.name }}
                  <span v-if="matchesStyle(camp, style)" class="camp__pick">오늘 추천</span>
                </span>
                <span v-if="camp.distance !== null" class="num camp__dist">
                  {{ camp.distance }}km
                </span>
              </span>
              <span v-if="camp.intro" class="camp__intro">{{ camp.intro }}</span>
              <span class="camp__addr">{{ camp.address }}</span>

              <span class="camp__tags">
                <NTag v-if="camp.type" type="success" size="small" round :bordered="false">
                  {{ camp.type }}
                </NTag>
                <NTag
                  v-if="camp.brazier"
                  :type="camp.brazier.includes('불가') ? 'error' : 'warning'"
                  size="small"
                  round
                  :bordered="false"
                >
                  화로대 {{ camp.brazier }}
                </NTag>
                <NTag
                  v-for="terrain in camp.terrain"
                  :key="terrain"
                  size="small"
                  round
                  :bordered="false"
                >
                  {{ terrain }}
                </NTag>
              </span>
            </span>

            <span class="camp__chev">›</span>
          </button>
        </li>
      </ul>
      <NEmpty v-else description="반경 20km 안에 등록된 야영장이 없습니다" size="small" />
    </section>

    <NButton quaternary @click="router.push('/regions')">← 지역 목록</NButton>

    <!-- 야영장 상세 -->
    <CampSheet v-model:show="sheetOpen" :camp="openCamp" :narrow="isNarrow" />
  </div>

  <!-- 없는 지역 코드로 들어온 경우 -->
  <div v-else class="missing">
    <p class="missing__icon">🏕️</p>
    <p class="missing__title">'{{ cityId }}' 지역을 찾을 수 없습니다.</p>
    <NButton quaternary @click="router.push('/regions')">← 지역 목록</NButton>
  </div>
</template>

<style scoped>
/* 시도 전체로 되돌아가는 길. 눈썹 자리에 두어 제목을 밀어내지 않는다. */
.up {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  letter-spacing: inherit;
  cursor: pointer;
}

.up:hover {
  color: var(--camp-ember);
}

.detail {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.detail__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sp-4);
}

.detail__name {
  display: flex;
  align-items: center;
  gap: var(--sp-0);
  font-size: var(--fs-display);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.detail__icon {
  margin-left: -var(--sp-2);
  filter: saturate(0.85);
}

/* 관측값. 야영장 상세의 머리 셋과 같은 형태 */
/* 관측값이 아홉이라 3열로 두면 딱 떨어진다. 자동 배치는 빈칸을 남긴다. */
.obs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  list-style: none;
}

.obs__item {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  padding: var(--sp-3) var(--sp-4);
  background: rgba(var(--camp-ink-rgb), 0.04);
}

.obs__label {
  font-size: var(--fs-micro);
  color: var(--camp-faint);
}

.obs__value {
  font-size: var(--fs-body);
  font-weight: 600;
  color: var(--camp-text);
}

/* 5일 야간 예보 */
.nights__lead {
  margin-bottom: var(--sp-4);
  font-size: var(--fs-meta);
  color: var(--camp-muted);
}

.nights__lead strong {
  color: var(--camp-text);
}

.nights {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-meta);
}

.nights thead th {
  padding: 0 var(--sp-2) var(--sp-2);
  border-bottom: 1px solid rgba(var(--camp-ink-rgb), 0.12);
  font-family: var(--font-data);
  font-size: var(--fs-micro);
  font-weight: 600;
  color: var(--camp-faint);
  text-align: right;
}

.nights__day {
  text-align: left !important;
}

.night td,
.night th {
  padding: var(--sp-2) var(--sp-2);
  border-bottom: 1px solid rgba(var(--camp-ink-rgb), 0.07);
  text-align: right;
  color: var(--camp-muted);
  font-weight: 400;
}

.night th {
  font-family: var(--font-data);
  color: var(--camp-text);
}

.night__weekday {
  color: var(--camp-faint);
}

.night__score {
  color: var(--camp-text) !important;
  font-weight: 700;
}

/* 가장 좋은 밤 한 줄만 세운다 */
.night--best th,
.night--best td {
  background: rgba(var(--camp-ember-rgb), 0.07);
}

.night--best .night__score {
  color: var(--camp-ember) !important;
}

.night__rain--on {
  color: var(--camp-dawn) !important;
}

.nights__foot {
  margin-top: var(--sp-3);
  font-size: var(--fs-micro);
  color: var(--camp-faint);
}

.fav {
  padding: var(--sp-1) var(--sp-3);
  border: 1px solid var(--camp-line);
  border-radius: 999px;
  background: transparent;
  color: var(--camp-muted);
  font-size: var(--fs-small);
  cursor: pointer;
}
.detail__actions {
  display: flex;
  gap: var(--sp-1);
  flex-wrap: wrap;
} /* 오늘 판정 */
.verdict {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-5) var(--sp-5);
  background: rgba(var(--camp-shade-rgb), 0.82);
  border-top: 1px solid rgba(var(--camp-ink-rgb), 0.14);
}

/* 등급은 테두리 색이 아니라 점수 글자가 말한다 */
.verdict__score {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 3.4rem;
}

.verdict__value {
  font-size: var(--fs-hero);
  font-weight: 700;
  line-height: 1;
}

.verdict__label {
  font-size: var(--fs-small);
  color: var(--camp-muted);
}

.verdict__lines {
  font-size: var(--fs-meta);
  color: var(--camp-muted);
}

.verdict__lines strong {
  color: var(--camp-text);
}

.verdict__hint {
  color: var(--camp-faint);
}

/* 오늘에 맞는 캠핑 방식 */
.style {
  padding: var(--sp-5) 0 0;
  border-top: 1px solid rgba(var(--camp-ink-rgb), 0.12);
}

.style__label {
  margin-top: var(--sp-1);
  font-size: var(--fs-title);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.style__why {
  margin-top: var(--sp-1);
  font-size: var(--fs-meta);
  color: var(--camp-muted);
}

.verdict__weak {
  margin-top: var(--sp-1);
  font-size: var(--fs-meta);
  color: var(--camp-faint);
}

.verdict__weak strong {
  color: var(--camp-warn);
}

.camp__pick {
  margin-left: var(--sp-1);
  padding: var(--sp-0) var(--sp-2);
  border-radius: 2px;
  background: var(--camp-ember);
  color: var(--camp-on-ember);
  font-size: var(--fs-micro);
  font-weight: 700;
  vertical-align: 0.08em;
}

.panel {
  padding: var(--sp-4) var(--sp-4) var(--sp-4);
  border: 1px solid var(--camp-line-soft);
  background: color-mix(in srgb, var(--camp-surface) 82%, transparent);
}

.panel .eyebrow {
  margin-bottom: var(--sp-3);
}

.muted {
  font-size: var(--fs-meta);
  color: var(--camp-faint);
}

/* 예보 차트 */
.chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sp-1);
  list-style: none;
}

.chart__col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-1);
  flex: 1;
}

.chart__temp {
  font-size: var(--fs-small);
  color: var(--camp-text);
}

.chart__bar {
  width: 100%;
  max-width: 22px;
  border-radius: 4px;
  background: linear-gradient(180deg, var(--camp-ember), var(--camp-ember-dim));
}

.chart__bar--rain {
  background: linear-gradient(180deg, var(--camp-dawn), var(--camp-dawn-dim));
}

.chart__pop,
.chart__hour {
  font-size: var(--fs-micro);
  color: var(--camp-faint);
}

.chart__pop--on {
  color: var(--camp-dawn);
}

/* 야영장 */
/* 지도의 점과 같은 번호. 둘을 잇는 게 이 숫자 하나다. */
.camp__no {
  flex-shrink: 0;
  align-self: center;
  width: 1.6rem;
  font-size: var(--fs-small);
  color: rgba(var(--camp-ink-rgb), 0.4);
  text-align: center;
}

.camp--on .camp__no {
  color: var(--camp-ember);
  font-weight: 700;
}

.camp--on {
  background: rgba(var(--camp-ink-rgb), 0.05);
}

.camps__map {
  margin-bottom: var(--sp-4);
}

.camps__head {
  margin-bottom: var(--sp-3);
}

.camps {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  list-style: none;
}

.camp {
  padding-bottom: var(--sp-3);
  border-bottom: 1px solid var(--camp-line-soft);
}

.camp:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.camp__main {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.camp__chev {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: grid;
  place-items: center;
  border: 1px solid var(--camp-line);
  border-radius: 6px;
  color: var(--camp-muted);
  font-size: var(--fs-body);
}

.camp__thumb {
  flex-shrink: 0;
  width: 88px;
  height: 66px;
  border-radius: var(--camp-radius-sm);
  overflow: hidden;
  background: var(--camp-bg);
  display: grid;
  place-items: center;
}

.camp__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camp__thumb-empty {
  font-size: var(--fs-micro);
  color: var(--camp-faint);
}

.camp__body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.camp__title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-2);
}

.camp__intro,
.camp__addr {
  display: block;
}

.camp__name {
  font-size: var(--fs-body);
  font-weight: 700;
}

.camp__dist {
  flex-shrink: 0;
  font-size: var(--fs-small);
  color: var(--camp-ember);
}

.camp__intro {
  margin-top: var(--sp-0);
  font-size: var(--fs-small);
  color: var(--camp-muted);
}

.camp__addr {
  margin-top: var(--sp-0);
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.camp__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
  margin-top: var(--sp-1);
} /* 야영장 드로어 */
.shots {
  height: 230px;
  border-radius: var(--camp-radius-sm);
  overflow: hidden;
}

.shots :deep(.n-carousel__slide) {
  height: 230px;
}

.shots :deep(.n-image),
.shots :deep(img) {
  display: block;
  width: 100%;
  height: 230px;
  object-fit: cover;
}

/* 없는 지역 */
.missing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-7) var(--sp-4);
  border: 1px solid var(--camp-line-soft);
  background: var(--camp-surface);
  text-align: center;
}

.missing__icon {
  font-size: var(--fs-hero);
}

.missing__title {
  font-weight: 700;
}

@media (max-width: 620px) {
  /* 좁은 화면에서 3열은 글자가 깨진다 */
  .obs {
    grid-template-columns: repeat(2, 1fr);
  }

  .nights {
    font-size: var(--fs-small);
  }

  .night td,
  .night th {
    padding: var(--sp-2) var(--sp-1);
  }
}
</style>
