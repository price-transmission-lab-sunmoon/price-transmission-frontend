// 여정 호버 상태 — Canvas 안 메시와 Canvas 밖 카드가 공유. 커서 위치(clientX/Y)를 함께 보관한다.
import { useCallback } from 'react';
import { create } from 'zustand';
import type { ThreeEvent } from '@react-three/fiber';

export interface HoverRow {
  label: string;
  value: string;
}
export type HoverViz =
  | {
      kind: 'gauge';
      value: number;
      max: number;
      min?: number;
      threshold?: number;
      label?: string;
      color?: string;
    }
  | {
      kind: 'bars';
      items: {
        label: string;
        value: number;
        max: number;
        min?: number;
        on?: boolean;
        color?: string;
      }[];
    }
  | { kind: 'spark'; points: number[]; color?: string }
  | { kind: 'diagram'; phase: string }; // Phase 개념 도식(PhaseDiagram)

export interface HoverInfo {
  title: string;
  color?: string; // 제목 강조 점 색
  rows?: HoverRow[]; // 수치(라벨·값)
  note?: string; // 정본 설명 — '라벨: 내용' 줄은 라벨 캡션으로 구조화 렌더
  viz?: HoverViz; // 미니 시각화(게이지/막대/스파크라인)
  diagram?: string; // 어려운 용어 개념 도식(PhaseDiagram id) — note 아래 별도 출력
}

interface HoverState {
  info: HoverInfo | null;
  x: number;
  y: number;
  show: (info: HoverInfo, x: number, y: number) => void;
  move: (x: number, y: number) => void;
  hide: () => void;
}

export const useJourneyHover = create<HoverState>((set) => ({
  info: null,
  x: 0,
  y: 0,
  show: (info, x, y) => set({ info, x, y }),
  move: (x, y) => set({ x, y }),
  hide: () => set({ info: null }),
}));

// 포인터 핸들러 팩토리. 훅 규칙 상 스테이션 최상단에서 한 번 호출하고 객체마다 bind(info)로 쓴다.
export function useHoverBinders() {
  const show = useJourneyHover((s) => s.show);
  const move = useJourneyHover((s) => s.move);
  const hide = useJourneyHover((s) => s.hide);
  return useCallback(
    (info: HoverInfo) => ({
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        show(info, e.nativeEvent.clientX, e.nativeEvent.clientY);
        document.body.style.cursor = 'pointer';
      },
      onPointerMove: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        move(e.nativeEvent.clientX, e.nativeEvent.clientY);
      },
      onPointerOut: () => {
        hide();
        document.body.style.cursor = 'auto';
      },
    }),
    [show, move, hide],
  );
}
