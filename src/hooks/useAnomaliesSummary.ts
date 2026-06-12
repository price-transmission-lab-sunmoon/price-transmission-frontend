import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import type { ConfidenceGrade, PrimaryPattern, SegmentId } from '@/types/literals';

export interface AnomalySummaryItem {
  anomaly_id: number;
  commodity_id: string;
  commodity_name_kr: string;
  segment_id: SegmentId;
  period: string;
  primary_pattern: PrimaryPattern;
  confidence_grade: ConfidenceGrade;
  is_new: boolean;
  transmission_rate: number | null;
}

export interface AnomaliesSummaryResponse {
  reference_month: string;
  total_count: number;
  prev_month_count: number;
  count_diff: number;
  anomalies: AnomalySummaryItem[];
}

export function useAnomaliesSummary() {
  return useQuery<AnomaliesSummaryResponse>({
    queryKey: ['anomalies', 'summary'],
    queryFn: async () => {
      const res = await client.get<AnomaliesSummaryResponse>('/anomalies/summary');
      return res.data;
    },
    // feature_spec_fe-api-connect_vN §3.2: staleTime 60_000 / gcTime 300_000
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
