import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type { StatSeriesResponse } from '@/types/anomaly';
import type { StatSeriesMetric, Granularity } from '@/types/literals';

interface UseStatSeriesParams {
  anomalyId: number | null;
  metric: StatSeriesMetric;
  from?: string;
  to?: string;
  granularity?: Granularity;
  enabled?: boolean;
}

// @guide:HOOK-13
export function useStatSeries({
  anomalyId,
  metric,
  from,
  to,
  granularity = 'monthly',
  enabled = true,
}: UseStatSeriesParams) {
  return useQuery<StatSeriesResponse>({
    queryKey: ['panel', 'stat-series', anomalyId, metric, from, to, granularity],
    queryFn: async () => {
      const params: Record<string, string> = { metric, granularity };
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await client.get<StatSeriesResponse>(ENDPOINTS.ANOMALY_STAT_SERIES(anomalyId!), {
        params,
      });
      return res.data;
    },
    enabled: anomalyId !== null && enabled,
    staleTime: 5 * 60 * 1000,
  });
}
