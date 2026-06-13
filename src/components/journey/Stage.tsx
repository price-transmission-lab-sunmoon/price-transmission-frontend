// 스테이션을 -Y 방향 월드 좌표에 배치하고 활성 여부를 내린다.
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
