<script setup>
/**
 * Hands on - Weather Mockup
 * 1. 배열 렌더링 (v-for, :key="id")
 * 2. 조건부 렌더링 (v-if / v-else)  → TempBadge.vue
 * 3. 양방향 바인딩 및 한글 처리 (:value, @input) → CitySearch.vue
 * 4. 이벤트 및 수식어 (@click.stop) → WeatherCard.vue
 * 5. 본인 데이터 추가 → data/weatherList.js
 */
import { computed, ref } from 'vue'
import CitySearch from '@/components/weather/CitySearch.vue'
import WeatherCard from '@/components/weather/WeatherCard.vue'
import StatusBar from '@/components/weather/StatusBar.vue'
import { WEATHER_LIST, HOT_THRESHOLD, RAIN_THRESHOLD } from '@/data/weatherList'

const weatherList = ref(WEATHER_LIST)

const keyword = ref('')
const selectedId = ref(null)

// 검색어로 걸러낸 목록. 공백 제거 후 부분 일치.
const filteredList = computed(() => {
  const q = keyword.value.trim()
  if (!q) return weatherList.value
  return weatherList.value.filter((city) => city.name.includes(q))
})

// 25도 이상 도시 수 — 조건부 렌더링과 같은 기준을 요약으로도 보여준다.
const hotCount = computed(() => filteredList.value.filter((c) => c.temp >= HOT_THRESHOLD).length)

// 우산이 필요한 도시 수
const rainCount = computed(
  () => filteredList.value.filter((c) => c.rainProb >= RAIN_THRESHOLD).length,
)

const statusMessage = ref('')

// 한글 받침 유무로 이/가를 고른다. (받침 있으면 '이')
function subjectParticle(word) {
  const last = word.charCodeAt(word.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return '이'
  return (last - 0xac00) % 28 > 0 ? '이' : '가'
}

// 과제 4-1: 카드를 누르면 상태바에 표기
function selectCity(city) {
  selectedId.value = city.id
  statusMessage.value = `${city.name}${subjectParticle(city.name)} 선택되었습니다.`
}

// 과제 4-2: [상세보기] 는 버블링 없이(@click.stop) 이 함수만 실행
function showDetail(city) {
  window.alert(
    `${city.name}의 현재 날씨는 [${city.status}] 상태입니다.\n` +
      `기온 ${city.temp}°C (체감 ${city.feelsLike}°C)\n` +
      `습도 ${city.humidity}% / 바람 ${city.wind}m/s / 강수확률 ${city.rainProb}%\n` +
      `미세먼지 ${city.dust}\n` +
      `(${city.updatedAt} 기준)`,
  )
}
</script>

<template>
  <main class="wx">
    <h1 class="wx__title">🌤️ 과제 1: 날씨 (Mockup)</h1>

    <!-- 과제 3 -->
    <CitySearch v-model="keyword" />

    <section class="panel">
      <header class="panel__head">
        <h2 class="panel__title">🗺️ 지역별 날씨 현황</h2>
        <span class="panel__count">
          {{ filteredList.length }}개 도시 · {{ HOT_THRESHOLD }}도 이상 {{ hotCount }}곳 · 우산
          {{ rainCount }}곳
        </span>
      </header>

      <!-- 과제 1: v-for + :key 에 id 바인딩 -->
      <ul v-if="filteredList.length" class="cards">
        <li v-for="city in filteredList" :key="city.id">
          <WeatherCard
            :city="city"
            :selected="city.id === selectedId"
            @select="selectCity"
            @detail="showDetail"
          />
        </li>
      </ul>

      <!-- 과제 2: 검색 결과가 없을 때 -->
      <p v-else class="cards__empty">"{{ keyword }}" 와 일치하는 도시가 없습니다.</p>
    </section>

    <StatusBar :message="statusMessage" />
  </main>
</template>

<style scoped>
.wx {
  /* 컴포넌트 공용 토큰 (자식 컴포넌트에서도 상속해서 사용) */
  --wx-border: #d9dde3;
  --wx-surface: #ffffff;
  --wx-input-bg: #fbfcfd;
  --wx-text: #1f2933;
  --wx-muted: #6b7684;
  --wx-accent: #3b74d4;

  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: var(--wx-text);
  background: #f4f6f8;
  border-radius: 12px;
}

.wx__title {
  font-size: 1.25rem;
  font-weight: 800;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--wx-border);
}

.panel {
  border: 1px solid var(--wx-border);
  border-radius: 10px;
  background: var(--wx-surface);
  padding: 1rem 1.1rem;
}

.panel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.panel__title {
  font-size: 1rem;
  font-weight: 700;
}

.panel__count {
  font-size: 0.78rem;
  color: var(--wx-muted);
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  list-style: none;
  padding: 0;
}

.cards__empty {
  padding: 1.5rem 0;
  text-align: center;
  color: var(--wx-muted);
  font-size: 0.9rem;
}
</style>
