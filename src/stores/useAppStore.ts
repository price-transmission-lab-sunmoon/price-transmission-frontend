import { create } from 'zustand';
import type { Commodity } from '@/types/commodity';
import type { ExternalEvent } from '@/types/event';
import type { Freshness } from '@/types/meta';
import type {
  ConfidenceGrade,
  Granularity,
  PeriodPreset,
  PrimaryPattern,
  SegmentId,
  ViewTab,
  MlModel,
  StatSeriesMetric,
  StatSnapshotMetric,
} from '@/types/literals';

// 패널 섹션·인라인 차트·결과맵 토글 키
type PanelSectionId = 'stat' | 'ml' | 'path' | 'irf';
type InlineChartId = StatSeriesMetric | StatSnapshotMetric;

interface CommodityState {
  commodities: Commodity[];
  primaryCommodityId: string | null;
  secondaryCommodityId: string | null;
  setCommodities: (list: Commodity[]) => void;
  setPrimaryCommodity: (id: string | null) => void;
  setSecondaryCommodity: (id: string | null) => void;
}

interface FilterState {
  filterFrom: string | null; // YYYY-MM
  filterTo: string | null; // YYYY-MM
  granularity: Granularity;
  periodPreset: PeriodPreset | null; // null = 직접 지정 (커스텀 범위)
  confidenceFilter: ConfidenceGrade[]; // 다중 선택
  patternFilter: PrimaryPattern[]; // 다중 선택, 빈 배열 = 전체
  eventFilter: string[]; // event_key 다중 토글
  activeSegments: SegmentId[]; // 품목별 분석 경로 구간 중 켜진 항목
  setFilterRange: (from: string | null, to: string | null) => void;
  setFilterFrom: (from: string | null) => void;
  setFilterTo: (to: string | null) => void;
  setGranularity: (g: Granularity) => void;
  setPeriodPreset: (preset: PeriodPreset | null) => void;
  setConfidenceFilter: (grades: ConfidenceGrade[]) => void;
  setPatternFilter: (patterns: PrimaryPattern[]) => void;
  setEventFilter: (keys: string[]) => void;
  toggleEvent: (key: string) => void;
  setActiveSegments: (segments: SegmentId[]) => void;
  toggleSegment: (segment: SegmentId) => void;
}

interface ViewState {
  activeTab: ViewTab;
  selectedAnomalyId: number | null;
  isPanelOpen: boolean;
  scatterSegment: SegmentId;
  setActiveTab: (tab: ViewTab) => void;
  selectAnomaly: (id: number | null) => void;
  closePanel: () => void;
  setScatterSegment: (segment: SegmentId) => void;
}

interface OverlayState {
  events: ExternalEvent[];
  freshness: Freshness | null;
  layoutNumber: number; // 1~6 (raw-prices 전용)
  isOnboardingVisible: boolean;
  hasSeenOnboardingThisSession: boolean;
  setEvents: (events: ExternalEvent[]) => void;
  setFreshness: (freshness: Freshness) => void;
  setLayoutNumber: (n: number) => void;
  setOnboardingVisible: (visible: boolean) => void;
  setHasSeenOnboardingThisSession: (seen: boolean) => void;
}

interface PanelState {
  panelWidth: number; // 280~520
  expandedSections: Set<PanelSectionId>;
  expandedInlineCharts: Set<InlineChartId>;
  expandedMLMaps: Set<MlModel>;
  setPanelWidth: (w: number) => void;
  toggleSection: (id: PanelSectionId) => void;
  toggleInlineChart: (id: InlineChartId) => void;
  toggleMLMap: (model: MlModel) => void;
}

type AppStore = CommodityState & FilterState & ViewState & OverlayState & PanelState;

export const useAppStore = create<AppStore>((set) => ({
  // ---------- CommodityState ----------
  commodities: [],
  primaryCommodityId: null,
  secondaryCommodityId: null,
  setCommodities: (list) => set({ commodities: list }),
  setPrimaryCommodity: (id) =>
    set((s) => ({
      primaryCommodityId: id,
      // 품목 전환 시 activeSegments를 새 품목의 segments 전체로 초기화
      activeSegments: id
        ? ((s.commodities.find((c) => c.commodity_id === id)?.segments ?? []) as SegmentId[])
        : [],
    })),
  setSecondaryCommodity: (id) => set({ secondaryCommodityId: id }),

  // ---------- FilterState ----------
  filterFrom: null,
  filterTo: null,
  granularity: 'monthly',
  periodPreset: null,
  // reference 등급도 첫 화면에 표시 — high가 0건일 때 "이상 거의 없음"으로 오인 방지
  confidenceFilter: ['high', 'medium', 'reference'],
  patternFilter: [], // 빈 배열 = 전체
  eventFilter: [], // 초기값 전체 해제
  activeSegments: [], // 품목 선택 시 segments로 채움
  setFilterRange: (from, to) => set({ filterFrom: from, filterTo: to, periodPreset: null }),
  setFilterFrom: (from) => set({ filterFrom: from, periodPreset: null }),
  setFilterTo: (to) => set({ filterTo: to, periodPreset: null }),
  setGranularity: (g) => set({ granularity: g }),
  setPeriodPreset: (preset) => set({ periodPreset: preset }),
  setConfidenceFilter: (grades) => set({ confidenceFilter: grades }),
  setPatternFilter: (patterns) => set({ patternFilter: patterns }),
  setEventFilter: (keys) => set({ eventFilter: keys }),
  toggleEvent: (key) =>
    set((s) => ({
      eventFilter: s.eventFilter.includes(key)
        ? s.eventFilter.filter((k) => k !== key)
        : [...s.eventFilter, key],
    })),
  setActiveSegments: (segments) => set({ activeSegments: segments }),
  toggleSegment: (segment) =>
    set((s) => ({
      activeSegments: s.activeSegments.includes(segment)
        ? s.activeSegments.filter((seg) => seg !== segment)
        : [...s.activeSegments, segment],
    })),

  // ---------- ViewState ----------
  activeTab: 'stream',
  selectedAnomalyId: null,
  isPanelOpen: false,
  scatterSegment: 'A',
  // methodology·journey 탭 진입 시 패널 자동 닫힘
  setActiveTab: (tab) =>
    set(
      tab === 'methodology' || tab === 'journey'
        ? { activeTab: tab, isPanelOpen: false, selectedAnomalyId: null }
        : { activeTab: tab },
    ),
  selectAnomaly: (id) => set({ selectedAnomalyId: id, isPanelOpen: id !== null }),
  closePanel: () =>
    set(() => ({
      selectedAnomalyId: null,
      isPanelOpen: false,
      // 패널 닫을 때 인라인·결과맵 펼침 상태 초기화
      expandedInlineCharts: new Set(),
      expandedMLMaps: new Set(),
    })),
  setScatterSegment: (segment) => set({ scatterSegment: segment }),

  // ---------- OverlayState ----------
  events: [],
  freshness: null,
  layoutNumber: 1,
  isOnboardingVisible: false,
  hasSeenOnboardingThisSession: false,
  setEvents: (events) => set({ events }),
  setFreshness: (freshness) => set({ freshness }),
  setLayoutNumber: (n) => set({ layoutNumber: n }),
  setOnboardingVisible: (visible) => set({ isOnboardingVisible: visible }),
  setHasSeenOnboardingThisSession: (seen) => set({ hasSeenOnboardingThisSession: seen }),

  // ---------- PanelState ----------
  panelWidth: 360,
  // TODO: 패널 섹션 초기 펼침 상태를 사용자 설정으로 저장하는 방법 검토 필요
  expandedSections: new Set<PanelSectionId>(['stat']),
  expandedInlineCharts: new Set<InlineChartId>(),
  expandedMLMaps: new Set<MlModel>(),
  setPanelWidth: (w) => set({ panelWidth: Math.min(520, Math.max(280, w)) }),
  toggleSection: (id) =>
    set((s) => {
      const next = new Set(s.expandedSections);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedSections: next };
    }),
  toggleInlineChart: (id) =>
    set((s) => {
      const next = new Set(s.expandedInlineCharts);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedInlineCharts: next };
    }),
  toggleMLMap: (model) =>
    set((s) => {
      const next = new Set(s.expandedMLMaps);
      if (next.has(model)) next.delete(model);
      else next.add(model);
      return { expandedMLMaps: next };
    }),
}));
