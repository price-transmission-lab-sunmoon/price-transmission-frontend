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

  useEffect(() => {
    if (!query.data) return;
    setCommodities(query.data);
    const { primaryCommodityId } = useAppStore.getState();
    if (primaryCommodityId === null && query.data.length > 0) {
      setPrimaryCommodity(query.data[0].commodity_id);
    }
  }, [query.data, setCommodities, setPrimaryCommodity]);

  return query;
}
