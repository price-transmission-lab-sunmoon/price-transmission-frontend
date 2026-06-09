// 여정 데이터 producer — 반드시 <Canvas> 밖에서 호출(Canvas 안은 react-query
// QueryClient 컨텍스트가 닿지 않음). 결과를 스테이션에 props로 내려보낸다.
// 큐레이트/선택 품목은 전역 store에 묶인 훅(useStreamData 등) 대신 commodityId로
// 직접 쿼리해 전역 상태 오염을 피한다.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { usePipelineData } from '@/hooks/usePipelineData';
import { useAnalysisParams } from '@/hooks/useAnalysisParams';
import { useCommodities } from '@/hooks/useCommodities';
import { useAnomaliesSummary } from '@/hooks/useAnomaliesSummary';
import { usePanelDetail } from '@/hooks/usePanelDetail';
import { useEvents } from '@/hooks/useEvents';
import type { AnomaliesSummaryResponse } from '@/hooks/useAnomaliesSummary';
import type { PipelineMetaResponse, AnalysisParamsResponse } from '@/types/meta';
import type { Commodity } from '@/types/commodity';
import type { AnomalyDetail } from '@/types/anomaly';
import type { StreamResponse, RawPricesResponse } from '@/types/timeseries';
import type { ExternalEvent } from '@/types/event';
import { useAppStore } from '@/stores/useAppStore';

export interface JourneyData {
  commodityId: string;
  anomalyId: number | null;
  pipeline?: PipelineMetaResponse;
  params?: AnalysisParamsResponse;
  commodity?: Commodity;
  summary?: AnomaliesSummaryResponse;
  detail?: AnomalyDetail;
  stream?: StreamResponse;
  rawPrices?: RawPricesResponse;
  events: ExternalEvent[];
}

export function useJourneyData(): JourneyData {
  // 하드코딩 금지 — 상단 품목 드롭다운(전역 primaryCommodityId)을 그대로 따름.
  const commodityId = useAppStore((s) => s.primaryCommodityId) ?? '';
  const pipeline = usePipelineData();
  const params = useAnalysisParams();
  const commodities = useCommodities();
  const summary = useAnomaliesSummary();
  const events = useEvents();

  const commodity = commodities.data?.find((c) => c.commodity_id === commodityId);

  // 대표 이상 선택: 해당 품목 고신뢰 → 해당 품목 아무거나 → 전체 고신뢰 → 첫 항목.
  const anomalyId = useMemo(() => {
    const list = summary.data?.anomalies ?? [];
    const pick =
      list.find((a) => a.commodity_id === commodityId && a.confidence_grade === 'high') ??
      list.find((a) => a.commodity_id === commodityId) ??
      list.find((a) => a.confidence_grade === 'high') ??
      list[0];
    return pick?.anomaly_id ?? null;
  }, [summary.data, commodityId]);

  const detail = usePanelDetail(anomalyId);

  // 선택 품목 stream(anomaly_nodes 전기간 타임라인) — 전역 store 무관 직접 조회.
  const stream = useQuery<StreamResponse>({
    queryKey: ['journey', 'stream', commodityId],
    queryFn: async () => {
      const res = await client.get<StreamResponse>(ENDPOINTS.COMMODITY_STREAM(commodityId), {
        params: { granularity: 'monthly' },
      });
      return res.data;
    },
    enabled: !!commodityId,
    staleTime: 5 * 60 * 1000,
  });

  // ① 원천데이터용 raw-prices(소스 커버리지·index_2020·has_anomaly) — 직접 조회.
  const rawPrices = useQuery<RawPricesResponse>({
    queryKey: ['journey', 'raw-prices', commodityId],
    queryFn: async () => {
      const res = await client.get<RawPricesResponse>(
        ENDPOINTS.COMMODITY_RAW_PRICES(commodityId),
        { params: { layout: 1, granularity: 'monthly' } },
      );
      return res.data;
    },
    enabled: !!commodityId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    commodityId,
    anomalyId,
    pipeline: pipeline.data,
    params: params.data,
    commodity,
    summary: summary.data,
    detail: detail.data,
    stream: stream.data,
    rawPrices: rawPrices.data,
    events: events.data ?? [],
  };
}
