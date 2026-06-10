// 스테이션 1개를 3D 공간의 제 위치(-Y로 하강)에 배치하고, 현재 활성 여부만 내린다.
// 부드러운 연출은 각 스테이션이 useJourneyProgress.offset을 구독해 useFrame에서 처리.
import type { ReactNode } from 'react';
import { STAGE_GAP, useJourneyProgress } from './journeyContract';

interface StageProps {
  index: number;
  children: (state: { active: boolean }) => ReactNode;
}

export function Stage({ index, children }: StageProps) {
  const stage = useJourneyProgress((s) => s.stage);
  const active = stage === index;
  return <group position={[0, -index * STAGE_GAP, 0]}>{children({ active })}</group>;
}
