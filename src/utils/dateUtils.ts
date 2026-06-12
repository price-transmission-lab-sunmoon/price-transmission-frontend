import { parse, format, subMonths, subYears } from 'date-fns';

// YYYY-MM 문자열을 Date 객체로 파싱
export function parseYearMonth(ym: string): Date {
  return parse(ym, 'yyyy-MM', new Date());
}

export function formatYearMonth(d: Date): string {
  return format(d, 'yyyy-MM');
}

export function subtractMonths(base: string, n: number): string {
  const d = parseYearMonth(base);
  return formatYearMonth(subMonths(d, n));
}

export function subtractYears(base: string, n: number): string {
  const d = parseYearMonth(base);
  return formatYearMonth(subYears(d, n));
}

// freshness.data_up_to 기준으로 기간 프리셋을 filterFrom으로 변환. 'all'이면 analysisStart 반환.
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

// freshness.data_up_to와 commodity.analysis_end 중 더 최신값 반환.
// freshness가 stale할 때 실 데이터 끝을 놓치지 않기 위한 안전망.
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
