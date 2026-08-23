/*
 * 브라우저 대신 서버가 API 를 부른다.
 *
 * 키를 클라이언트 번들에 넣으면 개발자 도구에서 그대로 보인다.
 * 저장소가 공개라 더 그렇다. 그래서 키는 Vercel 환경변수에만 두고
 * (VITE_ 접두사를 붙이지 않아야 번들에 안 들어간다) 여기서 붙인다.
 */
export async function proxy(req, res, { base, keyName, keyValue, what }) {
  if (!keyValue) {
    res.status(500).json({ message: `${what} 인증키가 서버에 설정되지 않았습니다.` })
    return
  }

  const segments = [].concat(req.query.path ?? [])
  const url = new URL(`${base}/${segments.join('/')}`)

  for (const [name, value] of Object.entries(req.query)) {
    if (name === 'path') continue
    url.searchParams.set(name, value)
  }
  url.searchParams.set(keyName, keyValue)

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
