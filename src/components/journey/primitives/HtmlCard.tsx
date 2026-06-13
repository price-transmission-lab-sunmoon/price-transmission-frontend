// 3D 공간에 HTML 카드를 임베드(2.5D). 고정 px 크기로 ResizeObserver width=0 문제를 피한다.
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
