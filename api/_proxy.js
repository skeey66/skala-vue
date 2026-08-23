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
    /*
     * 성공한 응답만 담아 둔다. 같은 요청이 몰려도 원본까지 가지 않게.
     *
     * 실패까지 담으면 원인이 사라진 뒤에도 한동안 실패가 되풀이된다.
     * 고캠핑 일일 한도는 자정에 풀리는데, 초과 응답을 캐시해 두면
     * 자정이 지나도 캐시가 만료될 때까지 계속 막힌 것처럼 보인다.
     */
    const ok = upstream.status >= 200 && upstream.status < 300
    res.setHeader('cache-control', ok ? 's-maxage=600, stale-while-revalidate=1800' : 'no-store')
    res.status(upstream.status).send(body)
  } catch {
    res.status(502).json({ message: `${what} 서버에 연결하지 못했습니다.` })
  }
}
