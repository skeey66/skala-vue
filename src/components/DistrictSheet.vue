<script setup>
/**
 * 시군구 고르기.
 *
 * 지도나 목록에서 지역을 눌렀을 때 바로 상세로 넘기지 않는다.
 * "서울 54점" 한 줄로는 어디로 갈지 정할 수 없다 — 도봉과 강남은 같은 서울이지만
 * 밤 기온도 바람도 갈린다. 한 단계 내려가 고르게 한 뒤에 그 시군구의 상세로 보낸다.
 *
 * 시도 전체를 보고 싶은 사람도 있으므로 맨 위에 그 길을 열어 둔다.
 */
import { computed } from 'vue'
import { NDrawer, NDrawerContent } from 'naive-ui'
import { useRouter } from 'vue-router'
import DistrictPanel from '@/components/DistrictPanel.vue'
import BonfireGauge from '@/components/BonfireGauge.vue'

const props = defineProps({
  city: { type: Object, default: null },
  show: { type: Boolean, default: false },
  narrow: { type: Boolean, default: false },
})

const emit = defineEmits(['update:show'])
const router = useRouter()

const open = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

function goWhole() {
  open.value = false
  router.push(`/weather/${props.city.id}`)
}

function goDistrict(row) {
  open.value = false
  router.push(`/weather/${props.city.id}?district=${row.code}`)
}
</script>

<template>
  <NDrawer v-model:show="open" :width="460" height="86vh" :placement="narrow ? 'bottom' : 'right'">
    <NDrawerContent v-if="city" :title="`${city.name} 어디로 갈까요`" closable>
      <div class="lead">
        <BonfireGauge :score="city.score" :size="64" />
        <div class="lead__text">
          <p class="lead__score">
            <span class="num">{{ city.score }}</span>
            <span class="lead__grade">{{ city.grade.label }}</span>
          </p>
          <p class="lead__region">{{ city.region }} 평균</p>
        </div>
      </div>

      <button class="whole" type="button" @click="goWhole">
        {{ city.name }} 전체로 보기
        <span class="whole__arrow" aria-hidden="true">→</span>
      </button>

      <DistrictPanel
        class="districts"
        :sido-code="city.code"
        :parent-pm10="city.pm10"
        @select-district="goDistrict"
      />
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.lead {
  display: flex;
  align-items: flex-end;
  gap: var(--sp-4);
  padding-bottom: var(--sp-4);
}

.lead__score {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  font-size: var(--fs-display);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
}

.lead__grade {
  font-size: var(--fs-small);
  font-weight: 400;
  color: var(--camp-ember);
}

.lead__region {
  margin-top: var(--sp-1);
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.whole {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--sp-3) var(--sp-4);
  border: 0;
  border-top: 1px solid rgba(var(--camp-ink-rgb), 0.12);
  border-bottom: 1px solid rgba(var(--camp-ink-rgb), 0.12);
  background: transparent;
  color: var(--camp-muted);
  font-family: inherit;
  font-size: var(--fs-body);
  text-align: left;
  cursor: pointer;
  transition: color var(--dur-1);
}

.whole:hover {
  color: var(--camp-text);
}

.whole__arrow {
  color: var(--camp-ember);
  transition: transform var(--dur-1) var(--ease);
}

.whole:hover .whole__arrow {
  transform: translateX(4px);
}

.districts {
  margin-top: var(--sp-5);
}
</style>
