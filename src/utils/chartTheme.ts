// 모든 D3 차트가 공유하는 시각 테마 (축·그리드·warmup band·이벤트 마커·폰트).
export const CHART_THEME = {
  background: 'transparent',
  axisLine: '#e7e2d8', // border-default
  axisText: '#78736a', // text-tertiary
  axisLabel: '#4a463e', // text-secondary
  gridLine: '#f0ebe1', // border-subtle
  gridDasharray: '0', // solid (Observable style)
  baselineRef: '#0d9488', // brand teal
  baselineRefDash: '4,4',
  warmupBand: 'rgba(120, 115, 106, 0.08)',
  warmupLabel: '#a8a298', // text-muted
  eventLine: '#a8a298',
  eventLineDash: '2,4',
  fontFamily: 'inherit',
  fontFamilyMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 11,
} as const;

// 패널 인라인 시계열 차트 공통 margin (top/right/bottom/left).
// TransmissionRate · ZScore · Breakpoints 가 동일 값을 공유 → 중복 제거.
// 그 외 차트(ECT·MLMap·Asymmetry·IQR 등)는 축 라벨 폭이 달라 각자 자체 margin을 유지한다.
export const CHART_MARGINS = {
  panelStandard: { top: 12, right: 12, bottom: 24, left: 44 },
} as const;
