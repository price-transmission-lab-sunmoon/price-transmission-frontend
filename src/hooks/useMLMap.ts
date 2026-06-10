import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type { MlMapResponse } from '@/types/anomaly';
import type { MlModel, ProjectionMethod } from '@/types/literals';

interface UseMLMapParams {
  anomalyId: number | null;
  model: MlModel;
  projectionMethod?: ProjectionMethod;
  enabled?: boolean;
}

// @guide:HOOK-16
export function useMLMap({
  anomalyId,
  model,
  projectionMethod = 'pca',
  enabled = true,
}: UseMLMapParams) {
  return useQuery<MlMapResponse>({
    queryKey: ['panel', 'ml-map', anomalyId, model, projectionMethod],
    queryFn: async () => {
      const res = await client.get<MlMapResponse>(ENDPOINTS.ANOMALY_ML_MAP(anomalyId!), {
        params: { model, projection_method: projectionMethod },
      });
      return res.data;
    },
    enabled: anomalyId !== null && enabled,
    staleTime: 5 * 60 * 1000,
  });
}
