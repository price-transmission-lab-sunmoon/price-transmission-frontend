import { parse, format, subMonths, subYears } from 'date-fns';

// YYYY-MM 문자열을 Date 객체로 파싱 (frame_spec_frontend_vN §6.5)
// @guide:UTIL-01
export function parseYearMonth(ym: string): Date {
  return parse(ym, 'yyyy-MM', new Date());
}

// Date → YYYY-MM 문자열 포맷
export function formatYearMonth(d: Date): string {
  return format(d, 'yyyy-MM');
}

// 기준 월(YYYY-MM)에서 N개월 뺀 YYYY-MM 반환
export function subtractMonths(base: string, n: number): string {
  const d = parseYearMonth(base);
  return formatYearMonth(subMonths(d, n));
}

// 기준 월(YYYY-MM)에서 N년 뺀 YYYY-MM 반환
export function subtractYears(base: string, n: number): string {
  const d = parseYearMonth(base);
  return formatYearMonth(subYears(d, n));
}

// freshness.data_up_to 기준으로 기간 프리셋 → filterFrom 계산
// 'all' 의 경우 analysisStart를 그대로 반환
export function presetToFrom(
  preset: '3m' | '6m' | '1y' | '3y' | '5y' | 'all',
  dataUpTo: string,
  analysisStart: string,
): string {
  switch (preset) {
    case '3m':
      return subtractMonths(dataUpTo, 3);
    case '6m':
      return subtractMonths(dataUpTo, 6);
    case '1y':
      return subtractYears(dataUpTo, 1);
    case '3y':
      return subtractYears(dataUpTo, 3);
    case '5y':
      return subtractYears(dataUpTo, 5);
    case 'all':
      return analysisStart;
  }
}

// P1-1: freshness.data_up_to와 commodity.analysis_end 중 더 최신값 반환.
// 백엔드 freshness가 stale한 경우 (예: data_up_to=2024-12인데 실데이터는 2026-02까지) 안전망.
export function resolveEffectiveDataEnd(
  freshnessUpTo: string | null | undefined,
  analysisEnd: string | null | undefined,
): string | null {
  const f = freshnessUpTo ?? null;
  const a = analysisEnd ?? null;
  if (f && a) return f > a ? f : a;
  return f ?? a ?? null;
}

// YYYY-MM → 한국어 표시 (예: "2026년 3월")
export function formatYearMonthKr(ym: string): string {
  const d = parseYearMonth(ym);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

// YYYY-MM-DD → 한국어 표시 (예: "4월 15일")
export function formatDateKr(dateStr: string): string {
  const d = parse(dateStr, 'yyyy-MM-dd', new Date());
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
