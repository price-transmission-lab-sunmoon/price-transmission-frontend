import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type { IrfResponse } from '@/types/anomaly';

interface UseIRFParams {
  anomalyId: number | null;
  includeSubperiods?: boolean;
  enabled?: boolean;
}

export function useIRF({ anomalyId, includeSubperiods = true, enabled = true }: UseIRFParams) {
  return useQuery<IrfResponse>({
    queryKey: ['panel', 'irf', anomalyId, includeSubperiods],
    queryFn: async () => {
      const res = await client.get<IrfResponse>(ENDPOINTS.ANOMALY_IRF(anomalyId!), {
        params: { include_subperiods: includeSubperiods },
      });
      return res.data;
    },
    enabled: anomalyId !== null && enabled,
    staleTime: 5 * 60 * 1000,
  });
}
