import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAppStore } from '@/stores/useAppStore';
import type { StreamMinimapResponse, RawPricesMinimapResponse } from '@/types/timeseries';

export type MinimapVariant = 'stream' | 'raw-prices';

// @guide:HOOK-11
export function useMinimapData(variant: MinimapVariant) {
  const primaryCommodityId = useAppStore((s) => s.primaryCommodityId);
  const activeSegments = useAppStore((s) => s.activeSegments);
  const layoutNumber = useAppStore((s) => s.layoutNumber);

  return useQuery<StreamMinimapResponse | RawPricesMinimapResponse>({
    queryKey: [
      'minimap',
      variant,
      primaryCommodityId,
      variant === 'stream' ? activeSegments.join(',') : undefined,
      variant === 'raw-prices' ? layoutNumber : undefined,
    ],
    queryFn: async () => {
      if (variant === 'stream') {
        const params: Record<string, string> = {};
        if (activeSegments.length > 0) {
          params.segments = activeSegments.join(',');
        }
        const res = await client.get<StreamMinimapResponse>(
          ENDPOINTS.COMMODITY_STREAM_MINIMAP(primaryCommodityId!),
          { params },
        );
        return res.data;
      } else {
        const res = await client.get<RawPricesMinimapResponse>(
          ENDPOINTS.COMMODITY_RAW_PRICES_MINIMAP(primaryCommodityId!),
          { params: { layout: layoutNumber } },
        );
        return res.data;
      }
    },
    enabled: primaryCommodityId !== null,
  });
}
