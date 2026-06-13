import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type { PipelineMetaResponse } from '@/types/meta';

export function usePipelineData() {
  return useQuery<PipelineMetaResponse>({
    queryKey: ['meta', 'pipeline'],
    queryFn: async () => {
      const res = await client.get<PipelineMetaResponse>(ENDPOINTS.META_PIPELINE);
      return res.data;
    },
    staleTime: 3_600_000, // 1시간. 파이프라인 구조는 분석 버전이 바뀔 때만 변경
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
