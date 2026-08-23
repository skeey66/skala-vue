<script setup>
/**
 * 셰르파 동행.
 *
 * 캠핑을 처음 갈 때 막히는 건 날씨나 자리가 아니라 "뭘 챙기고 뭘 하는지" 다.
 * 그건 검색으로 안 풀리고 먼저 다녀온 사람이 옆에 있어야 풀린다.
 * 그래서 지수·야영장 다음에 사람을 붙였다.
 *
 * 신청을 주고받으려면 서버가 있어야 하므로 지금은 목록까지만 만든다.
 * 데이터는 communityMock.js 의 목업이다.
 */
import { computed, ref } from 'vue'
import { useMessage } from 'naive-ui'
import PageHero from '@/components/PageHero.vue'
import BaseDashboardCard from '@/components/BaseDashboardCard.vue'
import MockNotice from '@/components/MockNotice.vue'
import { SHERPAS, SHERPA_FIELDS } from '@/data/communityMock'

const message = useMessage()

/*
 * 동행 신청. 서버가 없으므로 눌린 것만 이 화면이 기억한다.
 * 새로고침하면 사라진다 — 그게 맞다. 남는 척하면 오히려 거짓말이 된다.
 */
const asked = ref(new Set())

function ask(person) {
  if (asked.value.has(person.id)) return
  asked.value = new Set(asked.value).add(person.id)
  message.success(`${person.name} 님에게 동행 신청을 보냈습니다 (예시)`)
}

const field = ref('전체')
const FIELDS = ['전체', ...SHERPA_FIELDS]

const list = computed(() =>
  field.value === '전체'
    ? SHERPAS
    : SHERPAS.filter((sherpa) => sherpa.fields.includes(field.value)),
)

// 별점을 채운 칸으로. 숫자만 있으면 4.9 와 4.5 가 눈으로 안 갈린다.
function stars(rating) {
  return Math.round(rating * 2) / 2
}
</script>

<template>
  <div class="sherpa">
    <PageHero
      photo="sherpa"
      eyebrow="셰르파"
      title="초보 캠퍼 옆에 베테랑이 함께 갑니다"
      lead="장비를 뭘 챙길지, 자리를 어떻게 잡을지, 불은 어떻게 붙일지 — 검색해도 잘 안 나오는 것들을 그 자리에서 알려 줍니다."
    />

    <MockNotice />

    <BaseDashboardCard title="함께 갈 사람">
      <template #actions>
        <span class="count">
          <b class="num">{{ list.length }}</b
          >명
        </span>
      </template>

      <!-- 무엇을 도와줄 수 있는지로 고른다. 지역보다 이쪽이 먼저다. -->
      <div class="chips">
        <button
          v-for="item in FIELDS"
          :key="item"
          class="chip"
          :class="{ 'chip--on': field === item }"
          type="button"
          @click="field = item"
        >
          <span class="chip__fill"></span>
          <span class="chip__label">{{ item }}</span>
        </button>
      </div>

      <ul class="cards">
        <li v-for="person in list" :key="person.id" class="card rise">
          <div class="card__head">
            <h3 class="card__name">{{ person.name }}</h3>
            <span class="card__rate">
              <span
                class="card__stars"
                :style="{ '--fill': `${(stars(person.rating) / 5) * 100}%` }"
                >★★★★★</span
              >
              <span class="num card__score">{{ person.rating.toFixed(1) }}</span>
            </span>
          </div>

          <p class="card__meta">
            {{ person.region }} · 캠핑 <span class="num">{{ person.years }}</span
            >년 · 동행 <span class="num">{{ person.trips }}</span
            >회
          </p>

          <p class="card__intro">{{ person.intro }}</p>

          <div class="card__tags">
            <span v-for="tag in person.fields" :key="tag" class="tag">{{ tag }}</span>
            <span v-if="person.gear" class="tag tag--gear">장비 빌려줌</span>
          </div>

          <div class="card__foot">
            <span class="card__when">{{ person.when }}</span>
            <button
              class="card__ask"
              :class="{ 'card__ask--done': asked.has(person.id) }"
              type="button"
              @click="ask(person)"
            >
              {{ asked.has(person.id) ? '신청 보냄' : '동행 신청' }}
            </button>
          </div>
        </li>
      </ul>
    </BaseDashboardCard>
  </div>
</template>

<style scoped>
.sherpa {
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

/* ── 분야 칩 ─────────────────────────────────── */
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

/* 색이 왼쪽에서 차오른다. 켜고 끄는 게 눈에 남는다. */
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

/* ── 사람 칸 ─────────────────────────────────── */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
  gap: 2px;
  list-style: none;
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-4);
  background: var(--camp-surface);
  transition: background var(--dur-1);
}

.card:hover {
  background: var(--camp-surface-2);
}

.card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-3);
}

.card__name {
  font-size: var(--fs-lead);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.card__rate {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
}

/*
 * 별을 반 칸까지 채운다. 글자 하나에 그라디언트를 잘라 넣는 방식이라
 * 별 다섯 개를 따로 그리지 않아도 된다.
 */
.card__stars {
  font-size: var(--fs-small);
  letter-spacing: 0.08em;
  background: linear-gradient(
    90deg,
    var(--camp-star) var(--fill),
    rgba(var(--camp-ink-rgb), 0.18) var(--fill)
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.card__score {
  font-size: var(--fs-small);
  font-weight: 700;
}

.card__meta {
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.card__intro {
  font-size: var(--fs-meta);
  line-height: 1.75;
  color: var(--camp-muted);
}

.card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
  margin-top: var(--sp-1);
}

.tag {
  padding: var(--sp-0) var(--sp-2);
  border: 1px solid var(--camp-line);
  font-size: var(--fs-micro);
  color: var(--camp-muted);
}

.tag--gear {
  border-color: rgba(var(--camp-ember-rgb), 0.5);
  color: var(--camp-ember);
}

.card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  margin-top: auto;
  padding-top: var(--sp-4);
}

.card__when {
  font-size: var(--fs-micro);
  color: var(--camp-faint);
}

.card__ask {
  padding: var(--sp-1) var(--sp-3);
  border: 1px solid var(--camp-line);
  background: transparent;
  color: var(--camp-muted);
  font-family: inherit;
  font-size: var(--fs-small);
  cursor: pointer;
  transition:
    color var(--dur-1),
    border-color var(--dur-1);
}

.card__ask:hover {
  color: var(--camp-text);
  border-color: var(--camp-text);
}

/* 보낸 뒤에는 다시 못 누른다. 상태가 남는 자리는 이 화면뿐이다. */
.card__ask--done,
.card__ask--done:hover {
  border-color: var(--camp-ember);
  color: var(--camp-ember);
  cursor: default;
}
</style>
