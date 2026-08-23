<script setup>
/**
 * 검색 입력창.
 *
 * 검색어는 부모가 들고 있고 여기는 props 로 받아 그린다.
 * 값이 바뀌면 update-query 로 올려 보낸다.
 *
 * v-model 이 아니라 :value + @input 을 직접 엮는다. 아래가 그 이유다.
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
 *    → 리렌더가 나도 el.value === 바인딩 값 이라 Vue 가 DOM 을 건드리지 않는다.
 * 2) 그 덕분에 조합 중(미완성 자모 "ㅂ", "부사")에도 부모로 값을 올릴 수 있다.
 *    "울ㅅ" 처럼 조합 중인 글자로도 걸러 주려면 이게 있어야 한다.
 *    (v-model 은 조합이 끝나야 값을 올리므로 중간값을 볼 수 없다)
 */
import { ref, watch } from 'vue'

const props = defineProps({
  query: { type: String, default: '' },
})
const emit = defineEmits(['update-query'])

// input 의 :value 에 바인딩되는 값. 항상 실제 DOM 값과 동기화된다.
const stableValue = ref(props.query)
// IME 조합 중 여부 (화면에 "한글 조합 중…" 표시)
const isComposing = ref(false)

// 부모가 값을 바꾼 경우(초기화 등) 입력창도 따라간다. 조합 중에는 건드리지 않는다.
watch(
  () => props.query,
  (v) => {
    if (!isComposing.value && v !== stableValue.value) stableValue.value = v
  },
)

function onInput(event) {
  const value = event.target.value
  stableValue.value = value // (1) DOM 과 항상 일치시켜 IME 안전 확보
  emit('update-query', value) // (2) 조합 중이어도 매 타이핑마다 부모로 올린다
}

function onCompositionStart() {
  isComposing.value = true
}

function onCompositionEnd(event) {
  isComposing.value = false
  stableValue.value = event.target.value
  emit('update-query', event.target.value)
}

function clear() {
  stableValue.value = ''
  emit('update-query', '')
}
</script>

<template>
  <div class="search">
    <div class="search__field">
      <span class="search__icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14">
          <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.5" />
          <path d="M10.6 10.6 L14 14" stroke="currentColor" stroke-width="1.5" />
        </svg>
      </span>

      <input
        class="search__input"
        type="text"
        placeholder="지역 이름 검색"
        :value="stableValue"
        @input="onInput"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
        @keyup.esc="clear"
      />

      <!-- 지우기 클릭은 바깥으로 전파되지 않는다 -->
      <button v-if="stableValue" class="search__clear" type="button" @click.stop="clear">
        지우기
      </button>
    </div>

    <p class="search__echo">
      <template v-if="query">
        검색 중: <strong>{{ query }}</strong>
      </template>
      <template v-else>지역 이름을 입력하면 바로 걸러집니다</template>
      <em v-if="isComposing" class="search__ime">조합 중</em>
    </p>
  </div>
</template>

<style scoped>
.search__field {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-0) var(--sp-0) var(--sp-0) var(--sp-3);
  border: 1px solid var(--camp-line);
  border-radius: var(--camp-radius-sm);
  background: var(--camp-bg);
  transition: border-color var(--dur-1);
}

.search__field:focus-within {
  border-color: var(--camp-ember-dim);
}

.search__icon {
  display: flex;
  color: var(--camp-faint);
}

.search__input {
  flex: 1;
  padding: var(--sp-2) 0;
  border: 0;
  background: transparent;
  color: var(--camp-text);
  font-family: inherit;
  font-size: var(--fs-body);
}

.search__input::placeholder {
  color: var(--camp-faint);
}

.search__input:focus {
  outline: none;
}

.search__clear {
  padding: var(--sp-1) var(--sp-2);
  border: 0;
  border-radius: 7px;
  background: var(--camp-surface-2);
  color: var(--camp-muted);
  font-size: var(--fs-small);
  cursor: pointer;
}

.search__echo {
  margin-top: var(--sp-2);
  font-size: var(--fs-small);
  color: var(--camp-faint);
}

.search__echo strong {
  color: var(--camp-text);
}

/* 한글 조합 중임을 알리는 표시. IME 처리가 실제로 동작하는지 눈으로 확인할 수 있다. */
.search__ime {
  margin-left: var(--sp-2);
  padding: var(--sp-0) var(--sp-1);
  border-radius: 4px;
  background: var(--camp-ember-dim);
  color: var(--camp-star);
  font-size: var(--fs-micro);
  font-style: normal;
}
</style>
