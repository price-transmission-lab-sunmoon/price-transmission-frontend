import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { useAppStore } from '@/stores/useAppStore';
import type { Commodity } from '@/types/commodity';

interface CommoditiesResponse {
  commodities: Commodity[];
}

// CLAUDE §16 자동 선택 정책: /commodities 응답 수신 + primaryCommodityId === null 일 때
// setCommodities 호출 후 primary 자동 지정. 별도 트리거 컴포넌트 없이 본 훅에서만 수행.
export function useCommodities() {
  const query = useQuery<Commodity[]>({
    queryKey: ['commodities'],
    queryFn: async () => {
      const res = await client.get<CommoditiesResponse>('/commodities');
      return res.data.commodities;
    },
    staleTime: 5 * 60 * 1000,
  });

  const setCommodities = useAppStore((s) => s.setCommodities);
  const setPrimaryCommodity = useAppStore((s) => s.setPrimaryCommodity);
  const setFilterRange = useAppStore((s) => s.setFilterRange);
  const setPeriodPreset = useAppStore((s) => s.setPeriodPreset);

  useEffect(() => {
    if (!query.data) return;
    setCommodities(query.data);
    const { primaryCommodityId, filterFrom, filterTo } = useAppStore.getState();
    if (primaryCommodityId === null && query.data.length > 0) {
      const first = query.data[0];
      setPrimaryCommodity(first.commodity_id);
      // 초기 viewport = 최근 3년 (analysis_end 기준).
      // 전체 분석 기간 (10~17년) 을 첫 화면에 압축 표시하면 라인이 빽빽한 지그재그가 되어
      // 변동성이 시각적으로 과장됨. 사용자는 5년·전체 프리셋 또는 미니맵으로 확장 가능.
      // periodPreset='3y'로 명시 → FilterBar UI 와 실 상태 일치.
      if (filterFrom === null && filterTo === null) {
        const from = subYearsClamped(first.analysis_end, 3, first.analysis_start);
        setFilterRange(from, first.analysis_end);
        setPeriodPreset('3y');
      }
    }
  }, [query.data, setCommodities, setPrimaryCommodity, setFilterRange, setPeriodPreset]);

  return query;
}

// YYYY-MM 문자열에서 N년 빼기. floor < min 이면 min으로 클램프.
function subYearsClamped(end: string, years: number, min: string): string {
  const [ey, em] = end.split('-').map(Number);
  const fromY = ey - years;
  const fromYM = `${fromY}-${String(em).padStart(2, '0')}`;
  return fromYM < min ? min : fromYM;
}
