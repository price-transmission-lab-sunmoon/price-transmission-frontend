import { create } from 'zustand';
import type { Commodity } from '@/types/commodity';
import type { ExternalEvent } from '@/types/event';
import type { Freshness } from '@/types/meta';
import type { ConfidenceGrade } from '@/types/literals';

// commodityStore
interface CommodityState {
  commodities: Commodity[];
  selectedCommodityId: string | null;
  setCommodities: (list: Commodity[]) => void;
  selectCommodity: (id: string) => void;
}

// filterStore
interface FilterState {
  selectedGrades: ConfidenceGrade[];
  selectedEventKey: string | null;
  fromMonth: string | null;
  toMonth: string | null;
  setGrades: (grades: ConfidenceGrade[]) => void;
  setEventKey: (key: string | null) => void;
  setDateRange: (from: string | null, to: string | null) => void;
}

// panelStore
interface PanelState {
  selectedAnomalyId: number | null;
  isPanelOpen: boolean;
  selectAnomaly: (id: number | null) => void;
  closePanel: () => void;
}

// viewStore
interface ViewState {
  activeTab: 'stream' | 'raw' | 'scatter';
  setActiveTab: (tab: 'stream' | 'raw' | 'scatter') => void;
}

// overlayStore
interface OverlayState {
  events: ExternalEvent[];
  freshness: Freshness | null;
  isOnboardingVisible: boolean;
  setEvents: (events: ExternalEvent[]) => void;
  setFreshness: (freshness: Freshness) => void;
  setOnboardingVisible: (visible: boolean) => void;
}

type AppStore = CommodityState & FilterState & PanelState & ViewState & OverlayState;

export const useAppStore = create<AppStore>((set) => ({
  // commodityStore
  commodities: [],
  selectedCommodityId: null,
  setCommodities: (list) => set({ commodities: list }),
  selectCommodity: (id) => set({ selectedCommodityId: id }),

  // filterStore
  selectedGrades: ['high', 'medium'],
  selectedEventKey: null,
  fromMonth: null,
  toMonth: null,
  setGrades: (grades) => set({ selectedGrades: grades }),
  setEventKey: (key) => set({ selectedEventKey: key }),
  setDateRange: (from, to) => set({ fromMonth: from, toMonth: to }),

  // panelStore
  selectedAnomalyId: null,
  isPanelOpen: false,
  selectAnomaly: (id) => set({ selectedAnomalyId: id, isPanelOpen: id !== null }),
  closePanel: () => set({ selectedAnomalyId: null, isPanelOpen: false }),

  // viewStore
  activeTab: 'stream',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // overlayStore
  events: [],
  freshness: null,
  isOnboardingVisible: false,
  setEvents: (events) => set({ events }),
  setFreshness: (freshness) => set({ freshness }),
  setOnboardingVisible: (visible) => set({ isOnboardingVisible: visible }),
}));
