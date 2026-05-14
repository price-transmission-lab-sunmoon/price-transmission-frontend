import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import type { Commodity } from '@/types/commodity';

interface CommoditiesResponse {
  commodities: Commodity[];
}

export function useCommodities() {
  return useQuery<Commodity[]>({
    queryKey: ['commodities'],
    queryFn: async () => {
      const res = await client.get<CommoditiesResponse>('/commodities');
      return res.data.commodities;
    },
    staleTime: 5 * 60 * 1000,
  });
}
