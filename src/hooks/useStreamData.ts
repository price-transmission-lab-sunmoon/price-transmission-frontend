import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAppStore } from '@/stores/useAppStore';
import type { StreamResponse } from '@/types/timeseries';

export function useStreamData() {
  const primaryCommodityId = useAppStore((s) => s.primaryCommodityId);
  const granularity = useAppStore((s) => s.granularity);
  const activeSegments = useAppStore((s) => s.activeSegments);
  const confidenceFilter = useAppStore((s) => s.confidenceFilter);
  const patternFilter = useAppStore((s) => s.patternFilter);

  // P2-4: query key에서 filterFrom/filterTo 제외 — 줌으로 인한 푸시가 재요청을 유발하지 않도록.
  // 백엔드는 전체 기간 데이터를 반환하고, 클라이언트가 xScale.domain만 잘라서 렌더링한다.
  // ⚠️ queryFn에서도 from/to 전송 금지 — queryKey 무관하게 좁은 응답을 받으면
  //    이후 filter 확장(미니맵·FilterBar 전체) 시 refetch 안 되어 외부 구간 빈 화면.
  return useQuery<StreamResponse>({
    queryKey: [
      'stream',
      primaryCommodityId,
      granularity,
      activeSegments,
      confidenceFilter,
      patternFilter,
    ],
    queryFn: async () => {
      const params: Record<string, string> = { granularity };
      if (activeSegments.length > 0) params.segments = activeSegments.join(',');
      params.grade = confidenceFilter.length > 0 ? confidenceFilter.join(',') : 'high,medium';
      if (patternFilter.length > 0) params.patterns = patternFilter.join(',');

      const res = await client.get<StreamResponse>(
        ENDPOINTS.COMMODITY_STREAM(primaryCommodityId!),
        { params },
      );
      return res.data;
    },
    enabled: primaryCommodityId !== null,
    staleTime: 5 * 60 * 1000,
  });
}
