// feat/fe-panel — 패널 데이터 변환 유틸
// PARSE-NUM-002: null/NaN 숫자 필드를 '—' 또는 N/A로 표시

export function formatNum(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !isFinite(value)) return '—';
  return value.toFixed(digits);
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

// 숫자 필드 NaN 필터링 — PARSE-NUM-002
export function safeNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return isFinite(n) ? n : null;
}

// 신뢰도 등급 한국어 레이블
export function confidenceLabel(grade: string): string {
  switch (grade) {
    case 'high': return '고신뢰';
    case 'medium': return '중신뢰';
    case 'reference': return '참고';
    default: return grade;
  }
}

// 패턴 한국어 레이블
export function patternLabel(pattern: string): string {
  switch (pattern) {
    case 'pattern1': return '패턴 1';
    case 'pattern2': return '패턴 2';
    case 'pattern3': return '패턴 3';
    default: return pattern;
  }
}

// ML 모델 표시명
export function mlModelLabel(model: string): string {
  switch (model) {
    case 'isolation_forest': return 'Isolation Forest';
    case 'lof': return 'LOF';
    case 'ocsvm': return 'One-Class SVM';
    default: return model;
  }
}
