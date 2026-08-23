/*
 * 브라우저 대신 서버가 API 를 부른다.
 *
 * 두 가지를 여기서 해결한다.
 *   1. 인증키를 브라우저에 내려보내지 않는다. VITE_ 접두사를 붙이면 번들에 박혀
 *      개발자 도구에서 그대로 보인다. 저장소가 공개라 더 그렇다.
 *   2. 외부 도메인을 브라우저가 직접 물지 않게 한다. 회사나 학교 망에서 특정
 *      도메인이 막히면 그 화면만 통째로 죽는다. 키가 필요 없는 API 도 여기를 지난다.
 *
 * 원본 경로는 vercel.json 의 rewrite 가 ?path= 로 실어 보낸다.
 * 폴더 이름에 [...] 를 쓰는 캐치올은 한 칸짜리 경로만 잡혀서 쓰지 않는다.
 */
export async function proxy(req, res, { base, keyName, keyValue, what }) {
  if (keyName && !keyValue) {
    res.status(500).json({ message: `${what} 인증키가 서버에 설정되지 않았습니다.` })
    return
  }

  const path = [].concat(req.query.path ?? []).join('/')
  const url = new URL(`${base}/${path}`)

  for (const [name, value] of Object.entries(req.query)) {
    if (name === 'path') continue
    url.searchParams.set(name, value)
  }
  if (keyName) url.searchParams.set(keyName, keyValue)

  try {
    const upstream = await fetch(url, { headers: { accept: '*/*' } })
    const type = upstream.headers.get('content-type') ?? 'application/json'
    const body = Buffer.from(await upstream.arrayBuffer())

    res.setHeader('content-type', type)
    // 같은 요청이 몰려도 원본까지 가지 않게 한다
    res.setHeader('cache-control', 's-maxage=600, stale-while-revalidate=1800')
    res.status(upstream.status).send(body)
  } catch {
    res.status(502).json({ message: `${what} 서버에 연결하지 못했습니다.` })
  }
}
