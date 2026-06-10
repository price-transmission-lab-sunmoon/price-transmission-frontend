import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { useAppStore } from '@/stores/useAppStore';
import type { Freshness } from '@/types/meta';

// feature_spec_fe-api-connect_vN §3.2: staleTime 60_000 / gcTime 300_000
// @guide:HOOK-03
export function useFreshness() {
  const query = useQuery<Freshness>({
    queryKey: ['freshness'],
    queryFn: async () => {
      const res = await client.get<Freshness>('/freshness');
      return res.data;
    },
    staleTime: 60_000,
    gcTime: 300_000,
  });

  const setFreshness = useAppStore((s) => s.setFreshness);

  useEffect(() => {
    if (query.data) setFreshness(query.data);
  }, [query.data, setFreshness]);

  return query;
}
