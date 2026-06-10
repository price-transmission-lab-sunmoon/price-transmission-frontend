// 두 점을 잇는 연결선 + 방향으로 흐르는 입자(데이터가 한 방향으로 흐른다는 시각 은유).
// 입자에는 라벨이 붙지 않으므로 애니메이션해도 Label3D desync 문제 없음.
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Vector3, type Group } from 'three';

interface FlowLineProps {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  particles?: number;
  speed?: number;
  lineWidth?: number;
  opacity?: number;
}

export function FlowLine({
  from,
  to,
  color,
  particles = 3,
  speed = 0.22,
  lineWidth = 1.5,
  opacity = 0.4,
}: FlowLineProps) {
  const ref = useRef<Group>(null);
  const a = useMemo(() => new Vector3(...from), [from]);
  const b = useMemo(() => new Vector3(...to), [to]);

  useFrame((s) => {
    const g = ref.current;
    if (!g) return;
    const t = s.clock.elapsedTime * speed;
    g.children.forEach((c, i) => {
      const frac = (t + i / particles) % 1;
      c.position.lerpVectors(a, b, frac);
    });
  });

  return (
    <group>
      <Line points={[from, to]} color={color} lineWidth={lineWidth} transparent opacity={opacity} />
      <group ref={ref}>
        {Array.from({ length: particles }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
