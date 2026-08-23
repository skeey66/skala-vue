import { defineStore } from 'pinia'

/**
 * 기온 단위 설정.
 *
 * 내비게이션 바의 토글 하나로 바꾸면 사이트 전체가 따라가야 해서
 * 컴포넌트가 아니라 스토어에 둔다.
 */
export const useConfigStore = defineStore('config', {
  state: () => ({
    unit: 'celsius',
  }),

  getters: {
    // 현재 단위 기호
    unitSymbol: (state) => (state.unit === 'fahrenheit' ? '°F' : '°C'),

    // 내비게이션 바에 표시할 라벨 (예: "화씨(°F)")
    unitLabel: (state) => (state.unit === 'fahrenheit' ? '화씨(°F)' : '섭씨(°C)'),

    // 화씨 여부를 묻는 곳이 많아 getter 로 뺐다
    isFahrenheit: (state) => state.unit === 'fahrenheit',
  },

  actions: {
    // 섭씨 ↔ 화씨 토글
    // 특정 단위로 직접 지정
    setUnit(unit) {
      if (unit !== 'celsius' && unit !== 'fahrenheit') return
      this.unit = unit
    },
  },
})
