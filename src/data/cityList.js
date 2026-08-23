/**
 * 조회 대상 지역. 전국 17개 시도.
 *
 * 좌표는 각 시도의 대표 지점(도청·시청 또는 지리적 중심)이다.
 * 날씨 값은 전부 API 응답에서 채우고 여기에는 좌표와 이름만 둔다.
 *
 * code 는 통계청 시도 코드로, 지도(koreaProvinces.json)의 경계와 짝을 맞춘다.
 */
// prettier-ignore
export const CITY_LIST = [
  { id: 'sido_11', code: '11', name: '서울',   region: '서울특별시',        lat: 37.5665, lon: 126.9780 },
  { id: 'sido_21', code: '21', name: '부산',   region: '부산광역시',        lat: 35.1796, lon: 129.0756 },
  { id: 'sido_22', code: '22', name: '대구',   region: '대구광역시',        lat: 35.8714, lon: 128.6014 },
  { id: 'sido_23', code: '23', name: '인천',   region: '인천광역시',        lat: 37.4563, lon: 126.7052 },
  { id: 'sido_24', code: '24', name: '광주',   region: '광주광역시',        lat: 35.1595, lon: 126.8526 },
  { id: 'sido_25', code: '25', name: '대전',   region: '대전광역시',        lat: 36.3504, lon: 127.3845 },
  { id: 'sido_26', code: '26', name: '울산',   region: '울산광역시',        lat: 35.5384, lon: 129.3114 },
  { id: 'sido_29', code: '29', name: '세종',   region: '세종특별자치시',     lat: 36.4801, lon: 127.2890 },
  { id: 'sido_31', code: '31', name: '경기',   region: '경기도',            lat: 37.4138, lon: 127.5183 },
  { id: 'sido_32', code: '32', name: '강원',   region: '강원특별자치도',     lat: 37.8228, lon: 128.1555 },
  { id: 'sido_33', code: '33', name: '충북',   region: '충청북도',          lat: 36.8000, lon: 127.7000 },
  { id: 'sido_34', code: '34', name: '충남',   region: '충청남도',          lat: 36.5184, lon: 126.8000 },
  { id: 'sido_35', code: '35', name: '전북',   region: '전북특별자치도',     lat: 35.7175, lon: 127.1530 },
  { id: 'sido_36', code: '36', name: '전남',   region: '전라남도',          lat: 34.8679, lon: 126.9910 },
  { id: 'sido_37', code: '37', name: '경북',   region: '경상북도',          lat: 36.4919, lon: 128.8889 },
  { id: 'sido_38', code: '38', name: '경남',   region: '경상남도',          lat: 35.4606, lon: 128.2132 },
  { id: 'sido_39', code: '39', name: '제주',   region: '제주특별자치도',     lat: 33.4996, lon: 126.5312 },
]
