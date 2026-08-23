# 모닥불

Vue.js 강의의 Hands on 9개를 순서대로 직접 실습하고, 그 실습본을 지우지 않고 계속 이어 붙여
하나의 서비스까지 키운 기록입니다.

마지막에 남은 것이 모닥불입니다. 오늘 어느 지역이 캠핑하기 좋은지를 100점으로 알려주고,
그 조건에 맞는 야영장까지 찾아 주는 사이트입니다.

날씨를 점수로 옮기는 잣대로 모닥불을 골랐습니다. 비가 오면 불은 약해지고, 바람이 불면 위태롭고,
공기가 나쁘면 오래 앉아 있기 어렵습니다. 캠핑하기 좋은 조건과 불이 잘 타는 조건이 거의 같아서
그대로 지수의 이름이 됐습니다.

실습 단계마다 아래 네 가지를 적었습니다.

1. 그 단계에서 구현한 내용
2. 그것이 최종 서비스에 남았는지, 남았다면 어떻게 쓰이고 없앴다면 왜 없앴는지
3. 기본 요구사항에서 개인적으로 더하거나 바꾼 것
4. 트러블 슈팅

## 실행

```sh
npm install
cp .env.example .env   # 키 두 개를 채운다
npm run dev
```

키는 두 개가 필요합니다.

- `VITE_OPENWEATHER_API_KEY` — openweathermap.org 에서 발급
- `VITE_GOCAMPING_API_KEY` — data.go.kr 고캠핑. 일반 인증키의 Decoding 값을 씁니다

## Hands on 1 — Project Scaffolding

### 구현 내용

1. `npm create vue@latest` 로 프로젝트를 만들고 Router, Pinia, ESLint, Prettier 를 함께 넣었습니다
2. `index.html` → `main.js` → `App.vue` 로 이어지는 진입 경로를 확인하고, 화면을 template,
   script, style 이 한 파일에 들어가는 SFC 로 작성했습니다
3. `npm run dev` 로 개발 서버를 띄우고 HMR 을 확인했습니다. 저장하는 순간 그 모듈만 갈아 끼워서
   새로고침이 아니라 입력해 둔 값이 그대로 남습니다
4. Vue Devtools 를 붙여 Components 탭에서 컴포넌트 트리와 props 를, Timeline 탭에서 반응형
   이벤트가 도는 시점을 봤습니다

### 최종 서비스 적용 여부

이 프로젝트가 그대로 모닥불이 됐습니다. 실습본을 따로 두고 새로 만들지 않았습니다.

강의 폴더 트리는 실습용 부품을 `components/exercise/` 로 격리해 두는데, 이 폴더는 없앴습니다.
실습이 끝나고 나니 그 안의 컴포넌트들이 연습용이 아니라 실제로 화면을 그리는 부품이 됐기 때문입니다.
`vite-plugin-vue-devtools` 는 그대로 뒀습니다.

### 개인 추가·변경 내용

1. 단계마다 프로젝트를 새로 만들지 않고 하나를 계속 고쳐 나갔습니다. 그래서 Hands on 2 의 목업이
   Hands on 7 에서 API 응답으로 바뀌는 식으로 이어집니다
2. 실습 부품을 격리하는 `components/exercise/` 폴더를 만들지 않았습니다. 이 실습본이 그대로
   서비스가 될 것이라 처음부터 실제 부품 자리에 뒀습니다
3. 폴더를 `api` / `composables` / `data` / `stores` 로 나눠 화면과 데이터 처리를 갈랐습니다.
   Hands on 6, 7 에서 채워질 자리를 미리 잡아 둔 것입니다

### 트러블 슈팅

이 단계에서는 없었습니다.

## Hands on 2 — Weather Mockup

### 구현 내용

1. 목업 배열로 날씨 카드 목록을 만들고 `v-for` 로 그렸습니다. `:key` 에는 index 가 아니라 도시 id 를
   줬습니다. index 를 주면 중간 항목이 빠질 때 Vue 가 엉뚱한 DOM 을 재사용합니다
2. `v-if` / `v-else` 로 기온에 따라 다른 라벨을 붙였습니다. `v-show` 는 CSS 로 감추기만 하고
   `v-if` 는 아예 그리지 않는다는 차이를 확인했습니다
3. 검색 입력창을 `v-model` 대신 `:value` 와 `@input` 으로 직접 엮었습니다
4. 카드 안의 버튼에 `@click.stop` 을 걸어 카드까지 같이 눌리는 것을 막았습니다
5. 카드를 누르면 `window.alert` 로 상세를 띄웠습니다

### 최종 서비스 적용 여부

목업 배열은 Hands on 7 에서 실제 API 응답으로 전부 교체됐고, 좌표만 `data/cityList.js` 에
남아 지금도 API 를 부를 때 쓰입니다. 3곳으로 시작한 목록은 전국 17개 시도가 됐습니다.

`v-for` 와 `:key` 는 지금 화면 거의 전부에 들어 있습니다. 지수 바둑판, 야영장 격자, 시군구 목록,
중고거래 판이 모두 같은 방식입니다.

`@click.stop` 은 야영장 카드 안의 찜 하트에 그대로 살아 있습니다. 하트를 누르면 상세가 열리지 않고
찜만 되어야 하기 때문입니다.

`window.alert` 상세는 Hands on 5 에서 `router.push` 로 바뀌었습니다.

> 상태바("{도시}이 선택되었습니다")도 최종 실습본에서 제거했습니다.
> 카드를 눌렀다는 사실을 글로 알려주는 칸인데, 지금은 누른 지역이 지도에서
> 밝게 표시되고 타일에도 테두리가 생겨서 굳이 문장으로 다시 말할 필요가 없습니다.
> 클릭 처리와 `@click.stop` 은 그대로 남아 있습니다.

### 개인 추가·변경 내용

기본 제공은 서울·수원·부산 3곳에 `id` `name` `temp` `status` 네 개 필드였습니다.

1. 도시 7곳 추가: 제주, 강릉, 대관령, 인천, 대구, 광주, 울릉도
2. 필드 6개 추가: `feelsLike` `humidity` `wind` `rainProb` `dust` `updatedAt`
3. 우산 라벨 추가: 강수확률 60% 이상이면 기온 라벨 옆에 하나 더 붙임
4. 기준값 상수화: `HOT_THRESHOLD`(25), `RAIN_THRESHOLD`(60). 카드 배지와 상단 요약이 같은 상수를 봄
5. 상단 요약 추가: "10개 · 평균 22.9°C · 25°C 이상 6곳 · 우산 3곳"
6. 상태 이모지 맵 `STATUS_ICON`: 소나기와 안개를 넣어 상태 종류를 늘림

도시 값은 개수만 채우지 않고 조건 분기를 확인할 수 있게 골랐습니다.
대관령 -2°C 는 음수 기온에서도 라벨이 제대로 붙는지, 인천 25°C 는 "25도 이상" 경계값이
어느 쪽으로 떨어지는지 보려고 넣은 값입니다.

### 트러블 슈팅

한글 검색창에 `v-model` 을 썼더니 "서울" 을 치는 동안 "ㅅ", "서", "설" 이 하나도 안 들어오고
글자가 완성된 뒤에야 들어왔습니다. 한글은 자모를 조합하는 동안에도 input 이벤트가 도는데
`v-model` 은 조합이 끝난 글자만 올려 보냅니다. `:value` 와 `@input` 으로 바꾸니 조합 중인 글자도
그대로 들어옵니다.

## Hands on 3 — Weather Composition

### 구현 내용

1. `ref` 로 검색어와 정렬 기준을 반응형 상태로 만들었습니다. script 에서는 `.value` 로 꺼내지만
   template 에서는 자동으로 벗겨져 이름만 씁니다
2. `computed` 로 검색 결과, 정렬된 목록, 평균 기온을 파생시켰습니다. 의존하는 값이 바뀔 때만
   다시 계산하고 결과를 캐시합니다
3. `watch` 로 정렬 기준 변경을 감시하고, `watchEffect` 로 관련 값이 바뀌면 도는 쪽을 나눠 썼습니다.
   무엇을 보는지 분명히 해야 할 때는 `watch`, 그냥 관련된 게 바뀌면 되는 경우엔 `watchEffect` 입니다
4. `watch` 의 세 번째 인자 `onCleanup` 으로 이전 비동기 요청을 취소했습니다
5. 라이프사이클 훅으로 생성 → 부착 → 갱신 → 소멸 순서를 확인하고, DOM 이 필요한 일을
   `onMounted` 이후로 옮겼습니다
6. watch 와 watchEffect 가 도는 시점을 화면에서 볼 수 있게 로그 패널을 만들었습니다

### 최종 서비스 적용 여부

computed 체인이 지금도 화면의 뼈대입니다. 캠핑장 찾기는 전국 목록에서 사진 있는 곳을 거르고,
검색어로 거르고, 조건으로 다시 거르는 것이 전부 computed 로 이어져 있습니다.

`watch` 는 주소와 화면 상태를 묶는 데 씁니다. 검색어가 바뀌면 `?q=` 를 갱신하고, 주소의
`?district=` 가 바뀌면 그 시군구의 예보와 야영장을 다시 받습니다.

`onMounted` 와 `onBeforeUnmount` 는 지도(Leaflet), ResizeObserver, IntersectionObserver,
스크롤 잠금처럼 Vue 밖의 것을 붙이고 떼는 자리에 씁니다.

> 반응형 로그 패널은 최종 실습본에서 제거했습니다.
> `watch` / `watchEffect` 가 언제 도는지 화면에서 확인하려고 만든 것인데,
> 캠핑 날씨를 보러 온 사람에게는 필요 없는 화면이라 뺐습니다.
> `console.log` 와 스토어 로그는 남아 있어 동작은 개발자 도구에서 확인할 수 있습니다.

로그만 찍던 watcher 다섯 개도 같이 지웠습니다. 주소를 동기화하는 watcher 두 개는 남겼습니다.

### 개인 추가·변경 내용

1. 상태 `sortKey`: 카드 정렬 기준 (기본순 / 기온 높은순 / 이름순)
2. 상태 `logs`: watch 와 watchEffect 가 남기는 로그
3. computed `visibleList`: 검색 결과에 정렬까지 적용. `filteredWeatherList` 와 `sortKey` 를 함께 의존하는 computed 체인
4. computed `averageTemp`: 화면에 보이는 도시의 평균 기온
5. watcher `watch(sortKey)`: 정렬 기준 변경 로그
6. 비동기 watcher `watch(searchQuery)`: `onCleanup` 으로 이전 요청 취소
7. 로그 패널 UI: `console.log` 와 같은 내용을 화면에도 표시

6번은 요구사항에 없지만 예시 화면 콘솔의 `onChange started` / `completed` 가 궁금해서 만들어봤습니다.
빠르게 타이핑하면 `started` → `cancelled` 가 이어지다가 마지막 입력만 `completed` 까지 갑니다.

### 트러블 슈팅

캠핑장 조건 필터를 만들 때 지형과 시설 칩이 눌려도 아무 일이 없었습니다. 오류도 안 났습니다.
`flip(terrains, item)` 처럼 ref 를 함수 인자로 넘겼는데, template 에서는 ref 가 자동으로 벗겨져
함수가 받은 건 ref 가 아니라 배열이었습니다. 그래서 함수 안의 `.value` 대입이 원본에 닿지 않았습니다.
어느 묶음인지를 문자열로 받아 함수 안에서 ref 를 고르도록 고쳤습니다.

값을 찍어 보고서야 알았습니다. 화면만 봐서는 "안 눌리네" 로 끝나는 종류의 버그였습니다.

## Hands on 4 — Weather Component

### 구현 내용

1. 한 파일에 있던 화면을 `WeatherParent`, `BaseDashboardCard`, `SearchBar`, `WeatherCard`
   네 개로 쪼갰습니다
2. 부모가 상태를 들고 `props` 로 내려주고, 자식은 `emits` 로 올려 보내게 했습니다.
   자식이 부모 데이터를 직접 바꾸지 않습니다
3. `BaseDashboardCard` 는 안에 무엇이 들어오는지 모르게 `<slot>` 으로만 받게 만들었습니다.
   껍데기와 내용을 나눈 것입니다
4. `<style scoped>` 로 각 컴포넌트의 스타일이 밖으로 새지 않게 했습니다

슬롯으로 들어간 내용은 시각적으로는 자식 안에 있지만 스크립트는 부모 스코프에서 평가됩니다.
그래서 `BaseDashboardCard` 안에 그려지는 `SearchBar` 가 부모와 직접 통신할 수 있습니다.

### 최종 서비스 적용 여부

넷 중 `BaseDashboardCard`, `SearchBar`, `WeatherCard`, `UnitToggler` 가 지금도 살아 있습니다.
`WeatherParent` 는 Hands on 5 에서 `RegionsView` 가 됐습니다.

`BaseDashboardCard` 는 지금 사이트에서 판(panel)의 공통 생김새를 혼자 책임집니다.
직사각형에 위쪽 가는 선 하나, 그리고 화면에 들어올 때 한 번 떠오르는 연출까지 여기 있습니다.
이 컴포넌트는 여전히 안에 무엇이 들어오는지 모릅니다.

부품은 넷에서 열다섯 개로 늘었습니다. 늘어난 것 중 몇 개만 적으면

- `BonfireGauge` — 모닥불 지수를 실제 모닥불 그림으로 그리는 SVG. 점수에 따라 불꽃 갈래 수가 달라집니다
- `RegionMap` / `CampMap` — Leaflet 지도. 시도 경계 색칠과 야영장 번호 핀
- `CampSheet` — 야영장 상세 드로어. 네 화면이 함께 씁니다
- `PageHero` — 화면 맨 위 사진 배너

### 개인 추가·변경 내용

기본 요구는 네 개 파일로 분리하는 것이었습니다.

1. `BaseDashboardCard` 에 등장 연출 추가: IntersectionObserver 로 화면에 들어올 때 한 번 떠오릅니다.
   판이 세로로 쌓이므로 내려가는 동안 차례로 자리를 잡아 읽는 순서가 생깁니다
2. `BonfireGauge` 추가: 지수를 숫자만이 아니라 실제 모닥불 그림으로 그리는 SVG.
   점수 구간에 따라 불꽃 갈래 수와 불티 개수가 달라집니다
3. `CampSheet` 추가: 야영장 상세 드로어를 하나 만들어 캠핑장 찾기, 오늘의 추천, 찜, 지역 상세
   네 화면이 함께 씁니다. 화면마다 상세를 따로 만들면 같은 코드가 네 벌이 됩니다
4. `PageHero` 추가: 화면 맨 위 전면 사진 배너. `photo` 이름만 props 로 받습니다

### 트러블 슈팅

1. `CampSheet` 를 새로 만들고 세 화면에 붙였는데 드로어가 조용히 안 열렸습니다.
   `import` 를 빠뜨린 것이었는데 eslint 도 빌드도 통과했습니다. eslint 는 template 안의
   등록 안 된 컴포넌트를 잡지 못합니다. 그 뒤로는 컴포넌트를 새로 쓸 때 import 를 눈으로 확인합니다
2. `BonfireGauge` 를 한 화면에 열일곱 개 띄웠더니 전부 마지막 것의 색으로 칠해졌습니다.
   SVG 의 그라디언트 `id` 가 모두 같아서 문서 안에서 충돌한 것이었습니다.
   `useId()` 로 인스턴스마다 다른 id 를 붙여 해결했습니다
3. 주간 그래프의 폭이 안 따라왔습니다. `:key` 로 지역을 바꾸면 그 덩어리가 통째로 새로 만들어지는데,
   ResizeObserver 를 `onMounted` 에서 한 번만 걸어 두어 떨어져 나간 옛 요소를 계속 보고 있었습니다.
   `watch` 로 대상을 갈아타게 고쳤습니다

## Hands on 5 — Weather Router

### 구현 내용

1. Vue Router 를 붙이고 `App.vue` 에 `<RouterView />` 와 내비게이션 바를 놓았습니다.
   SPA 라 HTML 은 한 번만 받고, 주소가 바뀌면 해당 컴포넌트만 갈아 끼웁니다
2. `/weather/:cityId` 동적 경로를 만들고 `route.params` 로 도시 id 를 받아 상세를 그렸습니다
3. `path: '/:pathMatch(.*)*'` Catch-all 을 맨 마지막에 두어 404 를 잡았습니다
4. 모든 라우트를 `component: () => import(...)` 로 감싸 지연 로딩했습니다.
   빌드하면 화면별 청크로 쪼개지고 그 화면에 들어갈 때 내려받습니다
5. 목록에서 상세로 갈 때 `window.alert` 대신 `router.push()` 를 쓰게 바꿨습니다

### 최종 서비스 적용 여부

라우트는 열두 개가 됐습니다. 첫 화면(`/`), 날씨(`/regions`), 캠핑장 찾기(`/camps`),
오늘의 추천(`/camps/today`), 커뮤니티 둘, 찜, 소개, 지역 상세(`/weather/:cityId`), 그리고 Catch-all 입니다.

이 단계에서 만든 것 중 서비스에 가장 크게 남은 것은 상태를 주소에 싣는 방식입니다.
보기 모드(`?view=rank`), 야영장 종류(`?type=글램핑`), 고른 시군구(`?district=`),
고른 지역(`?region=`), 검색어(`?q=`) 가 전부 주소에 들어갑니다.
그래서 링크를 그대로 주고받을 수 있고 뒤로 가기가 예상대로 동작합니다.

화면을 합치면서 없어진 주소는 리다이렉트로 남겼습니다. 순위 화면을 날씨 화면의 보기 모드로 옮기면서
`/ranking` 은 `/regions?view=rank` 로 넘겨줍니다. 예전 링크가 끊기지 않게 하려는 것입니다.

지연 로딩은 첫 화면만 정적으로 import 하고 나머지를 전부 `() => import()` 로 감쌌습니다.
빌드하면 `RegionsView`, `CampStylesView`, `RegionDetailView` 등이 각각 청크로 떨어집니다.

### 개인 추가·변경 내용

1. 추가 view `/ranking`: 기준을 골라 지역 순위를 보는 화면. 나중에 날씨 화면 안으로 합쳤습니다
2. 검색어를 `?q=` 에 유지: 상세에 갔다 뒤로 와도 검색 상태가 남습니다
3. 404 에 요청 경로 표시: `route.fullPath` 를 함께 보여줍니다
4. 없는 도시 코드 처리: `/weather/city_99` 같은 경우 상세 화면 안에서 안내합니다

### 트러블 슈팅

첫 화면에서 스크롤을 가로채는 처리를 넣었는데, 다른 화면으로 넘어가도 스크롤이 잠긴 채로 남았습니다.
`onBeforeUnmount` 에서 잠금과 이벤트 리스너를 반드시 풀어야 합니다.
SPA 는 페이지를 새로 받지 않으므로 화면이 사라질 때 스스로 정리하지 않으면 그대로 남습니다.

## Hands on 6 — Weather Store

### 구현 내용

1. Pinia 스토어를 `state`, `getters`, `actions` 로 만들었습니다. `state` 는 함수로 돌려주고
   `getters` 는 computed 처럼 파생값을, `actions` 는 상태 변경과 비동기 작업을 맡습니다
2. `configStore` 에 단위 상태를 두고 `UnitToggler` 를 내비게이션 바 옆에 놓았습니다.
   화면 전체가 같은 상태를 봅니다
3. getter 가 함수를 돌려주게 만들어 인자를 받는 getter 를 구현했습니다. `isFavorite(id)` 같은 것입니다
4. 단위 변환을 `useTemperature` composable 로 빼서 여러 화면이 같이 쓰게 했습니다
5. 관심 목록 스토어를 추가하고 `localStorage` 에 저장해 새로고침해도 남게 했습니다

props 로 내려도 되는 것을 스토어에 넣으면 오히려 흐름이 안 보입니다. 여러 화면이 함께 보고
어디서든 바꿀 수 있어야 할 때만 스토어로 올렸습니다.

### 최종 서비스 적용 여부

스토어는 셋입니다.

`configStore` 는 실습에서 만든 그대로입니다. `unit` state 와 `unitSymbol` getter 를 그대로 씁니다.

`weatherStore` 는 서비스의 중심이 됐습니다. 17개 지역의 API 응답을 모아 두고 10분간 캐시하며,
지역별 야영장과 주간 예보도 여기서 관리합니다. 화면을 오가도 다시 부르지 않습니다.

`favoriteStore` 는 실습에서 관심 지역이었는데 야영장 찜으로 바꿨습니다.
"강원도를 찜한다" 는 말은 잘 안 쓰고, 가고 싶은 캠핑장을 담아 뒀다가 나중에 예약하기 때문입니다.
야영장은 API 에서 오므로 id 만 저장하면 찜 화면을 열 때마다 전국 목록을 다시 받아야 해서,
화면에 필요한 만큼만 잘라 함께 저장합니다.

`useTemperature` 도 그대로 남았습니다. 원본 값은 항상 섭씨로 두고 화면에 그릴 때만 바꿉니다.
25도 이상 같은 판정은 원본으로 해야 단위를 바꿔도 결과가 흔들리지 않습니다.

### 개인 추가·변경 내용

1. 추가 store `favoriteStore`: state `camps`, getter `count` / `isFavorite(id)` / `recent`,
   action `toggle` / `remove` / `clear`. `localStorage` 에 저장해 새로고침해도 남습니다
2. `configStore` 확장: `unitLabel` 과 `isFahrenheit` getter, `setUnit(unit)` action 추가
3. `useTemperature` composable 로 중복 제거
4. 찜을 세 화면에 연동: 야영장 카드의 하트, 상세 드로어의 찜 버튼, 내비게이션 바의 개수 배지

### 트러블 슈팅

내비게이션 바에 "찜 3" 이라고 뜨는데 찜 화면은 비어 있었습니다.
`localStorage` 에 실습 초반의 옛 id(`city_02` 같은 것)가 남아 있었고, 그 사이 지역 id 체계가
`sido_11` 로 바뀌어 있었습니다. 배지는 개수만 세고 화면은 그 지역을 찾지 못한 것입니다.
불러올 때 지금 없는 id 를 걸러내고 저장소도 함께 정리하도록 고쳤습니다.

## Hands on 7 — Weather Axios

### 구현 내용

1. `axios.create` 로 API 인스턴스를 만들어 baseURL, timeout, 공통 params 를 한 곳에 뒀습니다
2. 목업 배열을 걷어내고 OpenWeatherMap 의 현재 날씨와 대기 오염을 실제로 받아 화면에 꽂았습니다
3. `Promise.all` 로 여러 도시를 한꺼번에 받고, 일부 실패를 허용해야 하는 곳은
   `Promise.allSettled` 로 갈랐습니다
4. 응답 인터셉터를 붙여 오류를 한곳에서 처리했습니다. 재시도와 우리말 오류 문구가 여기 있습니다
5. CORS 로 막히는 공공데이터포털은 개발 서버 프록시를 만들어 우회했습니다
6. 상태 코드별로 처리를 나눴습니다. 401/403 은 인증 문제, 429 는 요청이 너무 많다는 뜻입니다

### 최종 서비스 적용 여부

이 단계에서 목업을 걷어내고 실제 API 로 바꾸면서 캠핑 서비스가 됐습니다. 세 곳을 씁니다.

- OpenWeatherMap — 현재 날씨, 3시간 간격 예보와 강수확률, 대기 오염(PM10, PM2.5), 지오코딩
- Open-Meteo — 자외선, 밤 최저기온, 해발고도, 시군구 250곳의 예보
- 고캠핑(한국관광공사) — 전국 야영장 목록, 반경 야영장, 야영장 사진

모닥불 지수는 이 값들을 100점으로 옮긴 것입니다. 배점은 비 30, 바람 25, 밤 기온 25, 공기 12, 하늘 8 입니다.
등급은 활활, 타닥타닥, 가물가물, 연기만 넷으로 나눕니다.

바람은 평균이 아니라 순간 최대(돌풍)로 봅니다. 밤 기온은 4~14도가 최적이고 26도를 넘으면 2점만 줍니다.
낮 기온이 아니라 밤 최저기온을 보는 이유는 캠핑이 그 자리에서 자기 때문입니다.

인터셉터는 `api/retry.js` 하나로 모아 세 API 가 같이 씁니다.

### 개인 추가·변경 내용

1. 캠핑 컨셉으로 전환: 낮 기온이 아니라 밤 최저기온을 중심에 놓고, 지수를 불의 언어로 옮겼습니다
2. `useBonfireScore` composable: 지수, 등급, 오늘 맞는 캠핑 방식, 침낭 등급, 바람 판정을 한곳에
3. 요소별 점수 펼치기: 합계만 보면 왜 그 점수인지 알 수 없어서 비 30/30, 기온 6/25 처럼 나눠 보여줍니다
4. Open-Meteo 좌표 묶음 호출: 좌표를 콤마로 이어 붙여 17개 지역을 1콜로 받습니다. 시군구 250곳도 1콜입니다
5. 5일 야간 예보: `/forecast` 40구간에서 18시부터 다음 날 06시까지를 하루로 접습니다
6. 시도에서 시군구로 내려가는 드릴다운: 지도나 목록에서 지역을 누르면 시군구를 한 번 더 고릅니다
7. 전국 야영장 검색: 3,096곳을 한 번 받아 두고 브라우저에서 거릅니다. 사진 있는 곳은 2,333곳입니다
8. 조건으로 고르기: 지역, 지형, 시설(전기·온수·장작판매 등), 화로대, 반려동물 동반
9. 한글 부분 검색: "울ㅅ" 만 쳐도 울산이 나오고, "ㅈㅈ" 처럼 자음만 치면 초성 검색으로 갑니다
10. 지오코딩으로 검색 확장: 목록에 없는 지역을 찾으면 좌표를 받아 목록에 더합니다

### 트러블 슈팅

1. 공공데이터포털은 CORS 헤더를 주지 않아 브라우저에서 직접 부르면 막힙니다.
   `vite.config.js` 에 `/api/gocamping` 프록시를 두어 개발 서버가 대신 호출하게 했습니다.
   인증키도 Encoding 값을 쓰면 axios 가 한 번 더 인코딩해서 인증이 실패합니다. Decoding 값을 씁니다
2. Open-Meteo 와 OpenWeatherMap 이 둘 다 `sunrise` 를 주는데 형식이 달라서(ISO 문자열과 초 단위 숫자)
   객체를 합칠 때 덮어써졌습니다. 한 곳에서만 받도록 정리했습니다
3. `/forecast` 는 3시간 간격 40구간을 주는데 처음에는 앞의 8개만 썼습니다.
   나머지를 밤 구간으로 묶으니 추가 호출 없이 5일치 야간 예보가 나왔습니다
4. 밤을 접을 때 날짜 키를 `toISOString()` 으로 만들면 안 됩니다. UTC 로 바뀌면서 한국 시간
   저녁 18~23시가 전날 칸으로 들어갑니다. 지역 시각의 연·월·일을 직접 조합해야 합니다
5. 시군구 목록에 "바람 17.3" 이 떠서 파 보니 Open-Meteo 는 풍속을 km/h 로 줍니다.
   지수의 바람 기준은 m/s 라 3.6배로 읽혀 바람 25점이 통째로 0이 되고 있었습니다.
   요청에 `wind_speed_unit: 'ms'` 를 넣어 맞췄습니다. OpenWeatherMap 은 원래 m/s 라 그대로 둡니다
6. 고캠핑의 `searchList` 는 이름만 훑습니다. "강원" 을 넣으면 이름에 강원이 든 두 곳만 나옵니다.
   지역으로 찾으려면 전체 목록을 받아야 해서 `basedList` 로 한 번에 받아 두고 브라우저에서 거릅니다
7. 야영장 사진 주소에서 `/thumb/thumb_720_` 을 벗기면 원본이 나오는데, 원본이 없고 썸네일만
   등록된 곳이 있어 404 가 납니다. `<img>` 의 `@error` 로 썸네일로 되돌립니다
8. 시군구를 눌러 보다 429 가 났습니다. 확인해 보니 고캠핑의 일일 요청 한도 초과였고,
   한도는 오퍼레이션별로 따로 걸립니다. 호출을 줄이려고 좌표별 캐시와 320ms 디바운스를 넣고,
   429 를 잠깐 몰린 것과 하루 한도가 끝난 것으로 갈라 앞의 경우만 다시 시도하게 했습니다

## Hands on 8 — Weather UI Library

### 구현 내용

1. UI 라이브러리를 비교하고 Naive UI 를 골랐습니다. Vue 3 생태계에는 PrimeVue, Vuetify,
   Element Plus 등이 있고 디자인 기반과 커스텀 자유도가 다릅니다
2. `NConfigProvider` 로 앱을 감싸고 다크 테마를 적용했습니다
3. 라이브러리 기본 색을 그대로 두면 앱이 라이브러리처럼 보여서, `theme.js` 에 테마 오버라이드를
   만들어 프로젝트 팔레트를 주입했습니다
4. 목록 자리를 Skeleton 으로, 결과 없음을 Empty 로, 오류를 Alert 로 바꿨습니다
5. 상세를 Drawer 로 열고 사진을 Carousel 로 넘기게 했습니다

크로스 브라우징과 접근성(WAI-ARIA)이 컴포넌트 레벨에서 이미 처리돼 있다는 점이
직접 만드는 것과 가장 큰 차이였습니다.

### 최종 서비스 적용 여부

Naive UI 는 동작이 필요한 곳에만 쓰고, 화면의 얼굴이 되는 카드·눈금·배너·지수 게이지는
직접 만든 것을 유지했습니다. 지금 쓰는 곳은 이렇습니다.

- Drawer 와 Carousel, Image — 야영장 상세. 고캠핑 사진을 최대 8장 받아 넘겨 봅니다
- Skeleton — 목록과 예보, 야영장이 오기 전 자리
- Tag — 야영장 종류, 화로대, 지형 표시
- Select — 정렬 기준
- Empty — 검색 결과 없음, 찜 없음
- Alert — API 오류 안내
- Message — 셰르파 동행 신청 같은 알림
- Tooltip, Button, BackTop, ConfigProvider

`theme.js` 의 오버라이드도 그대로 남아 있습니다.

### 개인 추가·변경 내용

1. 라이브러리를 전면 채택하지 않았습니다. Drawer, Carousel, Skeleton, Empty, Alert 처럼
   직접 만들면 손이 많이 가는 것만 쓰고, 화면의 얼굴이 되는 카드와 눈금과 배너는 직접 그렸습니다.
   기본 컴포넌트를 그대로 깔면 사이트가 라이브러리 데모처럼 보입니다
2. `theme.js` 로 테마 오버라이드를 만들어 캠핑 팔레트를 주입했습니다.
   Naive UI 기본 색을 그대로 두면 직접 만든 부분과 색이 따로 놉니다
3. 야영장 사진을 Carousel + Image 로 최대 8장까지 넘겨 보게 했습니다.
   고캠핑의 `imageList` 를 붙인 자리입니다
4. Skeleton 을 목록·예보·야영장 세 군데에 각각 형태를 맞춰 넣었습니다.
   전국 야영장은 받는 데 시간이 걸려서 빈 화면을 보여 주지 않으려는 것입니다

### 트러블 슈팅

1. `NCarousel` 은 제 높이가 없습니다. 드로어 안에 넣었더니 남는 세로를 다 먹어서 아래 내용이
   화면 밖으로 밀려났습니다. 높이를 직접 못 박아야 합니다
2. keyframe 안에서는 `var()` 로 준 `width` 가 해석되지 않습니다. 배점 막대가 계속 0px 이었습니다.
   길이는 요소에 박아 두고 늘어나는 것만 `transform: scaleX()` 로 하면 됩니다
3. 모닥불 게이지의 검은 배경을 지우려고 `mix-blend-mode: screen` 을 안쪽 요소에 걸었더니
   부모가 `z-index` 로 만든 쌓임 맥락에 갇혀 판 배경까지 닿지 못했습니다. 바깥 요소로 올려야 합니다
4. 사진 배너를 본문 폭 밖으로 빼면서 `overflow-x: clip` 을 본문에 걸었더니 배너가 잘렸습니다.
   `html` 에 걸어야 합니다. 덤으로 배경 영상이 만들던 가로 넘침도 같이 사라졌습니다

## Hands on 9 — Weather Deployment

### 구현 내용

1. ESLint 와 oxlint 를 함께 걸고 규칙 위반을 전부 정리했습니다. ESLint 가 표준이고
   oxlint 는 Rust 로 만들어 훨씬 빠릅니다
2. Prettier 로 들여쓰기와 따옴표, 줄바꿈을 맞췄습니다. `@vue/eslint-config-prettier` 가
   두 도구의 규칙 충돌을 막아 줍니다
3. API 키를 `.env` 로 옮기고 `VITE_` 접두사를 붙여 클라이언트 번들에 들어가게 했습니다.
   `.env` 는 `.gitignore` 에 넣고 `.env.example` 에 자리만 남겼습니다
4. `vite build` 로 `dist/` 정적 파일을 만들고, 지연 로딩한 화면이 별도 청크로 떨어지는지 확인했습니다

### 최종 서비스 적용 여부

`npx eslint .` 는 오류 0개, `npx prettier --check src/` 는 전부 통과합니다.

키 두 개는 `.env` 에 있고 `.gitignore` 로 막았습니다. `.env.example` 에는 이름만 있습니다.

빌드하면 화면별 청크로 쪼개집니다. 가장 큰 것이 지도를 쓰는 `RegionsView`(gzip 56KB)와
Leaflet 을 함께 쓰는 `DistrictPanel`(gzip 52KB)입니다.

정적 호스팅에는 아직 올리지 않았습니다. 다만 올릴 준비로 `vercel.json` 을 만들어 뒀습니다.
두 가지가 필요해서입니다.

1. 고캠핑 호출이 지나는 `/api/gocamping` 프록시는 `vite.config.js` 에 있어서 `npm run dev`
   에서만 삽니다. 빌드한 정적 파일만 올리면 이 경로를 받아 줄 곳이 없어 야영장 기능이 죽습니다.
   같은 경로를 실제 주소로 넘겨주는 rewrite 를 넣었습니다
2. `createWebHistory` 라서 `/camps` 로 바로 들어오거나 새로고침하면 서버가 그 경로의 파일을
   찾다가 404 를 냅니다. 모든 경로를 `index.html` 로 보내는 SPA fallback 을 넣었습니다

날씨 API 두 곳은 CORS 를 열어 주므로 그대로 동작합니다.

### 개인 추가·변경 내용

1. `vercel.json` 작성: 프록시 rewrite 와 SPA fallback. 위에 적은 두 가지를 넣었습니다
2. `index.html` 정리: 스캐폴딩 기본값이라 탭 제목이 "Vite App" 이었습니다.
   `lang="ko"`, 제목, description 을 채웠습니다
3. 안 쓰는 코드 정리: 아무 데서도 부르지 않는 함수와 스토어 액션, 어느 template 에도 없는
   CSS 클래스와 토큰을 걷어냈습니다. 파일 안에서만 쓰는 함수는 `export` 를 뗐습니다
4. 주석 정리: 요구사항 번호를 가리키던 주석을 전부 서비스 기준으로 다시 썼습니다.
   "과제5 요구 3" 이 아니라 왜 그렇게 만들었는지가 남아 있어야 나중에 읽힙니다

### 트러블 슈팅

`.env` 를 확인하려고 셸에서 `set -a; . ./.env` 로 읽었다가 PATH 가 날아가 `curl` 과 `head` 가
사라졌습니다. `.env` 안에 셸이 해석할 수 있는 값이 들어 있으면 환경이 통째로 덮어써집니다.
그 뒤로는 필요한 줄만 `grep` 으로 꺼내 씁니다.

## 폴더 구조

```
src/
├─ main.js                        Pinia + Router 주입
├─ App.vue                        배경 + 내비게이션 바 + <RouterView /> + 푸터
├─ theme.js                       Naive UI 테마 오버라이드
├─ router/index.js                라우트 정의, 지연 로딩, Catch-all
├─ api/
│  ├─ openWeatherApi.js           현재 날씨 / 예보 / 대기 오염 / 지오코딩
│  ├─ openMeteoApi.js             자외선 / 밤 최저기온 / 해발고도 / 주간 예보
│  ├─ goCampingApi.js             전국 야영장 · 반경 야영장 · 사진
│  └─ retry.js                    429 재시도와 우리말 오류 문구 (세 API 공용)
├─ components/
│  ├─ BaseDashboardCard.vue       판 공통 디자인 (slot)
│  ├─ SearchBar.vue               검색 입력창 (props / emits)
│  ├─ WeatherCard.vue             지역 타일
│  ├─ UnitToggler.vue             ℃ / ℉ 전환
│  ├─ BonfireGauge.vue            지수를 모닥불로 그리는 SVG
│  ├─ RegionMap.vue               시도 경계 색칠 지도
│  ├─ CampMap.vue                 야영장 번호 핀 지도
│  ├─ RankingPanel.vue            오늘의 모닥불 지수 바둑판
│  ├─ WeekPanel.vue               지역별 5일 지수
│  ├─ DistrictPanel.vue           시군구 목록
│  ├─ DistrictSheet.vue           시군구 고르기 드로어
│  ├─ CampSheet.vue               야영장 상세 드로어
│  ├─ CampBackdrop.vue            배경 영상과 불빛
│  ├─ PageHero.vue                화면 맨 위 사진 배너
│  └─ MockNotice.vue              목업 데이터 안내
├─ composables/
│  ├─ useBonfireScore.js          지수 · 등급 · 캠핑 방식 · 침낭 · 바람 판정
│  ├─ useTemperature.js           ℃ → ℉ 변환
│  └─ useHangul.js                자모 · 초성 검색
├─ stores/
│  ├─ weatherStore.js             API 응답 보관 + 캐시
│  ├─ configStore.js              단위 설정
│  └─ favoriteStore.js            찜한 야영장 (localStorage)
├─ data/
│  ├─ cityList.js                 전국 17개 시도 좌표
│  ├─ koreaProvinces.json         시도 경계 (지도용)
│  ├─ koreaMunicipalities.json    시군구 250곳 중심좌표
│  └─ communityMock.js            셰르파 8명 · 중고 장비 16개 (목업)
└─ views/
   ├─ HomeView.vue                표지 + 서비스 소개 + 지수 설명
   ├─ RegionsView.vue             지도 · 지수 · 이번 주 · 목록
   ├─ RegionDetailView.vue        지역 상세 (시군구 · 예보 · 근처 야영장)
   ├─ CampStylesView.vue          캠핑장 찾기 (전국 검색 + 조건)
   ├─ TodayCampsView.vue          오늘의 추천
   ├─ SherpaView.vue              셰르파 동행 (목업)
   ├─ MarketView.vue              장비 중고거래 (목업)
   ├─ FavoritesView.vue           찜한 캠핑장
   ├─ AboutView.vue               서비스 소개와 배점, 데이터 출처
   └─ NotFoundView.vue            Catch-all
```

## 커뮤니티는 목업입니다

셰르파 동행과 장비 중고거래 두 화면은 글과 신청이 오가야 해서 서버가 있어야 합니다.
프런트만 만드는 과제라 화면까지만 만들었고 내용은 `data/communityMock.js` 에 둔 목업입니다.
Hands on 2 에서 목업 배열로 목록을 만들던 방식을 실제 서비스 화면으로 넓힌 것입니다.

들어가면 목업이라는 사실을 맨 위에 밝히고, 동행 신청과 찜처럼 화면 안에서 끝나는 동작만
실제로 눌리게 했습니다. 실제 서비스라면 이 파일이 API 응답으로 바뀌기만 하면 됩니다.
화면은 배열의 모양만 알고 있고 그것이 어디서 왔는지는 모릅니다.

## 사진 출처

야영장 사진은 고캠핑 API 가 주는 것입니다.

배너와 카드에 쓴 사진, 중고거래 장비 사진은 위키미디어 공용의 자유 이용 저작물을 잘라 썼습니다.
저작자 표시가 필요한 것이 섞여 있어 중고거래 화면 아래에 목록을 적어 두었습니다.

배경 영상은 Pixabay Content License 입니다.
