// 여정 호버 인터랙션 — 3D 메시(Canvas 안)와 HTML 카드(Canvas 밖)가 공유하는 상태.
// zustand는 Canvas 안에서도 동작. 커서 위치(viewport clientX/Y)를 같이 들고 카드가 따라붙는다.
import { useCallback } from 'react';
import { create } from 'zustand';
import type { ThreeEvent } from '@react-three/fiber';

export interface HoverRow {
  label: string;
  value: string;
}
export type HoverViz =
  | { kind: 'gauge'; value: number; max: number; threshold?: number; label?: string; color?: string }
  | { kind: 'bars'; items: { label: string; value: number; max: number; on?: boolean; color?: string }[] }
  | { kind: 'spark'; points: number[]; color?: string };

export interface HoverInfo {
  title: string;
  color?: string; // 제목 강조 점 색
  rows?: HoverRow[]; // 수치(라벨·값)
  note?: string; // 정본 설명(여러 줄 가능)
  viz?: HoverViz; // 미니 시각화(게이지/막대/스파크라인)
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

// 메시에 펴 넣을 포인터 핸들러 팩토리. 스테이션 최상단에서 한 번 호출(훅 규칙) → 객체마다 bind(info).
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
