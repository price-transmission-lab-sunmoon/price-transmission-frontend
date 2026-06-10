import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAppStore } from '@/stores/useAppStore';
import type { StreamResponse } from '@/types/timeseries';

// @guide:HOOK-08
export function useSecondaryStreamData() {
  const secondaryCommodityId = useAppStore((s) => s.secondaryCommodityId);
  const granularity = useAppStore((s) => s.granularity);
  const activeSegments = useAppStore((s) => s.activeSegments);

  // primary와 동일 정책: filterFrom/To 전송 금지. 백엔드 전체 응답 + 클라이언트 zoom 잘라봄.
  return useQuery<StreamResponse>({
    queryKey: [
      'stream-secondary',
      secondaryCommodityId,
      granularity,
      activeSegments,
    ],
    queryFn: async () => {
      const params: Record<string, string> = { granularity, grade: 'high,medium' };
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
