import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAppStore } from '@/stores/useAppStore';
import type { StreamResponse } from '@/types/timeseries';

export function useSecondaryStreamData() {
  const secondaryCommodityId = useAppStore((s) => s.secondaryCommodityId);
  const filterFrom = useAppStore((s) => s.filterFrom);
  const filterTo = useAppStore((s) => s.filterTo);
  const granularity = useAppStore((s) => s.granularity);
  const activeSegments = useAppStore((s) => s.activeSegments);

  return useQuery<StreamResponse>({
    queryKey: [
      'stream-secondary',
      secondaryCommodityId,
      filterFrom,
      filterTo,
      granularity,
      activeSegments,
    ],
    queryFn: async () => {
      const params: Record<string, string> = { granularity, grade: 'high,medium' };
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      if (activeSegments.length > 0) params.segments = activeSegments.join(',');

      const res = await client.get<StreamResponse>(
        ENDPOINTS.COMMODITY_STREAM(secondaryCommodityId!),
        { params },
      );
      return res.data;
    },
    enabled: secondaryCommodityId !== null,
    retry: 3,
  });
}
