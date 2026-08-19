<script setup>
/**
 * 과제 3: 양방향 바인딩 및 한글 처리
 * v-model 대신 :value + @input 을 직접 조합해 양방향 바인딩을 구현한다.
 *
 * [한글(IME)이 깨지는 이유]
 * 한글은 자모를 조합하는 동안에도 input 이벤트가 계속 발생한다.
 * 그런데 Vue 는 엘리먼트를 갱신할 때 value 바인딩을 "강제로" 다시 써준다
 * (runtime-core patchElement 의 force patch value).
 * 따라서 조합 중에 리렌더가 일어나고 바인딩된 값이 DOM 의 현재 값과 다르면
 * el.value 가 덮어써지면서 조합 중이던 글자가 사라진다.
 *
 * [대응]
 * 1) stableValue 는 조합 중에도 항상 DOM 값과 동일하게 맞춘다.
 *    → 리렌더가 나도 el.value === 바인딩 값 이라 DOM 을 건드리지 않는다.
 * 2) 부모로 올리는 값(modelValue)은 조합이 끝난 뒤에만 emit 한다.
 *    → 미완성 자모("ㅂ", "부")로 검색이 돌지 않는다. (v-model 과 같은 동작)
 * 3) 조합 중인 글자는 로컬 draft 로만 화면에 표시한다.
 */
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

// input 의 :value 에 바인딩되는 값. 항상 실제 DOM 값과 동기화된다.
const stableValue = ref(props.modelValue)
// IME 조합 중 여부
const isComposing = ref(false)
// 조합 중인 미확정 글자(화면 표시용)
const draft = ref('')

// 부모가 값을 바꾼 경우(초기화 등) 입력창도 따라간다. 조합 중에는 건드리지 않는다.
watch(
  () => props.modelValue,
  (v) => {
    if (!isComposing.value && v !== stableValue.value) stableValue.value = v
  },
)

function onInput(event) {
  const value = event.target.value
  stableValue.value = value // (1) DOM 과 항상 일치시켜 IME 안전 확보
  if (isComposing.value) {
    draft.value = value // (3) 조합 중에는 미리보기만
  } else {
    emit('update:modelValue', value) // (2) 확정된 값만 부모로
  }
}

function onCompositionStart() {
  isComposing.value = true
  draft.value = stableValue.value
}

function onCompositionEnd(event) {
  isComposing.value = false
  draft.value = ''
  stableValue.value = event.target.value
  emit('update:modelValue', event.target.value)
}

function clear() {
  stableValue.value = ''
  draft.value = ''
  emit('update:modelValue', '')
}
</script>

<template>
  <section class="panel">
    <h2 class="panel__title">🔍 도시 검색</h2>

    <div class="field">
      <input
        class="field__input"
        type="text"
        placeholder="검색할 도시 이름 입력 (예: 서울)"
        :value="stableValue"
        @input="onInput"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
        @keyup.esc="clear"
      />
      <!-- 과제 4: 수식어 사용. 지우기 클릭은 바깥으로 전파되지 않는다 -->
      <button v-if="stableValue" class="field__clear" type="button" @click.stop="clear">
        지우기
      </button>
    </div>

    <p class="field__echo">
      검색 중인 도시:
      <strong v-if="isComposing">{{ draft }}</strong>
      <strong v-else-if="modelValue">{{ modelValue }}</strong>
      <span v-else class="field__echo--empty">(입력 없음)</span>
      <em v-if="isComposing" class="field__ime">한글 조합 중…</em>
    </p>
  </section>
</template>

<style scoped>
.panel {
  border: 1px solid var(--wx-border);
  border-radius: 10px;
  background: var(--wx-surface);
  padding: 1rem 1.1rem;
}

.panel__title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.field {
  display: flex;
  gap: 0.5rem;
}

.field__input {
  flex: 1;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--wx-border);
  border-radius: 6px;
  background: var(--wx-input-bg);
  color: inherit;
  font-size: 0.95rem;
}

.field__input:focus {
  outline: 2px solid var(--wx-accent);
  outline-offset: 1px;
}

.field__clear {
  padding: 0 0.8rem;
  border: 1px solid var(--wx-border);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 0.85rem;
}

.field__echo {
  margin-top: 0.6rem;
  font-size: 0.9rem;
  color: var(--wx-muted);
}

.field__echo--empty {
  opacity: 0.6;
}

.field__ime {
  margin-left: 0.4rem;
  font-size: 0.8rem;
  color: var(--wx-accent);
  font-style: normal;
}
</style>
