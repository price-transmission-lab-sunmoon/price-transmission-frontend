import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAppStore } from '@/stores/useAppStore';
import type { StreamMinimapResponse } from '@/types/timeseries';

export type MinimapVariant = 'stream' | 'raw-prices';

export function useMinimapData(variant: MinimapVariant) {
  const primaryCommodityId = useAppStore((s) => s.primaryCommodityId);
  const activeSegments = useAppStore((s) => s.activeSegments);

  const segmentsParam = activeSegments.length > 0 ? activeSegments.join(',') : undefined;

  return useQuery<StreamMinimapResponse>({
    queryKey: ['minimap', variant, primaryCommodityId, activeSegments.join(',')],
    enabled: primaryCommodityId !== null,
    queryFn: async () => {
      const url =
        variant === 'stream'
          ? ENDPOINTS.COMMODITY_STREAM_MINIMAP(primaryCommodityId!)
          : ENDPOINTS.COMMODITY_RAW_PRICES_MINIMAP(primaryCommodityId!);

      const params: Record<string, string> = {};
      if (segmentsParam) params.segments = segmentsParam;

      const { data } = await client.get<StreamMinimapResponse>(url, { params });
      return data;
    },
  });
}
