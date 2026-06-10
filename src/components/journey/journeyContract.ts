// 분석 여정(/journey) 공유 계약 — 모든 스테이션·리그·해설의 SoT.
// 품목은 하드코딩하지 않고 전역 store(primaryCommodityId, 상단 드롭다운)를 따른다.
import { create } from 'zustand';

// 6 스테이션 = 6 스크롤 페이지.
export const JOURNEY_STAGE_COUNT = 6;

// 카메라가 한 스테이션마다 -Y로 내려가는 월드 간격(원천→결과로 흘러내림).
export const STAGE_GAP = 14;

// 스테이션별 콘텐츠 가로 반폭(half-width, 월드 단위) — 카메라 동적 줌의 기준.
// 인덱스 0~5 = ①원천 ②구간 ③파이프라인 ④이중탐지 ⑤신뢰도 ⑥결과.
export const STAGE_HALF_WIDTH = [7.5, 5.5, 9.5, 7, 8.5, 8.5];
export const STAGE_HALF_HEIGHT = 3.4;
// 콘텐츠가 들어갈 가용 가로 비율(좌측 안내 패널 ~38% 제외 → 우측 0.62).
export const CONTENT_USABLE_W = 0.62;
// 카메라 거리 패딩 배수.
export const CAMERA_PADDING = 1.25;

// 각 스테이션이 받는 공통 입력. 스테이션은 이것만 알면 되며 서로 import하지 않는다.
// 부드러운 진행률 연출은 useJourneyProgress.offset을 직접 구독(매 프레임 prop 전달 시
// React 리렌더 폭증 방지). 여기서는 코어스 active만 내린다.
export interface StationProps {
  active: boolean;
  commodityId: string;
  anomalyId: number | null;
}

// 무대 테마 — 라이트 단일(차분 화이트). bloom 없음.
export const JOURNEY_THEME = {
  bg: '#faf8f4',
  ambient: 0.95,
  dir: 0.5,
};

// 스크롤 제거 — 위/아래 버튼·방향키로 스테이션 간 이산 이동(고정 좌표).
// 휠 단계마다 라벨이 움직여 모델과 싱크가 어긋나던 문제 해소(정지점에서 정렬).
interface JourneyNavState {
  stage: number; // 현재 스테이션 0~N-1
  cameraZoom: number; // 휠 줌 배율(<1=확대). stage 이동 시 1로 리셋.
  setStage: (i: number) => void;
  next: () => void;
  prev: () => void;
  setCameraZoom: (z: number) => void;
}

export const useJourneyProgress = create<JourneyNavState>((set) => ({
  stage: 0,
  cameraZoom: 1,
  setStage: (i) => set({ stage: Math.min(JOURNEY_STAGE_COUNT - 1, Math.max(0, i)), cameraZoom: 1 }),
  next: () => set((s) => ({ stage: Math.min(JOURNEY_STAGE_COUNT - 1, s.stage + 1), cameraZoom: 1 })),
  prev: () => set((s) => ({ stage: Math.max(0, s.stage - 1), cameraZoom: 1 })),
  setCameraZoom: (z) => set({ cameraZoom: z }),
}));

// 좌측 패널 하단 노드 선택기 — 사용자가 고른 기준 이상(anomaly). null=자동.
// 상세 기반 스테이션(②④⑤)이 이 노드의 /detail을 따른다.
interface JourneySelectionState {
  selectedAnomalyId: number | null;
  setSelected: (id: number | null) => void;
  pickerSegment: string | null; // 산점도 미니맵의 표시 구간(null=품목 첫 구간)
  setPickerSegment: (s: string | null) => void;
}
export const useJourneySelection = create<JourneySelectionState>((set) => ({
  selectedAnomalyId: null,
  setSelected: (id) => set({ selectedAnomalyId: id }),
  pickerSegment: null,
  setPickerSegment: (s) => set({ pickerSegment: s }),
}));
