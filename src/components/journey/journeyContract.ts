// 분석 여정 공유 계약 — 모든 스테이션·리그·해설의 공통 상수·타입·스토어.
import { create } from 'zustand';

export const JOURNEY_STAGE_COUNT = 6;

// 카메라가 스테이션마다 -Y로 내려가는 월드 간격.
export const STAGE_GAP = 14;

// 스테이션별 콘텐츠 가로 반폭(half-width, 월드 단위) — 카메라 동적 줌 기준.
// 인덱스 0~5 = ①원천 ②구간 ③파이프라인 ④이중탐지 ⑤신뢰도 ⑥결과.
export const STAGE_HALF_WIDTH = [7.5, 5.5, 9.5, 7, 8.5, 8.5];
export const STAGE_HALF_HEIGHT = 3.4;
// 좌측 안내 패널을 제외한 가용 가로 비율.
export const CONTENT_USABLE_W = 0.7;
export const CAMERA_PADDING = 1.25;

// 각 스테이션이 받는 공통 입력. 스테이션은 이것만 알면 되며 서로 import하지 않는다.
export interface StationProps {
  active: boolean;
  commodityId: string;
  anomalyId: number | null;
}

// 여정 전용 등급 배색 — 빨강·머스터드·청록으로 hue 분리.
export const JOURNEY_GRADE_COLORS: Record<string, string> = {
  high: '#dc2626', // 빨강
  medium: '#ca8a04', // 머스터드(노랑끼) — 빨강과 분리
  reference: '#0891b2', // 청록
};

// 무대 테마.
export const JOURNEY_THEME = {
  bg: '#faf8f4',
  ambient: 0.95,
  dir: 0.5,
};

// 버튼·방향키로 스테이션 간 이산 이동. 정지점에서 라벨과 모델이 정렬된다.
interface JourneyNavState {
  stage: number; // 현재 스테이션 0~N-1
  cameraZoom: number; // 휠 줌 배율. stage 이동 시 1로 리셋.
  setStage: (i: number) => void;
  next: () => void;
  prev: () => void;
  setCameraZoom: (z: number) => void;
}

export const useJourneyProgress = create<JourneyNavState>((set) => ({
  stage: 0,
  cameraZoom: 1,
  setStage: (i) => set({ stage: Math.min(JOURNEY_STAGE_COUNT - 1, Math.max(0, i)), cameraZoom: 1 }),
  next: () =>
    set((s) => ({ stage: Math.min(JOURNEY_STAGE_COUNT - 1, s.stage + 1), cameraZoom: 1 })),
  prev: () => set((s) => ({ stage: Math.max(0, s.stage - 1), cameraZoom: 1 })),
  setCameraZoom: (z) => set({ cameraZoom: z }),
}));

// 노드 선택기 — 사용자가 고른 기준 이상. null=자동. 상세 기반 스테이션(②④⑤)이 따른다.
export interface JourneyNormal {
  period: string;
  segment: string;
  upstream_pct: number;
  downstream_pct: number;
}
interface JourneySelectionState {
  selectedAnomalyId: number | null;
  selectedNormal: JourneyNormal | null; // 정상(비이상) 점 선택 — 이상과 배타
  setSelected: (id: number | null) => void;
  setSelectedNormal: (n: JourneyNormal | null) => void;
  pickerSegment: string | null; // 산점도 미니맵의 표시 구간(null=품목 첫 구간)
  setPickerSegment: (s: string | null) => void;
}
export const useJourneySelection = create<JourneySelectionState>((set) => ({
  selectedAnomalyId: null,
  selectedNormal: null,
  setSelected: (id) => set({ selectedAnomalyId: id, selectedNormal: null }),
  setSelectedNormal: (n) => set({ selectedNormal: n, selectedAnomalyId: null }),
  pickerSegment: null,
  setPickerSegment: (s) => set({ pickerSegment: s }),
}));
