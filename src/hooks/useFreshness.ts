import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import type { Freshness } from '@/types/meta';

export function useFreshness() {
  return useQuery<Freshness>({
    queryKey: ['freshness'],
    queryFn: async () => {
      const res = await client.get<Freshness>('/freshness');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
