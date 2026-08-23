/**
 * 모닥불 지수.
 *
 * 오늘 그 자리에서 캠핑하기 얼마나 좋은지를 100점으로 환산한다.
 * 불이 잘 타는 조건과 캠핑하기 좋은 조건이 거의 같아서 모닥불을 잣대로 삼았다.
 * 비가 오면 불은 약해지고, 바람이 불면 위태롭고, 공기가 나쁘면 오래 앉아 있기 어렵다.
 * 그리고 더운 밤에는 불이 반갑지 않다. 서늘해야 불 앞에 앉는다.
 *
 * 배점은 불에 영향을 주는 순서대로 매겼다.
 *   비 30 · 바람 25 · 밤 기온 25 · 공기 12 · 하늘 8
 */

// 비: 불에 가장 치명적이다.
function rainScore(rainProb) {
  if (rainProb <= 10) return 30
  if (rainProb <= 25) return 24
  if (rainProb <= 45) return 16
  if (rainProb <= 65) return 8
  if (rainProb <= 85) return 3
  return 0
}

// 바람: 약하면 불이 곱게 타고, 세면 불티가 날린다.
// 평균보다 순간 최대(돌풍)에 위험해지므로 큰 값을 쓴다.
export function effectiveWind(city) {
  return Math.max(city.wind ?? 0, city.gust ?? 0)
}

function windScore(city) {
  const wind = effectiveWind(city)
  if (wind <= 2) return 25
  if (wind <= 4) return 22
  if (wind <= 7) return 15
  if (wind <= 10) return 7
  return 0
}

// 밤 기온: 서늘해야 불이 반갑다. 더운 밤에는 불 앞에 앉기 힘들다.
function nightTempScore(nightLow) {
  if (nightLow >= 4 && nightLow <= 14) return 25
  if (nightLow >= 0 && nightLow < 4) return 22
  if (nightLow > 14 && nightLow <= 19) return 19
  if (nightLow >= -5 && nightLow < 0) return 15
  if (nightLow > 19 && nightLow <= 23) return 12
  if (nightLow > 23 && nightLow <= 26) return 6
  if (nightLow < -5) return 8
  return 2 // 26도 초과. 불 앞이 사우나가 된다.
}

// 공기: 연기와 미세먼지가 겹치면 오래 못 앉아 있는다.
function dustScore(pm10) {
  if (pm10 <= 30) return 12
  if (pm10 <= 80) return 8
  if (pm10 <= 150) return 3
  return 0
}

// 하늘: 구름이 걷히면 불 너머로 별이 보인다.
function skyScore(clouds) {
  if (clouds <= 20) return 8
  if (clouds <= 50) return 5
  if (clouds <= 80) return 2
  return 0
}

export function bonfireScore(city) {
  return (
    rainScore(city.rainProb) +
    windScore(city) +
    nightTempScore(city.nightLow) +
    dustScore(city.pm10) +
    skyScore(city.clouds)
  )
}

/*
 * 점수를 불의 모습으로 옮긴다.
 * 이름은 불이 어떻게 보이는지로만 짓는다 — "잘 탐" 같은 명사형은 등급표처럼 읽힌다.
 */
export function bonfireGrade(score) {
  if (score >= 78) return { label: '활활', tone: 'best', note: '오늘 캠핑하기 제일 좋습니다' }
  if (score >= 58) return { label: '타닥타닥', tone: 'good', note: '무난하게 탑니다' }
  if (score >= 38) return { label: '가물가물', tone: 'fair', note: '피울 수는 있습니다' }
  return { label: '연기만', tone: 'poor', note: '오늘은 접는 게 낫습니다' }
}

/**
 * 점수를 요소별로 펼친다. 합계만 보면 왜 그 점수인지 알 수 없다.
 * 각 요소가 배점 중 몇 점을 받았는지와, 그 근거가 된 실제 값을 같이 준다.
 * label 은 문장에 넣는 긴 표현, short 는 좁은 칸에 붙이는 값이다.
 */
export function scoreParts(city) {
  return [
    {
      key: '비',
      got: rainScore(city.rainProb),
      max: 30,
      label: `강수확률 ${city.rainProb}%`,
      short: `${city.rainProb}%`,
    },
    {
      key: '바람',
      got: windScore(city),
      max: 25,
      label: `${effectiveWind(city)}m/s`,
      short: `${effectiveWind(city)}m/s`,
    },
    {
      key: '기온',
      got: nightTempScore(city.nightLow),
      max: 25,
      label: `밤 최저 ${city.nightLow}℃`,
      short: `${city.nightLow}℃`,
    },
    {
      key: '공기',
      got: dustScore(city.pm10),
      max: 12,
      label: `미세먼지 ${city.pm10}`,
      short: `${city.pm10}㎍`,
    },
    {
      key: '하늘',
      got: skyScore(city.clouds),
      max: 8,
      label: `구름 ${city.clouds}%`,
      short: `${city.clouds}%`,
    },
  ]
}

// 불이 약해지는 가장 큰 이유 하나를 짚어준다.
export function weakestLink(city) {
  /*
   * 하늘은 8점짜리라 여기서 뺀다. 구름이 안 걷히는 날은 흔한데
   * 그게 매번 "가장 큰 이유" 로 올라오면 정작 비와 바람을 가린다.
   */
  const parts = scoreParts(city)
    .filter((part) => part.key !== '하늘')
    .map((part) => ({ key: part.key, lost: part.max - part.got, label: part.label }))
  const worst = parts.sort((a, b) => b.lost - a.lost)[0]
  return worst.lost >= 6 ? worst : null
}

// 밤 최저기온 → 필요한 침낭. 불을 끄고 잘 때 필요한 장비다.
export function sleepingBag(nightLow) {
  if (nightLow < 0) return { label: '동계용 침낭', hint: '내한 -10℃ 이하' }
  if (nightLow < 8) return { label: '3계절 침낭', hint: '내한 0℃ 급' }
  if (nightLow < 16) return { label: '3계절 침낭', hint: '얇은 것으로 충분' }
  if (nightLow < 22) return { label: '여름 침낭', hint: '이너 시트도 가능' }
  return { label: '침낭 없이', hint: '통풍이 관건' }
}

// 바람 경고. 불티와 타프 기준이다.
export function windNote(city) {
  const wind = effectiveWind(city)
  if (wind <= 2) return { label: '불이 곱게 탐', tone: 'good' }
  if (wind <= 4) return { label: '불티 조심', tone: 'fair' }
  if (wind <= 7) return { label: '타프 주의', tone: 'warn' }
  return { label: '불 피우지 말 것', tone: 'danger' }
}

// 5일 야간 예보 한 칸의 점수. 미세먼지는 알 수 없어 나머지로 환산한다.
export function nightFireScore(night) {
  const raw =
    rainScore(night.rainProb) +
    windScore({ wind: night.wind }) +
    nightTempScore(night.nightLow) +
    skyScore(night.clouds)
  return Math.round((raw / 88) * 100)
}

/**
 * 오늘 날씨에 맞는 캠핑 방식.
 *
 * 같은 밤이라도 비가 오면 지붕이 필요하고, 바람이 세면 차를 벽으로 쓴다.
 * 고캠핑 데이터의 업종(induty)·지형(lctCl)과 짝을 맞춰,
 * 근처 야영장 중 오늘에 맞는 곳을 골라낼 수 있게 했다.
 */
export function campingStyle(city) {
  const wind = effectiveWind(city)

  if (city.rainProb >= 70) {
    return {
      key: 'roof',
      label: '글램핑 · 카라반',
      why: '비가 잦아 지붕 있는 자리가 낫습니다',
      types: ['글램핑', '카라반'],
      terrain: [],
    }
  }

  if (wind > 8) {
    return {
      key: 'car',
      label: '자동차야영장',
      why: '바람이 세 타프 대신 차를 벽으로 씁니다',
      types: ['자동차야영장', '카라반'],
      terrain: [],
    }
  }

  if (city.nightLow < 3) {
    return {
      key: 'winter',
      label: '동계 캠핑',
      why: '밤이 영하권이라 난로와 동계 장비가 필요합니다',
      types: ['자동차야영장', '카라반'],
      terrain: ['숲'],
    }
  }

  if (city.nightLow > 23) {
    return {
      key: 'water',
      label: '물놀이 캠핑',
      why: '밤에도 더워 물 가까운 자리가 낫습니다',
      types: [],
      terrain: ['해변', '계곡', '강', '호수'],
    }
  }

  if (city.clouds <= 40 && city.rainProb <= 20) {
    return {
      key: 'star',
      label: '노지 · 백패킹',
      why: '하늘이 열려 불 너머로 별을 봅니다',
      types: ['일반야영장'],
      terrain: ['산', '숲'],
    }
  }

  return {
    key: 'general',
    label: '일반 캠핑',
    why: '특별히 가리는 조건이 없습니다',
    types: ['일반야영장', '자동차야영장'],
    terrain: [],
  }
}

// 야영장이 오늘 추천 방식에 맞는지
// 한 곳이 여러 종류를 겸하므로(자동차야영장 + 글램핑) 겹치는 게 하나라도 있으면 맞는 것으로 본다.
export function matchesStyle(camp, style) {
  const types = camp.types?.length ? camp.types : [camp.type].filter(Boolean)
  const byType = style.types.length && types.some((t) => style.types.includes(t))
  const byTerrain = style.terrain.length && camp.terrain.some((t) => style.terrain.includes(t))
  return Boolean(byType || byTerrain)
}
