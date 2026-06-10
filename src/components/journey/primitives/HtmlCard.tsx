// 3D 평면에 기존 2D D3 차트를 카드로 임베드(2.5D). 고정 px 컨테이너로
// 임베드 차트의 ResizeObserver width=0 문제를 피한다.
import { Html } from '@react-three/drei';
import type { ReactNode } from 'react';

interface HtmlCardProps {
  children: ReactNode;
  width?: number;
  height?: number;
  position?: [number, number, number];
  distanceFactor?: number;
}

export function HtmlCard({
  children,
  width = 720,
  height = 480,
  position = [0, 0, 0],
  distanceFactor = 10,
}: HtmlCardProps) {
  return (
    <Html transform position={position} distanceFactor={distanceFactor} zIndexRange={[10, 0]}>
      <div
        style={{
          width,
          height,
          overflow: 'hidden',
          borderRadius: 12,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 10px 40px rgba(28,24,18,0.14)',
        }}
      >
        {children}
      </div>
    </Html>
  );
}
