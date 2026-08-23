/**
 * Naive UI 테마 오버라이드.
 *
 * 라이브러리 기본 색을 그대로 쓰면 앱이 라이브러리처럼 보인다.
 * assets/main.css 에 정의한 캠핑 팔레트와 같은 값을 넣어
 * Naive 컴포넌트(드로어, 스켈레톤, 툴팁 등)가 화면에 섞여 들어가게 맞춘다.
 */
export const campTheme = {
  common: {
    primaryColor: '#f0873e',
    primaryColorHover: '#f79a58',
    primaryColorPressed: '#d9722f',
    primaryColorSuppl: '#f0873e',

    infoColor: '#6fb3c7',
    successColor: '#7cc490',
    warningColor: '#e3b341',
    errorColor: '#d9634b',

    baseColor: '#0e1815',
    bodyColor: '#0e1815',
    cardColor: '#16241f',
    modalColor: '#16241f',
    popoverColor: '#1d2f28',
    tableColor: '#16241f',
    inputColor: '#0e1815',

    borderColor: '#2a3f37',
    dividerColor: '#223229',

    textColorBase: '#eaf0ec',
    textColor1: '#eaf0ec',
    textColor2: '#8ba095',
    textColor3: '#5f7269',
    placeholderColor: '#5f7269',

    borderRadius: '9px',
    borderRadiusSmall: '6px',
    fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif",
    fontFamilyMono: "'JetBrains Mono', ui-monospace, monospace",
  },

  Drawer: {
    color: '#16241f',
    headerBorderBottom: '1px solid #223229',
  },

  Skeleton: {
    color: '#1d2f28',
    colorEnd: '#26382f',
  },

  Tooltip: {
    color: '#1d2f28',
    textColor: '#eaf0ec',
  },

  Carousel: {
    dotColor: 'rgba(234, 240, 236, 0.35)',
    dotColorActive: '#f0873e',
    arrowColor: '#eaf0ec',
  },

  Empty: {
    iconColor: '#3d5349',
    textColor: '#5f7269',
  },
}
