import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAppStore } from '@/stores/useAppStore';
import type { StreamResponse } from '@/types/timeseries';

export function useStreamData() {
  const primaryCommodityId = useAppStore((s) => s.primaryCommodityId);
  const filterFrom = useAppStore((s) => s.filterFrom);
  const filterTo = useAppStore((s) => s.filterTo);
  const granularity = useAppStore((s) => s.granularity);
  const activeSegments = useAppStore((s) => s.activeSegments);
  const confidenceFilter = useAppStore((s) => s.confidenceFilter);
  const patternFilter = useAppStore((s) => s.patternFilter);

  return useQuery<StreamResponse>({
    queryKey: [
      'stream',
      primaryCommodityId,
      filterFrom,
      filterTo,
      granularity,
      activeSegments,
      confidenceFilter,
      patternFilter,
    ],
    queryFn: async () => {
      const params: Record<string, string> = { granularity };
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      if (activeSegments.length > 0) params.segments = activeSegments.join(',');
      if (confidenceFilter.length > 0) params.grade = confidenceFilter.join(',');
      if (patternFilter.length > 0) params.patterns = patternFilter.join(',');

      const res = await client.get<StreamResponse>(
        ENDPOINTS.COMMODITY_STREAM(primaryCommodityId!),
        { params },
      );
      return res.data;
    },
    enabled: primaryCommodityId !== null,
    retry: 3,
  });
}
