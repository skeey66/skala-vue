<script setup>
/**
 * 야영장 상세. 카드를 누르면 옆에서(좁은 화면에서는 아래에서) 열린다.
 *
 * 고캠핑이 주는 필드를 그대로 늘어놓으면 서른 줄짜리 표가 된다. 그건 데이터지 설명이 아니다.
 * 여기서는 "갈지 말지" 를 정하는 순서대로 다시 묶는다.
 *   1. 불을 피울 수 있나 · 자리가 몇이나 되나 · 얼마나 머나  → 맨 위에 크게
 *   2. 어떤 곳인가                                        → 소개 글
 *   3. 자리 · 시설 · 이용 · 주변                            → 묶어서
 * 값도 코드값 그대로 두지 않고 문장이 되게 다듬는다. ('개별' → '개별 화로대')
 */
import { computed, ref, watch } from 'vue'
import { NCarousel, NDrawer, NDrawerContent, NImage, NSkeleton, NTag } from 'naive-ui'
import { fetchCampsiteImages } from '@/api/goCampingApi'
import { useFavoriteStore } from '@/stores/favoriteStore'

const props = defineProps({
  camp: { type: Object, default: null },
  show: { type: Boolean, default: false },
  narrow: { type: Boolean, default: false },
})

const emit = defineEmits(['update:show'])

const favoriteStore = useFavoriteStore()

const open = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

/* 사진은 열었을 때만 받는다. 목록에 있는 동안 미리 받으면 낭비다. */
const images = ref([])
const loadingImages = ref(false)

watch(
  () => props.camp?.id,
  async (id) => {
    images.value = []
    if (!id) return
    loadingImages.value = true
    try {
      images.value = await fetchCampsiteImages(id)
    } catch {
      images.value = []
    } finally {
      loadingImages.value = false
    }
  },
)

// 맨 위 셋. 이 셋이 갈지 말지를 거의 정한다.
const headline = computed(() => {
  const camp = props.camp
  if (!camp) return []

  const out = []

  if (camp.brazier) {
    // '개별' / '공용' / '불가' 같은 한 단어가 온다
    out.push({
      key: '불',
      value: camp.brazier,
      note: camp.brazier.includes('불가') ? '화로대를 쓸 수 없습니다' : '화로대',
      warn: camp.brazier.includes('불가'),
    })
  }

  const sites = camp.sites ?? []
  if (sites.length) {
    const total = sites.reduce((sum, site) => sum + site.count, 0)
    out.push({
      key: '자리',
      value: `${total}면`,
      note: sites.map((site) => site.label).join(' · '),
    })
  }

  if (camp.distance !== null && camp.distance !== undefined) {
    out.push({ key: '거리', value: `${camp.distance}km`, note: camp.district })
  }

  return out
})

// 소개 글이 길면 접어 둔다
const expanded = ref(false)
watch(
  () => props.camp?.id,
  () => (expanded.value = false),
)

const LONG = 160
const isLong = computed(() => (props.camp?.description ?? '').length > LONG)
const body = computed(() => {
  const text = props.camp?.description ?? ''
  if (!isLong.value || expanded.value) return text
  return text.slice(0, LONG).trimEnd() + '…'
})

/*
 * 아래쪽 묶음. 값이 없는 줄은 아예 만들지 않는다.
 * 빈 항목을 '-' 로 채우면 표가 길어지기만 하고 읽을 게 없다.
 */
const groups = computed(() => {
  const camp = props.camp
  if (!camp) return []

  const count = (list) => list.map((item) => `${item.label} ${item.count}`).join(' · ')

  const raw = [
    {
      title: '자리',
      rows: [
        camp.ground?.length && {
          label: '바닥',
          value: camp.ground.map((g) => g.label).join(' · '),
        },
        camp.areaSqm && { label: '면적', value: `${camp.areaSqm.toLocaleString()}㎡` },
        camp.terrain?.length && { label: '지형', value: camp.terrain.join(' · ') },
      ],
    },
    {
      title: '시설',
      rows: [
        camp.sanitary?.length && { label: '위생', value: count(camp.sanitary) },
        camp.facilities?.length && { label: '갖춘 것', value: camp.facilities.join(' · ') },
        camp.facilityEtc && { label: '그 밖에', value: camp.facilityEtc },
      ],
    },
    {
      title: '이용',
      rows: [
        camp.season && {
          label: '기간',
          value: camp.openDays ? `${camp.season} · ${camp.openDays}` : camp.season,
        },
        camp.pet && { label: '반려동물', value: `동반 ${camp.pet}` },
        camp.program && { label: '체험', value: camp.program },
        (camp.trailer || camp.caravan) && {
          label: '개인 장비',
          value: [camp.trailer && '트레일러', camp.caravan && '카라반']
            .filter(Boolean)
            .join(' · ')
            .concat(' 반입 가능'),
        },
      ],
    },
    /*
     * direction(오시는 길)은 쓰지 않는다. 다른 지역 주소가 들어 있는 곳이 있어
     * 바로 아래 주소와 어긋난다. (산청 야영장에 전남 여수 주소가 들어온 걸 확인)
     * 틀린 길 안내는 없느니만 못하다.
     */
    {
      title: '주변',
      rows: [
        camp.nearby?.length && { label: '할 수 있는 것', value: camp.nearby.join(' · ') },
        camp.address && { label: '주소', value: camp.address },
      ],
    },
  ]

  return raw
    .map((group) => ({ ...group, rows: group.rows.filter(Boolean) }))
    .filter((group) => group.rows.length)
})
</script>

<template>
  <NDrawer v-model:show="open" :width="480" height="88vh" :placement="narrow ? 'bottom' : 'right'">
    <NDrawerContent v-if="camp" :title="camp.name" closable>
      <NCarousel v-if="images.length" class="shots" :space-between="8" draggable show-arrow>
        <NImage
          v-for="src in images"
          :key="src"
          class="shots__item"
          :src="src"
          :alt="`${camp.name} 사진`"
          object-fit="cover"
        />
      </NCarousel>
      <NSkeleton v-else-if="loadingImages" height="220px" :sharp="true" />

      <!-- 갈지 말지를 정하는 셋 -->
      <ul v-if="headline.length" class="head">
        <li v-for="item in headline" :key="item.key" class="head__item">
          <span class="head__key">{{ item.key }}</span>
          <b class="head__value" :class="{ 'head__value--warn': item.warn }">{{ item.value }}</b>
          <span class="head__note">{{ item.note }}</span>
        </li>
      </ul>

      <!-- 어떤 곳인가 -->
      <section v-if="camp.intro || camp.description" class="about">
        <p v-if="camp.intro" class="about__lead">{{ camp.intro }}</p>
        <p v-if="camp.description" class="about__body">{{ body }}</p>
        <button v-if="isLong" class="about__more" type="button" @click="expanded = !expanded">
          {{ expanded ? '접기' : '더 보기' }}
        </button>
      </section>

      <!-- 나머지는 묶어서 -->
      <section v-for="group in groups" :key="group.title" class="group">
        <h4 class="group__title">{{ group.title }}</h4>
        <dl class="group__list">
          <div v-for="row in group.rows" :key="row.label" class="row">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </section>

      <template #footer>
        <div class="links">
          <button
            class="links__fav"
            :class="{ 'links__fav--on': favoriteStore.isFavorite(camp.id) }"
            type="button"
            :aria-pressed="favoriteStore.isFavorite(camp.id)"
            @click="favoriteStore.toggle(camp)"
          >
            {{ favoriteStore.isFavorite(camp.id) ? '♥ 찜함' : '♡ 찜' }}
          </button>
          <a
            v-if="camp.reserve?.url"
            class="links__item links__item--main"
            :href="camp.reserve.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            예약하기
          </a>
          <a
            v-if="camp.homepage"
            class="links__item"
            :href="camp.homepage"
            target="_blank"
            rel="noopener noreferrer"
          >
            홈페이지
          </a>
          <a v-if="camp.tel" class="links__item" :href="`tel:${camp.tel}`">{{ camp.tel }}</a>
          <NTag v-if="camp.reserve?.type" size="small" :bordered="false">
            {{ camp.reserve.type }}
          </NTag>
        </div>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
/*
 * 캐러셀은 제 높이가 없어서 드로어 안에서 남는 세로를 다 먹는다.
 * 그러면 아래 내용이 화면 밖으로 밀린다. 높이를 직접 못 박는다.
 */
.shots {
  height: 230px;
  flex: none;
  margin-bottom: var(--sp-5);
}

.shots :deep(.n-carousel__slide) {
  height: 230px;
}

.shots__item,
.shots__item :deep(img) {
  width: 100%;
  height: 230px;
  object-fit: cover;
}

/* ── 갈지 말지를 정하는 셋 ───────────────────── */
.head {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
  gap: 2px;
  list-style: none;
  margin-bottom: var(--sp-5);
}

.head__item {
  display: flex;
  flex-direction: column;
  gap: var(--sp-0);
  padding: var(--sp-3) var(--sp-4);
  background: rgba(var(--camp-ink-rgb), 0.05);
}

.head__key {
  font-family: var(--font-data);
  font-size: var(--fs-micro);
  letter-spacing: 0.06em;
  color: var(--camp-faint);
}

.head__value {
  font-size: var(--fs-title);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.head__value--warn {
  color: var(--camp-danger);
}

.head__note {
  font-size: var(--fs-small);
  color: var(--camp-muted);
}

/* ── 어떤 곳인가 ─────────────────────────────── */
.about {
  margin-bottom: var(--sp-5);
}

.about__lead {
  font-size: var(--fs-lead);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.55;
}

.about__body {
  margin-top: var(--sp-2);
  font-size: var(--fs-meta);
  line-height: 1.8;
  color: var(--camp-muted);
}

.about__more {
  margin-top: var(--sp-2);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--camp-ember);
  font-family: inherit;
  font-size: var(--fs-small);
  font-weight: 600;
  cursor: pointer;
}

.about__more:hover {
  text-decoration: underline;
}

/* ── 묶음 ────────────────────────────────────── */
.group {
  padding-top: var(--sp-4);
  margin-bottom: var(--sp-4);
  border-top: 1px solid rgba(var(--camp-ink-rgb), 0.1);
}

.group__title {
  font-size: var(--fs-small);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--camp-faint);
}

.group__list {
  margin-top: var(--sp-2);
}

.row {
  display: grid;
  grid-template-columns: 4.6rem 1fr;
  gap: var(--sp-3);
  padding: var(--sp-1) 0;
  font-size: var(--fs-meta);
  line-height: 1.65;
}

.row dt {
  color: var(--camp-faint);
}

.row dd {
  color: var(--camp-text);
}

/* ── 아래 링크 ───────────────────────────────── */
.links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
}

/* 찜. 갈지 말지 정하는 자리가 여기라 예약 단추 옆에 둔다. */
.links__fav {
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--camp-line);
  background: transparent;
  color: var(--camp-muted);
  font-family: inherit;
  font-size: var(--fs-meta);
  font-weight: 600;
  cursor: pointer;
  transition:
    color var(--dur-1),
    border-color var(--dur-1);
}

.links__fav:hover {
  color: var(--camp-text);
  border-color: var(--camp-text);
}

.links__fav--on {
  border-color: var(--camp-ember);
  color: var(--camp-ember);
}

.links__item {
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--camp-line);
  color: var(--camp-muted);
  font-size: var(--fs-meta);
  font-weight: 600;
}

.links__item:hover {
  color: var(--camp-text);
  border-color: var(--camp-text);
}

.links__item--main {
  border-color: var(--camp-ember);
  background: var(--camp-ember);
  color: var(--camp-on-ember);
}

.links__item--main:hover {
  color: var(--camp-on-ember);
  filter: brightness(1.08);
}
</style>
