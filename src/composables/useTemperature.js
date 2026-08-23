import { storeToRefs } from 'pinia'
import { useConfigStore } from '@/stores/configStore'

/**
 * 섭씨와 화씨 사이의 변환.
 *
 * 목록, 상세, 지수, 주간 예보가 모두 기온을 그린다. 각자 변환을 들고 있으면
 * 같은 코드가 네 벌이 되므로 여기 하나로 모아 쓴다.
 *
 * 원본 데이터는 항상 섭씨 숫자이고, 화면에 그릴 때만 변환한다.
 * 25도 이상 같은 판정은 변환하지 않은 원본 값으로 해야 단위를 바꿔도 결과가 흔들리지 않는다.
 */
function celsiusTo(unit, celsius) {
  if (unit === 'fahrenheit') return Math.round((celsius * 9) / 5 + 32)
  return celsius
}

export function useTemperature() {
  const configStore = useConfigStore()
  const { unit, unitSymbol } = storeToRefs(configStore)

  // 숫자만 (예: 82)
  const toDisplay = (celsius) => celsiusTo(unit.value, celsius)

  // 숫자 + 기호 (예: "82°F")
  const formatTemp = (celsius) => `${toDisplay(celsius)}${unitSymbol.value}`

  return { unit, unitSymbol, toDisplay, formatTemp }
}
