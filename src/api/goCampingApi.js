import axios from 'axios'
import { attachRetry } from './retry'

/**
 * 고캠핑 (공공데이터포털 - 한국관광공사).
 *
 * 전국 야영장 목록과 좌표 반경 안의 야영장, 그리고 야영장 사진을 받는다.
 *
 * 공공데이터포털은 CORS 헤더를 주지 않아 브라우저에서 직접 부르면 막힌다.
 * /api/gocamping 프록시를 거쳐 호출한다.
 * (개발은 vite.config.js, 배포는 vercel.json 이 같은 경로를 넘겨준다)
 * 인증키는 이중 인코딩을 피하려고 Decoding 값을 그대로 쓴다.
 */
const gocamping = axios.create({
  baseURL: '/api/gocamping',
  timeout: 10000,
  params: {
    MobileOS: 'ETC',
    MobileApp: 'skala-camp',
    _type: 'json',
  },
})

attachRetry(gocamping, '야영장')

export function hasGoCampingKey() {
  return __HAS_GOCAMPING_KEY__
}

/*
 * induty(업종)는 쉼표로 여러 개가 들어오고, 시설명이 섞여 들어온 행도 있다.
 * (예: "자동차야영장,TV,에어컨,냉장고,유무선인터넷" — 뒤쪽은 업종이 아니다)
 * 그래서 아는 업종만 골라낸다. 한 곳이 여러 종류를 겸하는 경우가 흔하다.
 */
const CAMP_TYPES = ['일반야영장', '자동차야영장', '글램핑', '카라반']

function campTypes(value) {
  const found = String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => CAMP_TYPES.includes(item))
  return [...new Set(found)]
}

/*
 * 고캠핑 사진 경로는 원본과 썸네일이 같은 자리에 있다.
 *   .../camp/722/thumb/thumb_720_xxx.jpg   304KB
 *   .../camp/722/xxx.jpg                   612KB  ← 이걸 쓴다
 * 큰 타일에 썸네일을 늘리면 뭉개져서, 목록 사진은 원본으로 바꿔 쓴다.
 */
function fullSizeImage(url) {
  if (!url) return ''
  return url.replace(/\/thumb\/thumb_\d+_/, '/')
}

// 바닥 형태 코드 순서 (siteBottomCl1 ~ 5)
const SITE_BOTTOM = ['잔디', '파쇄석', '데크', '자갈', '맨흙']

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function splitList(value, limit) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit)
}

/*
 * 소개 글 정리.
 *
 * lineIntro 는 한 줄 소개, intro 는 긴 설명인데 둘의 관계가 일정하지 않다.
 * lineIntro 가 비어 있고 긴 설명 앞에 헤드라인이 두 칸 띄고 붙어 오는 곳이 있다.
 *   "낭만적인 분위기가 물씬 풍기는 글램핑장  (주)청도프로방스글램핑은 ..."
 * 그대로 뿌리면 문장이 붙어 보여서, 앞머리를 떼어 한 줄 소개로 올린다.
 */
function splitIntro(lineIntro, intro) {
  const lead = String(lineIntro ?? '').trim()
  let body = String(intro ?? '').trim()

  if (!lead) {
    const cut = body.match(/^(.{6,45}?)\s{2,}(.+)$/s)
    if (cut) return { intro: cut[1].trim(), description: cut[2].trim() }
  }

  // 긴 설명이 한 줄 소개를 그대로 반복하면 그 부분을 덜어낸다
  if (lead && body.startsWith(lead)) body = body.slice(lead.length).trim()

  return { intro: lead, description: body.replace(/\s{2,}/g, ' ') }
}

// locationBasedList 는 거리를 돌려주지 않아 좌표로 직접 계산한다. (하버사인)
function distanceKm(fromLat, fromLon, toLat, toLon) {
  if (!Number.isFinite(toLat) || !Number.isFinite(toLon)) return null
  const toRad = (deg) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(toLat - fromLat)
  const dLon = toRad(toLon - fromLon)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10
}

/*
 * 고캠핑 항목 하나를 화면이 쓰는 모양으로 옮긴다.
 * 반경 검색과 전국 목록이 같은 모양을 써야 검색 결과와 추천 목록을 섞어 쓸 수 있다.
 * origin 을 주면 거리도 함께 계산한다.
 */
function mapCamp(item, origin) {
  return {
    id: String(item.contentId),
    name: item.facltNm,
    address: item.addr1 ?? '',
    district: [item.doNm, item.sigunguNm].filter(Boolean).join(' '),
    types: campTypes(item.induty), // 겸하는 종류를 전부 (일반야영장 / 자동차야영장 / 글램핑 / 카라반)
    type: campTypes(item.induty)[0] ?? '', // 카드에 한 줄로 적을 대표값
    terrain: splitList(item.lctCl, 3), // 산 / 숲 / 해변 / 강 ...
    ...splitIntro(item.lineIntro, item.intro),
    direction: (item.direction ?? '').trim(),
    nearby: splitList(item.posblFcltyCl, 4), // 주변에서 할 수 있는 것
    theme: splitList(item.themaEnvrnCl, 4),
    image: fullSizeImage(item.firstImageUrl),
    thumb: item.firstImageUrl ?? '',
    tel: item.tel ?? '',
    homepage: item.homepage ?? '',
    facilities: splitList(item.sbrsCl, 8),
    facilityEtc: (item.sbrsEtc ?? '').trim(),
    season: item.operPdCl ?? '',
    openDays: item.operDeCl ?? '',
    status: item.manageSttus ?? '',
    pet: item.animalCmgCl ?? '',
    lat: Number(item.mapY) || null,
    lon: Number(item.mapX) || null,

    // 불멍이 되는지. 캠핑장을 고를 때 가장 먼저 보는 항목이라 따로 뺀다.
    brazier: item.brazierCl ?? '',

    // 예약 방법과 링크
    reserve: { type: item.resveCl ?? '', url: item.resveUrl ?? '' },

    // 사이트 구성 (0 인 항목은 버린다)
    sites: [
      { label: '일반', count: toNumber(item.gnrlSiteCo) },
      { label: '자동차', count: toNumber(item.autoSiteCo) },
      { label: '글램핑', count: toNumber(item.glampSiteCo) },
      { label: '카라반', count: toNumber(item.caravSiteCo) },
    ].filter((site) => site.count > 0),

    // 바닥 형태. 팩이 박히는지가 갈린다.
    ground: SITE_BOTTOM.map((label, index) => ({
      label,
      count: toNumber(item[`siteBottomCl${index + 1}`]),
    })).filter((g) => g.count > 0),

    // 위생 시설 개수
    sanitary: [
      { label: '화장실', count: toNumber(item.toiletCo) },
      { label: '샤워실', count: toNumber(item.swrmCo) },
      { label: '개수대', count: toNumber(item.wtrplCo) },
    ].filter((s) => s.count > 0),

    // 개인 장비 반입
    trailer: item.trlerAcmpnyAt === 'Y',
    caravan: item.caravAcmpnyAt === 'Y',

    // 체험 프로그램
    program: item.exprnProgrmAt === 'Y' ? (item.exprnProgrm ?? '').trim() : '',

    areaSqm: toNumber(item.allar),
    distance: origin
      ? distanceKm(origin.lat, origin.lon, Number(item.mapY), Number(item.mapX))
      : null,
  }
}

/*
 * 같은 자리를 다시 묻지 않는다.
 *
 * 시군구를 눌러 보다 돌아오거나 뒤로 가기를 하면 같은 좌표를 또 부르게 되는데,
 * 공공데이터포털은 짧은 시간에 여러 번 부르면 429 로 막는다. 한 번 받은 건 10분간 쓴다.
 */
const nearbyCache = new Map()
const NEARBY_TTL = 10 * 60 * 1000

export async function fetchNearbyCampsites({ lat, lon }, { radius = 20000, count = 6 } = {}) {
  const key = `${lat},${lon},${radius},${count}`
  const hit = nearbyCache.get(key)
  if (hit && Date.now() - hit.at < NEARBY_TTL) return hit.camps

  const { data } = await gocamping.get('/locationBasedList', {
    params: { mapX: lon, mapY: lat, radius, numOfRows: count, pageNo: 1 },
  })

  const header = data?.response?.header
  if (header && header.resultCode !== '0000') {
    throw new Error(`고캠핑 API 오류: ${header.resultMsg ?? header.resultCode}`)
  }

  const raw = data?.response?.body?.items?.item ?? []
  const items = Array.isArray(raw) ? raw : [raw]

  const camps = items
    .filter((item) => item?.facltNm)
    .map((item) => mapCamp(item, { lat, lon }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))

  nearbyCache.set(key, { at: Date.now(), camps })
  return camps
}

/**
 * 전국 야영장 전체 (basedList).
 *
 * 3,100곳 남짓이고 압축하면 1.2MB, 1초 안쪽이다. 한 번 받아 두고 검색은 브라우저에서 한다.
 * searchList 라는 검색 전용 오퍼레이션이 있지만 **이름만** 훑는다.
 * "강원" 을 넣으면 이름에 '강원' 이 든 두 곳만 나와서, 지역으로 찾는 데는 못 쓴다.
 */
export async function fetchAllCampsites() {
  const { data } = await gocamping.get('/basedList', {
    params: { numOfRows: 3500, pageNo: 1 },
    timeout: 30000,
  })

  const header = data?.response?.header
  if (header && header.resultCode !== '0000') {
    throw new Error(`고캠핑 API 오류: ${header.resultMsg ?? header.resultCode}`)
  }

  const raw = data?.response?.body?.items?.item ?? []
  const items = Array.isArray(raw) ? raw : [raw]

  return items.filter((item) => item?.facltNm).map((item) => mapCamp(item))
}

/**
 * 야영장 사진 목록 (imageList).
 * 목록에서는 대표 사진 한 장만 쓰고, 상세를 열었을 때만 나머지를 불러온다.
 */
/* 사진은 야영장마다 고정이라 한 번 받으면 다시 부를 이유가 없다 */
const imageCache = new Map()

export async function fetchCampsiteImages(contentId, count = 8) {
  if (imageCache.has(contentId)) return imageCache.get(contentId)

  const { data } = await gocamping.get('/imageList', {
    params: { contentId, numOfRows: count, pageNo: 1 },
  })

  const raw = data?.response?.body?.items?.item ?? []
  const items = Array.isArray(raw) ? raw : [raw]

  const urls = items.map((item) => item?.imageUrl).filter(Boolean)
  imageCache.set(contentId, urls)
  return urls
}
