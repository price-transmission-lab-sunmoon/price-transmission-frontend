// 인라인 SVG 경로 모음. stroke 기반, 24×24 viewBox, currentColor.
// 외부 아이콘 라이브러리 대신 직접 관리.
export type IconName =
  | 'sparkles'
  | 'check'
  | 'x'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'plus'
  | 'minus'
  | 'calendar'
  | 'alert'
  | 'info'
  | 'help'
  | 'play'
  | 'pause'
  | 'rewind'
  | 'dot'
  | 'list'
  | 'search'
  | 'database'
  | 'clock'
  | 'chart-bar-square'
  | 'trend-up'
  | 'compare'
  | 'bolt';

export const ICON_PATHS: Record<IconName, string> = {
  sparkles:
    'M12 3l1.8 4.6L18.5 9.5l-4.7 1.9L12 16l-1.8-4.6L5.5 9.5l4.7-1.9L12 3zM19 14l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z',
  check: 'M5 12l4.5 4.5L19 7',
  x: 'M6 6l12 12M18 6L6 18',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-left': 'M15 18l-6-6 6-6',
  'chevron-right': 'M9 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  calendar: 'M4 7h16v13H4zM4 7V4h16v3M9 3v4M15 3v4M4 11h16',
  alert: 'M12 4l10 17H2L12 4zM12 10v5M12 18.5h.01',
  info: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 10v6M12 7h.01',
  help: 'M12 22a10 10 0 100-20 10 10 0 000 20zM9.5 9a2.5 2.5 0 015 0c0 2-2.5 2-2.5 4M12 17.5h.01',
  play: 'M7 5l12 7-12 7V5z',
  pause: 'M7 5h3v14H7zM14 5h3v14h-3z',
  rewind: 'M11 19L4 12l7-7M20 19l-7-7 7-7',
  dot: 'M12 13a1 1 0 100-2 1 1 0 000 2z',
  list: 'M4 6h16M4 12h16M4 18h16',
  search: 'M21 21l-5-5M3 10a7 7 0 1014 0 7 7 0 00-14 0z',
  database:
    'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3v12c0 1.7-3.6 3-8 3s-8-1.3-8-3V6zM4 6c0 1.7 3.6 3 8 3s8-1.3 8-3M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 7v5l3 2',
  'chart-bar-square': 'M4 4h16v16H4zM8 16v-4M12 16V8M16 16v-6',
  'trend-up': 'M3 17l6-6 4 4 8-8M14 7h6v6',
  compare: 'M4 7h7l-3-3M20 17h-7l3 3M4 12h16',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
};

// 기본 stroke 굵기. 웜 캔버스에서 가시성 확보를 위해 1.5 대신 2 사용.
export const ICON_STROKE_WIDTH = 2;
