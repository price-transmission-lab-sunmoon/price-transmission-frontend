// 여정 데이터 producer. Canvas 밖에서 호출한다(Canvas 안은 QueryClient 컨텍스트 미도달).
// 전역 store 훅 대신 commodityId로 직접 쿼리해 전역 상태 오염을 피한다.
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
import type { StreamResponse, RawPricesResponse, ScatterResponse } from '@/types/timeseries';
import type { ExternalEvent } from '@/types/event';
import { useAppStore } from '@/stores/useAppStore';
import { useJourneySelection } from './journeyContract';

export interface JourneyData {
  commodityId: string;
  anomalyId: number | null;
  pipeline?: PipelineMetaResponse;
  params?: AnalysisParamsResponse;
  commodity?: Commodity;
  summary?: AnomaliesSummaryResponse;
  detail?: AnomalyDetail;
  normalMode: boolean; // 정상 점 선택 상태(합성 detail: 전이율만 채우고 나머지는 미정의)
  stream?: StreamResponse;
  rawPrices?: RawPricesResponse;
  scatter?: ScatterResponse;
  scatterSegment: string;
  events: ExternalEvent[];
}

export function useJourneyData(): JourneyData {
  const commodityId = useAppStore((s) => s.primaryCommodityId) ?? '';
  const pipeline = usePipelineData();
  const params = useAnalysisParams();
  const commodities = useCommodities();
  const summary = useAnomaliesSummary();
  const events = useEvents();

  const commodity = commodities.data?.find((c) => c.commodity_id === commodityId);

  // 선택 품목 stream. 전역 store와 무관하게 직접 조회한다.
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

  // 대표 이상 선택: 사용자가 고른 노드(현 품목 유효), summary, stream 순으로 폴백.
  const selectedId = useJourneySelection((s) => s.selectedAnomalyId);
  const selectedNormal = useJourneySelection((s) => s.selectedNormal);
  const anomalyId = useMemo(() => {
    if (selectedNormal) return null; // 정상 점 선택 시 이상 detail 미사용
    const nodes = stream.data?.anomaly_nodes ?? [];
    // 사용자가 고른 노드가 현 품목 stream에 존재하면 우선, 없으면 무효로 폴백.
    if (selectedId != null && nodes.some((n) => n.anomaly_id === selectedId)) return selectedId;
    const list = (summary.data?.anomalies ?? []).filter((a) => a.commodity_id === commodityId);
    const fromSummary = list.find((a) => a.confidence_grade === 'high') ?? list[0];
    if (fromSummary) return fromSummary.anomaly_id;
    const fromStream =
      nodes.find((n) => n.confidence_grade === 'high') ??
      nodes.find((n) => n.confidence_grade === 'medium') ??
      nodes[nodes.length - 1];
    return fromStream?.anomaly_id ?? null;
  }, [summary.data, commodityId, stream.data, selectedId, selectedNormal]);

  const detail = usePanelDetail(anomalyId);

  // 정상 점 선택 시 합성 detail. 전이율만 stream에서 채우고 나머지는 undefined.
  const normalDetail = useMemo<AnomalyDetail | undefined>(() => {
    if (!selectedNormal) return undefined;
    const series = stream.data?.series?.find((s) => s.segment_id === selectedNormal.segment);
    const dp = series?.data.find((d) => d.period === selectedNormal.period);
    const tr =
      dp?.transmission_rate ??
      (selectedNormal.upstream_pct !== 0
        ? selectedNormal.downstream_pct / selectedNormal.upstream_pct
        : null);
    return {
      anomaly_id: -1,
      commodity_id: commodityId,
      segment_id: selectedNormal.segment,
      period: selectedNormal.period,
      pattern_types: [],
      is_new: false,
      judgment_path: [],
      stat_metrics: { transmission_rate: tr },
    } as unknown as AnomalyDetail;
  }, [selectedNormal, stream.data, commodityId]);

  // 원천데이터용 raw-prices. 직접 조회한다.
  const rawPrices = useQuery<RawPricesResponse>({
    queryKey: ['journey', 'raw-prices', commodityId],
    queryFn: async () => {
      const res = await client.get<RawPricesResponse>(ENDPOINTS.COMMODITY_RAW_PRICES(commodityId), {
        params: { layout: 1, granularity: 'monthly' },
      });
      return res.data;
    },
    enabled: !!commodityId,
    staleTime: 5 * 60 * 1000,
  });

  // 노드 선택기용 scatter. 구간별로 조회하며, store가 없으면 품목 첫 구간을 사용한다.
  const pickerSegment = useJourneySelection((s) => s.pickerSegment);
  const scatterSegment = pickerSegment ?? commodity?.segments?.[0] ?? '';
  const scatter = useQuery<ScatterResponse>({
    queryKey: ['journey', 'scatter', commodityId, scatterSegment],
    queryFn: async () => {
      const res = await client.get<ScatterResponse>(ENDPOINTS.COMMODITY_SCATTER(commodityId), {
        params: { segment: scatterSegment },
      });
      return res.data;
    },
    enabled: !!commodityId && !!scatterSegment,
    staleTime: 5 * 60 * 1000,
  });

  return {
    commodityId,
    anomalyId,
    pipeline: pipeline.data,
    params: params.data,
    commodity,
    summary: summary.data,
    detail: normalDetail ?? detail.data,
    normalMode: !!selectedNormal,
    stream: stream.data,
    rawPrices: rawPrices.data,
    scatter: scatter.data,
    scatterSegment,
    events: events.data ?? [],
  };
}
