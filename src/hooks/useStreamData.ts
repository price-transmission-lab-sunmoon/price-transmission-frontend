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

  // filterFrom/To는 queryKey에서 제외한다. 줌 푸시가 재요청을 유발하지 않도록 하기 위함.
  // queryFn에서도 from/to를 전송하지 않는다. 좁은 응답을 받으면 필터 확장 시 refetch가
  // 일어나지 않아 외부 구간이 빈 화면이 된다.
  // TODO: confidenceFilter 기본값('high,medium') 처리를 훅 밖으로 분리하면 재사용성 높아짐
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
    enabled: primaryCommodityId != null,
    staleTime: 5 * 60 * 1000,
  });
}
