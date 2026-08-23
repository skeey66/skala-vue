/**
 * 한글 부분 검색.
 *
 * "울산" 을 다 치기 전에 "울ㅅ" 만 쳐도 나와야 한다.
 * 글자를 자모로 풀어 놓고 이어 붙인 뒤 부분 일치를 본다.
 *   울산 → ㅇㅜㄹㅅㅏㄴ
 *   울ㅅ → ㅇㅜㄹㅅ        (앞부분이 같으므로 걸린다)
 *
 * 조합 중인 글자(IME)도 그대로 통한다. "울사" 는 ㅇㅜㄹㅅㅏ 라서 역시 앞부분이 같다.
 *
 * 자모로 풀면 "간" 이 "가나" 에도 걸리는 일이 생긴다(ㄱㅏㄴ ⊂ ㄱㅏㄴㅏ).
 * 치는 도중에는 오히려 그게 자연스러워서 그대로 둔다 — 검색은 좁혀 가는 일이다.
 */
const BASE = 0xac00
const LAST = 0xd7a3

// 자모는 낱자로 칠 때와 글자 안에 있을 때의 코드가 다르다. 낱자 쪽으로 맞춘다.
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
const JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'

/** 문자열을 자모 열로 편다. 한글이 아닌 글자는 그대로 둔다. */
function toJamo(text) {
  let out = ''
  for (const ch of String(text ?? '').toLowerCase()) {
    const code = ch.charCodeAt(0)
    if (code < BASE || code > LAST) {
      out += ch
      continue
    }
    const index = code - BASE
    out += CHO[Math.floor(index / 588)]
    out += JUNG[Math.floor((index % 588) / 28)]
    const jong = JONG[index % 28]
    if (jong !== ' ') out += jong
  }
  return out
}

/** 초성만 뽑는다. "제주" → "ㅈㅈ". 한글이 아닌 글자는 그대로 둔다. */
function toInitials(text) {
  let out = ''
  for (const ch of String(text ?? '').toLowerCase()) {
    const code = ch.charCodeAt(0)
    out += code < BASE || code > LAST ? ch : CHO[Math.floor((code - BASE) / 588)]
  }
  return out
}

/** 검색어 하나로 걸러 낼 준비를 한다. 항목마다 index(camp) 를 미리 만들어 두고 쓴다. */
export function buildIndex(text) {
  return { jamo: toJamo(text), cho: toInitials(text) }
}

/**
 * 자음만 쳤으면 초성 검색으로, 아니면 자모 부분 일치로 본다.
 * "ㅈㅈ" 는 제주를 찾으려는 것이지 ㅈ 이 두 번 나오는 곳을 찾으려는 게 아니다.
 */
export function makeMatcher(query) {
  const q = String(query ?? '')
    .trim()
    .toLowerCase()
  if (!q) return () => true
  const bare = q.replace(/\s+/g, '')
  if (/^[ㄱ-ㅎ]+$/.test(bare)) return (index) => index.cho.includes(bare)
  const jamo = toJamo(q)
  return (index) => index.jamo.includes(jamo)
}
