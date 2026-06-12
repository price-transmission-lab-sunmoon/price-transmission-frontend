import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type { AnomalyDetail } from '@/types/anomaly';

export function usePanelDetail(anomalyId: number | null) {
  return useQuery<AnomalyDetail>({
    queryKey: ['panel', 'detail', anomalyId],
    queryFn: async () => {
      const res = await client.get<AnomalyDetail>(ENDPOINTS.ANOMALY_DETAIL(anomalyId!));
      return res.data;
    },
    enabled: anomalyId != null,
    staleTime: 5 * 60 * 1000,
  });
}
