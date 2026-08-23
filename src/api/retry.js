/**
 * 429 되받기와 사람이 읽을 수 있는 오류 문구.
 *
 * 429 는 두 가지 뜻으로 온다.
 *   1. 잠깐 몰림   — 조금 쉬었다 다시 물으면 된다
 *   2. 하루 한도 초과 — 오늘은 아무리 물어도 안 된다 (공공데이터포털)
 * 둘을 갈라야 한다. 한도가 끝났는데 두 번 더 물으면 2.3초만 버린다.
 *
 * 무엇이 잘못됐는지도 axios 의 영어 문장 대신 우리말로 적는다.
 */
const WAIT = [700, 1600]

// 공공데이터포털은 본문에 이 말을 담아 보낸다
function isDailyLimit(error) {
  const body = error.response?.data
  const text = typeof body === 'string' ? body : JSON.stringify(body ?? '')
  return text.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS')
}

export function attachRetry(client, what) {
  client.interceptors.response.use(undefined, async (error) => {
    const config = error.config
    const status = error.response?.status
    const tried = config?.__tried ?? 0

    if (status === 429 && !isDailyLimit(error) && config && tried < WAIT.length) {
      config.__tried = tried + 1
      await new Promise((resolve) => setTimeout(resolve, WAIT[tried]))
      return client(config)
    }

    throw asMessage(error, what)
  })
}

function asMessage(error, what) {
  const status = error.response?.status

  if (isDailyLimit(error)) {
    return new Error(
      `오늘 쓸 수 있는 ${what} 조회 횟수를 다 썼습니다. 자정이 지나면 다시 열립니다.`,
    )
  }
  if (status === 429) {
    return new Error('요청이 잠시 몰렸습니다. 조금 뒤에 다시 시도해 주세요.')
  }
  if (status === 401 || status === 403) {
    return new Error(`${what} 인증키를 확인해 주세요.`)
  }
  if (error.code === 'ECONNABORTED') {
    return new Error('응답이 늦어 끊었습니다. 다시 시도해 주세요.')
  }
  return new Error(`${what} 정보를 불러오지 못했습니다.`)
}
