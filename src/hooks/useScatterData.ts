import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAppStore } from '@/stores/useAppStore';
import type { ScatterResponse } from '@/types/timeseries';

export function useScatterData() {
  const primaryCommodityId = useAppStore((s) => s.primaryCommodityId);
  const scatterSegment = useAppStore((s) => s.scatterSegment);
  const filterFrom = useAppStore((s) => s.filterFrom);
  const filterTo = useAppStore((s) => s.filterTo);
  const confidenceFilter = useAppStore((s) => s.confidenceFilter);

  const grade = confidenceFilter.length > 0 ? confidenceFilter.join(',') : undefined;

  return useQuery<ScatterResponse>({
    queryKey: ['scatter', primaryCommodityId, scatterSegment, filterFrom, filterTo, grade],
    queryFn: async () => {
      const params: Record<string, string> = { segment: scatterSegment };
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      if (grade) params.grade = grade;

      const res = await client.get<ScatterResponse>(
        ENDPOINTS.COMMODITY_SCATTER(primaryCommodityId!),
        { params },
      );
      return res.data;
    },
    enabled: primaryCommodityId != null,
    retry: 3,
    staleTime: 5 * 60 * 1000,
  });
}
