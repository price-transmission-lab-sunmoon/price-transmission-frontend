import { create } from 'zustand';
import type { Commodity } from '@/types/commodity';
import type { ExternalEvent } from '@/types/event';
import type { Freshness } from '@/types/meta';
import type {
  ConfidenceGrade,
  Granularity,
  PrimaryPattern,
  SegmentId,
  ViewTab,
  MlModel,
  StatSeriesMetric,
  StatSnapshotMetric,
} from '@/types/literals';

// ============================================================
// 단일 useAppStore — frame_spec_frontend_vN §6 + web_plan_vN §3·§6 기반 슬라이스 결합 구조
// 슬라이스: Commodity / Filter / View / Overlay / Panel
// 후속 feat/fe-layout-filter, feat/fe-panel 단계에서 슬라이스 결합 패턴 구체화
// ============================================================

// 패널 섹션·인라인 차트·결과맵 토글 키
type PanelSectionId = 'stat' | 'ml' | 'path' | 'irf';
type InlineChartId = StatSeriesMetric | StatSnapshotMetric; // transmission_rate | zscore | ect | breakpoints | iqr | asymmetry

// ============================================================
// CommodityState — 주·보조 품목
// ============================================================
interface CommodityState {
  commodities: Commodity[];
  primaryCommodityId: string | null;
  secondaryCommodityId: string | null;
  setCommodities: (list: Commodity[]) => void;
  selectPrimaryCommodity: (id: string | null) => void;
  selectSecondaryCommodity: (id: string | null) => void;
}

// ============================================================
// FilterState — 기간·구간·등급·패턴·사건 필터
// ============================================================
interface FilterState {
  filterFrom: string | null; // YYYY-MM
  filterTo: string | null; // YYYY-MM
  granularity: Granularity;
  confidenceFilter: ConfidenceGrade[]; // 다중 선택
  patternFilter: PrimaryPattern[]; // 다중 선택, 빈 배열 = 전체
  eventFilter: string[]; // event_key 다중 토글
  activeSegments: SegmentId[]; // 품목별 분석 경로 구간 중 켜진 항목
  setFilterRange: (from: string | null, to: string | null) => void;
  setGranularity: (g: Granularity) => void;
  setConfidenceFilter: (grades: ConfidenceGrade[]) => void;
  setPatternFilter: (patterns: PrimaryPattern[]) => void;
  setEventFilter: (keys: string[]) => void;
  toggleEvent: (key: string) => void;
  setActiveSegments: (segments: SegmentId[]) => void;
  toggleSegment: (segment: SegmentId) => void;
}

// ============================================================
// ViewState — 현재 뷰 탭 + 선택된 이상 노드
// ============================================================
interface ViewState {
  activeTab: ViewTab;
  selectedAnomalyId: number | null;
  isPanelOpen: boolean;
  setActiveTab: (tab: ViewTab) => void;
  selectAnomaly: (id: number | null) => void;
  closePanel: () => void;
}

// ============================================================
// OverlayState — 이벤트·신선도·원시 시계열 레이아웃·온보딩
// ============================================================
interface OverlayState {
  events: ExternalEvent[];
  freshness: Freshness | null;
  layoutNumber: number; // 1~6 (raw-prices 전용)
  isOnboardingVisible: boolean;
  setEvents: (events: ExternalEvent[]) => void;
  setFreshness: (freshness: Freshness) => void;
  setLayoutNumber: (n: number) => void;
  setOnboardingVisible: (visible: boolean) => void;
}

// ============================================================
// PanelState — 패널 너비·섹션 토글·인라인 차트 토글·결과맵 토글
// web_plan_vN §6.6 (패널 너비 280~520px) + feature_dev_list_vN §feat/fe-panel 정의
// ============================================================
interface PanelState {
  panelWidth: number; // 280 ~ 520
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
  selectPrimaryCommodity: (id) => set({ primaryCommodityId: id }),
  selectSecondaryCommodity: (id) => set({ secondaryCommodityId: id }),

  // ---------- FilterState ----------
  filterFrom: null,
  filterTo: null,
  granularity: 'monthly',
  confidenceFilter: ['high', 'medium'],
  patternFilter: [], // 빈 배열 = 전체
  eventFilter: [], // 전체 해제 (web_plan_vN §3.4 초기값)
  activeSegments: [], // 품목 선택 시 segments로 채움
  setFilterRange: (from, to) => set({ filterFrom: from, filterTo: to }),
  setGranularity: (g) => set({ granularity: g }),
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
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectAnomaly: (id) => set({ selectedAnomalyId: id, isPanelOpen: id !== null }),
  closePanel: () =>
    set(() => ({
      selectedAnomalyId: null,
      isPanelOpen: false,
      // 패널 닫을 때 인라인·결과맵 펼침 상태 초기화
      expandedInlineCharts: new Set(),
      expandedMLMaps: new Set(),
    })),

  // ---------- OverlayState ----------
  events: [],
  freshness: null,
  layoutNumber: 1, // 원시 시계열 기본 레이아웃
  isOnboardingVisible: false,
  setEvents: (events) => set({ events }),
  setFreshness: (freshness) => set({ freshness }),
  setLayoutNumber: (n) => set({ layoutNumber: n }),
  setOnboardingVisible: (visible) => set({ isOnboardingVisible: visible }),

  // ---------- PanelState ----------
  panelWidth: 360, // FE-PANEL §3.3 ① 기본값
  expandedSections: new Set<PanelSectionId>(['stat', 'ml', 'path', 'irf']), // 4개 모두 기본 펼침
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
