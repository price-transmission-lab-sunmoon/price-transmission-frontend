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
      // grade 기본값을 클라/서버 모두 'high,medium'으로 명시 정렬 (api_spec_vN §/stream 기본값 정합)
      params.grade = confidenceFilter.length > 0 ? confidenceFilter.join(',') : 'high,medium';
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
