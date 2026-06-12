import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type { StatSnapshotResponse } from '@/types/anomaly';
import type { StatSnapshotMetric } from '@/types/literals';

interface UseStatSnapshotParams {
  anomalyId: number | null;
  metric: StatSnapshotMetric;
  enabled?: boolean;
}

export function useStatSnapshot({ anomalyId, metric, enabled = true }: UseStatSnapshotParams) {
  return useQuery<StatSnapshotResponse>({
    queryKey: ['panel', 'stat-snapshot', anomalyId, metric],
    queryFn: async () => {
      const res = await client.get<StatSnapshotResponse>(
        ENDPOINTS.ANOMALY_STAT_SNAPSHOT(anomalyId!),
        { params: { metric } },
      );
      return res.data;
    },
    enabled: anomalyId != null && enabled,
    staleTime: 5 * 60 * 1000,
  });
}
