/**
 * Chart visual theme — axes · grid · warmup band · event markers · fonts.
 * Shared by every D3 chart (StreamChart · Scatter · RawPrices · Minimap · 8 inline).
 * Reference: docs/re-design_specs/02-chart-palette.md §7.
 */
export const CHART_THEME = {
  background: 'transparent',
  axisLine: '#e7e2d8',     // border-default
  axisText: '#78736a',     // text-tertiary
  axisLabel: '#4a463e',    // text-secondary
  gridLine: '#f0ebe1',     // border-subtle
  gridDasharray: '0',      // solid (Observable style)
  baselineRef: '#0d9488',  // brand teal
  baselineRefDash: '4,4',
  warmupBand: 'rgba(120, 115, 106, 0.08)',
  warmupLabel: '#a8a298',  // text-muted
  eventLine: '#a8a298',
  eventLineDash: '2,4',
  fontFamily: 'inherit',
  fontFamilyMono:
    "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 11,
} as const;
