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

// ============================================================
// 단일 useAppStore — frame_spec_frontend_vN §6 + web_plan_vN §3·§6 기반 슬라이스 결합 구조
// 슬라이스: Commodity / Filter / View / Overlay / Panel
// ============================================================

// 패널 섹션·인라인 차트·결과맵 토글 키
type PanelSectionId = 'stat' | 'ml' | 'path' | 'irf';
type InlineChartId = StatSeriesMetric | StatSnapshotMetric; // transmission_rate | zscore | ect | breakpoints | iqr | asymmetry

// ============================================================
// CommodityState — 주·보조 품목
// feature_spec_fe-layout-filter_vN §3.1 SoT
// ============================================================
// @guide:STORE-02
interface CommodityState {
  commodities: Commodity[];
  primaryCommodityId: string | null;
  secondaryCommodityId: string | null;
  setCommodities: (list: Commodity[]) => void;
  // IS-1: setPrimaryCommodity (fe-layout-filter v5 §3.1 v5 신규 명시 — Banner 배지 클릭 호출 대상)
  setPrimaryCommodity: (id: string | null) => void;
  // IS-1: setSecondaryCommodity (fe-layout-filter v5 §3.1)
  setSecondaryCommodity: (id: string | null) => void;
}

// ============================================================
// FilterState — 기간·구간·등급·패턴·사건 필터
// feature_spec_fe-layout-filter_vN §3.1 SoT
// ============================================================
// @guide:STORE-03
interface FilterState {
  filterFrom: string | null; // YYYY-MM
  filterTo: string | null; // YYYY-MM
  granularity: Granularity;
  // IS-4: periodPreset (feature_dev_list_vN §feat/fe-layout-filter FilterBar 6종)
  periodPreset: PeriodPreset | null; // null = 직접 지정 (커스텀 범위)
  confidenceFilter: ConfidenceGrade[]; // 다중 선택
  patternFilter: PrimaryPattern[]; // 다중 선택, 빈 배열 = 전체
  eventFilter: string[]; // event_key 다중 토글
  activeSegments: SegmentId[]; // 품목별 분석 경로 구간 중 켜진 항목
  setFilterRange: (from: string | null, to: string | null) => void;
  // IS-5: setFilterFrom / setFilterTo 개별 액션 (fe-minimap v2 §3.2, fe-raw-timeseries v2 §3.2 의존)
  setFilterFrom: (from: string | null) => void;
  setFilterTo: (to: string | null) => void;
  setGranularity: (g: Granularity) => void;
  // IS-4: setPeriodPreset 액션
  setPeriodPreset: (preset: PeriodPreset | null) => void;
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
// @guide:STORE-04
interface ViewState {
  activeTab: ViewTab;
  selectedAnomalyId: number | null;
  isPanelOpen: boolean;
  // IS-3: scatterSegment (feature_spec_fe-scatter-chart_vN §1.3)
  scatterSegment: SegmentId;
  setActiveTab: (tab: ViewTab) => void;
  selectAnomaly: (id: number | null) => void;
  closePanel: () => void;
  // IS-3: setScatterSegment 액션
  setScatterSegment: (segment: SegmentId) => void;
}

// ============================================================
// OverlayState — 이벤트·신선도·원시 시계열 레이아웃·온보딩
// ============================================================
// @guide:STORE-05
interface OverlayState {
  events: ExternalEvent[];
  freshness: Freshness | null;
  layoutNumber: number; // 1~6 (raw-prices 전용)
  isOnboardingVisible: boolean;
  // IS-2: hasSeenOnboardingThisSession (feature_spec_fe-onboarding_vN §1.2, fe-layout-filter v5 §3.1)
  hasSeenOnboardingThisSession: boolean;
  setEvents: (events: ExternalEvent[]) => void;
  setFreshness: (freshness: Freshness) => void;
  setLayoutNumber: (n: number) => void;
  setOnboardingVisible: (visible: boolean) => void;
  // IS-2: setHasSeenOnboardingThisSession 액션
  setHasSeenOnboardingThisSession: (seen: boolean) => void;
}

// ============================================================
// PanelState — 패널 너비·섹션 토글·인라인 차트 토글·결과맵 토글
// web_plan_vN §6.6 (패널 너비 280~520px) + feature_dev_list_vN §feat/fe-panel 정의
// ============================================================
// @guide:STORE-06
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

// @guide:STORE-01
export const useAppStore = create<AppStore>((set) => ({
  // ---------- CommodityState ----------
  commodities: [],
  primaryCommodityId: null,
  secondaryCommodityId: null,
  setCommodities: (list) => set({ commodities: list }),
  // IS-1: setPrimaryCommodity (구: selectPrimaryCommodity)
  setPrimaryCommodity: (id) =>
    set((s) => ({
      primaryCommodityId: id,
      // 품목 전환 시 activeSegments를 새 품목의 segments 전체로 초기화
      // (fe-layout-filter v5 §3.1 C2 정책 — 실제 초기화는 setCommodities 이후 품목 정보 참조)
      activeSegments: id
        ? ((s.commodities.find((c) => c.commodity_id === id)?.segments ?? []) as SegmentId[])
        : [],
    })),
  // IS-1: setSecondaryCommodity (구: selectSecondaryCommodity)
  setSecondaryCommodity: (id) => set({ secondaryCommodityId: id }),

  // ---------- FilterState ----------
  filterFrom: null,
  filterTo: null,
  granularity: 'monthly',
  // IS-4: periodPreset 초기값 null (커스텀 범위)
  periodPreset: null,
  // reference 등급도 첫 화면 표시 — high가 0건일 때 "이상 거의 없음" 오인 방지.
  // 사용자가 noise 줄이고 싶으면 FilterBar에서 reference 끔.
  confidenceFilter: ['high', 'medium', 'reference'],
  patternFilter: [], // 빈 배열 = 전체
  eventFilter: [], // 전체 해제 (web_plan_vN §3.4 초기값)
  activeSegments: [], // 품목 선택 시 segments로 채움
  setFilterRange: (from, to) =>
    set({ filterFrom: from, filterTo: to, periodPreset: null }),
  // IS-5: setFilterFrom 개별 액션
  setFilterFrom: (from) => set({ filterFrom: from, periodPreset: null }),
  // IS-5: setFilterTo 개별 액션
  setFilterTo: (to) => set({ filterTo: to, periodPreset: null }),
  setGranularity: (g) => set({ granularity: g }),
  // IS-4: setPeriodPreset 액션
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
  // IS-3: scatterSegment 초기값 'A' (feature_spec_fe-scatter-chart_vN §1.3)
  scatterSegment: 'A',
  // fe-methodology-tab P1 #6: methodology 탭 진입 시 패널 자동 닫힘
  setActiveTab: (tab) =>
    set(tab === 'methodology'
      ? { activeTab: tab, isPanelOpen: false, selectedAnomalyId: null }
      : { activeTab: tab }),
  selectAnomaly: (id) => set({ selectedAnomalyId: id, isPanelOpen: id !== null }),
  closePanel: () =>
    set(() => ({
      selectedAnomalyId: null,
      isPanelOpen: false,
      // 패널 닫을 때 인라인·결과맵 펼침 상태 초기화
      expandedInlineCharts: new Set(),
      expandedMLMaps: new Set(),
    })),
  // IS-3: setScatterSegment 액션
  setScatterSegment: (segment) => set({ scatterSegment: segment }),

  // ---------- OverlayState ----------
  events: [],
  freshness: null,
  layoutNumber: 1, // 원시 시계열 기본 레이아웃
  isOnboardingVisible: false,
  // IS-2: hasSeenOnboardingThisSession 초기값 false (매 세션 시작 시 온보딩 표시)
  hasSeenOnboardingThisSession: false,
  setEvents: (events) => set({ events }),
  setFreshness: (freshness) => set({ freshness }),
  setLayoutNumber: (n) => set({ layoutNumber: n }),
  setOnboardingVisible: (visible) => set({ isOnboardingVisible: visible }),
  // IS-2: setHasSeenOnboardingThisSession 액션
  setHasSeenOnboardingThisSession: (seen) => set({ hasSeenOnboardingThisSession: seen }),

  // ---------- PanelState ----------
  panelWidth: 360, // FE-PANEL §3.3 ① 기본값
  // P3-2: 진입 시 stat 섹션만 펼침. 나머지 3개는 사용자 토글 시 fetch (요청 부담 감소).
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
