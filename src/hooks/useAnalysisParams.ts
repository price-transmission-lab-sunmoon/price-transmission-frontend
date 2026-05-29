import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type { AnalysisParamsResponse } from '@/types/meta';

// @guide:HOOK-04
export function useAnalysisParams() {
  return useQuery<AnalysisParamsResponse>({
    queryKey: ['meta', 'analysis-params'],
    queryFn: async () => {
      const res = await client.get<AnalysisParamsResponse>(ENDPOINTS.META_ANALYSIS_PARAMS);
      return res.data;
    },
    staleTime: 3_600_000, // 1시간 — 파라미터 기준값은 분석 버전이 바뀔 때만 변경
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
