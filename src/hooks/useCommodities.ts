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

  useEffect(() => {
    if (!query.data) return;
    setCommodities(query.data);
    const { primaryCommodityId, filterFrom, filterTo } = useAppStore.getState();
    if (primaryCommodityId === null && query.data.length > 0) {
      const first = query.data[0];
      setPrimaryCommodity(first.commodity_id);
      // 초기 진입 시 filterFrom/filterTo가 비어있으면 품목 전체 분석 기간으로 자동 설정.
      // 원시 시계열·전달 구조 차트는 filterFrom/filterTo가 null이면 빈 화면이 될 수 있어
      // 첫 품목의 analysis_start ~ analysis_end로 전체 viewport 노출.
      if (filterFrom === null && filterTo === null) {
        setFilterRange(first.analysis_start, first.analysis_end);
      }
    }
  }, [query.data, setCommodities, setPrimaryCommodity, setFilterRange]);

  return query;
}
