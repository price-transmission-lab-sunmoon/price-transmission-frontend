// 3D transform에 부착되는 한글 라벨. 모형과 같이 움직여 스크린-스페이스 desync를 막는다.
import { Html } from '@react-three/drei';
import type { ReactNode } from 'react';

interface Label3DProps {
  position: [number, number, number];
  children: ReactNode;
  size?: number;
  color?: string;
  chip?: boolean; // 배경 칩 형태
}

export function Label3D({
  position,
  children,
  size = 12,
  color = 'var(--text-primary)',
  chip = false,
}: Label3DProps) {
  return (
    <Html
      position={position}
      center
      occlude={false}
      zIndexRange={[6, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          fontSize: size,
          fontWeight: 600,
          color,
          whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
          ...(chip
            ? {
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                padding: '3px 9px',
                boxShadow: '0 2px 8px rgba(28,24,18,0.08)',
              }
            : {}),
        }}
      >
        {children}
      </div>
    </Html>
  );
}
