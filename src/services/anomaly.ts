export function formatNum(value: number | null | undefined, digits = 2): string {
  if (value == null || !isFinite(value)) return '—';
  return value.toFixed(digits);
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value == null || !isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

// transmission_rate는 무차원 비율. 0.5 = 절반 전이, -0.5 = 역방향, >1 = 과잉. % 변환 금지.
export function formatRatio(value: number | null | undefined, digits = 2): string {
  if (value == null || !isFinite(value)) return '—';
  return value.toFixed(digits);
}

// 전이율 해석 라벨 (음수=역전, >1=과잉, [0,1]=정상)
export function ratioRegimeLabel(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return '';
  if (value < 0) return '역전';
  if (value > 1) return '과잉';
  return '정상';
}

// 숫자 필드 NaN 필터링
export function safeNum(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return isFinite(n) ? n : null;
}

// 신뢰도 등급 한국어 레이블
export function confidenceLabel(grade: string): string {
  switch (grade) {
    case 'high':
      return '고신뢰';
    case 'medium':
      return '중신뢰';
    case 'reference':
      return '참고';
    default:
      return grade;
  }
}

// 패턴 한국어 레이블
export function patternLabel(pattern: string): string {
  switch (pattern) {
    case 'pattern1':
      return '패턴 1';
    case 'pattern2':
      return '패턴 2';
    case 'pattern3':
      return '패턴 3';
    default:
      return pattern;
  }
}

// ML 모델 표시명
export function mlModelLabel(model: string): string {
  switch (model) {
    case 'isolation_forest':
      return 'Isolation Forest';
    case 'lof':
      return 'LOF';
    case 'ocsvm':
      return 'One-Class SVM';
    default:
      return model;
  }
}
