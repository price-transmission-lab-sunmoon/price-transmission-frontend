import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useAppStore } from '@/stores/useAppStore';
import type { RawPricesResponse } from '@/types/timeseries';

// @guide:HOOK-10
export function useRawPricesData() {
  const primaryCommodityId = useAppStore((s) => s.primaryCommodityId);
  const filterFrom = useAppStore((s) => s.filterFrom);
  const filterTo = useAppStore((s) => s.filterTo);
  const granularity = useAppStore((s) => s.granularity);
  const layoutNumber = useAppStore((s) => s.layoutNumber);

  return useQuery<RawPricesResponse>({
    queryKey: ['raw-prices', primaryCommodityId, layoutNumber, filterFrom, filterTo, granularity],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        layout: layoutNumber,
        granularity,
      };
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;

      const res = await client.get<RawPricesResponse>(
        ENDPOINTS.COMMODITY_RAW_PRICES(primaryCommodityId!),
        { params },
      );
      return res.data;
    },
    enabled: primaryCommodityId !== null,
    retry: 3,
  });
}
