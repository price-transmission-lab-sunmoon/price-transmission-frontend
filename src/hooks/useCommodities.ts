import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { useAppStore } from '@/stores/useAppStore';
import type { Commodity } from '@/types/commodity';

interface CommoditiesResponse {
  commodities: Commodity[];
}

// /commodities 응답 수신 시 primary 자동 지정. 이 훅에서만 수행.
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
    if (primaryCommodityId == null && query.data.length > 0) {
      const first = query.data[0];
      setPrimaryCommodity(first.commodity_id);
      // 초기 viewport = 최근 3년. periodPreset='3y'로 명시해 FilterBar 상태와 일치시킨다.
      if (filterFrom == null && filterTo == null) {
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
