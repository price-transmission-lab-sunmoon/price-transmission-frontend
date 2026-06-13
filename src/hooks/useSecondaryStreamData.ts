import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAppStore } from '@/stores/useAppStore';
import type { StreamResponse } from '@/types/timeseries';

export function useSecondaryStreamData() {
  const secondaryCommodityId = useAppStore((s) => s.secondaryCommodityId);
  const granularity = useAppStore((s) => s.granularity);
  const activeSegments = useAppStore((s) => s.activeSegments);

  // filterFrom/To를 쿼리에 포함하지 않는다. 백엔드 전체 기간 응답 후 클라이언트 줌으로 자른다.
  return useQuery<StreamResponse>({
    queryKey: ['stream-secondary', secondaryCommodityId, granularity, activeSegments],
    queryFn: async () => {
      const params: Record<string, string> = { granularity, grade: 'high,medium' };
      if (activeSegments.length > 0) params.segments = activeSegments.join(',');

      const res = await client.get<StreamResponse>(
        ENDPOINTS.COMMODITY_STREAM(secondaryCommodityId!),
        { params },
      );
      return res.data;
    },
    enabled: secondaryCommodityId != null,
    retry: 3,
  });
}
