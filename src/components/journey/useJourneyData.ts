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
  normalMode: boolean; // 정상 점 선택 상태(합성 detail — 전이율만, 나머지 —)
  stream?: StreamResponse;
  rawPrices?: RawPricesResponse;
  scatter?: ScatterResponse;
  scatterSegment: string;
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

  // 대표 이상 선택: ① 사용자가 좌측 패널에서 고른 노드(유효하면) → ② summary(당월) → ③ stream(전기간) 폴백.
  const selectedId = useJourneySelection((s) => s.selectedAnomalyId);
  const selectedNormal = useJourneySelection((s) => s.selectedNormal);
  const anomalyId = useMemo(() => {
    if (selectedNormal) return null; // 정상 점 선택 시 이상 detail 미사용
    const nodes = stream.data?.anomaly_nodes ?? [];
    // 사용자가 고른 노드가 현재 품목 stream에 존재하면 우선(품목 바뀌면 무효 → 자동으로 폴백).
    if (selectedId != null && nodes.some((n) => n.anomaly_id === selectedId)) return selectedId;
    const list = (summary.data?.anomalies ?? []).filter((a) => a.commodity_id === commodityId);
    const fromSummary = list.find((a) => a.confidence_grade === 'high') ?? list[0];
    if (fromSummary) return fromSummary.anomaly_id;
    const fromStream =
      nodes.find((n) => n.confidence_grade === 'high') ??
      nodes.find((n) => n.confidence_grade === 'medium') ??
      nodes[nodes.length - 1]; // 최신(stream은 시간순)
    return fromStream?.anomaly_id ?? null;
  }, [summary.data, commodityId, stream.data, selectedId, selectedNormal]);

  const detail = usePanelDetail(anomalyId);

  // 정상 점 선택 → 합성 detail(전이율만 stream에서 조회, 나머지 필드는 undefined → 스테이션이 '—'/정상 처리).
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

  // 노드 선택기(전이 산점도 미니맵)용 scatter — 구간별. 구간은 store(없으면 품목 첫 구간).
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
