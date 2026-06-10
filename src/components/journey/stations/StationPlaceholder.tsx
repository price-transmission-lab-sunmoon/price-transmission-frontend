// 슬라이스용 임시 스테이션 — 박스 + 번호(ASCII). Day2에 스테이션별 실제 3D로 교체.
// 한글 라벨은 좌측 해설 패널이 담당(troika 3D 텍스트는 한글 미지원).
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import type { Mesh } from 'three';
import type { StationProps } from '../journeyContract';

interface Props extends StationProps {
  label: string;
  accent: string;
}

export function StationPlaceholder({ active, label, accent }: Props) {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.15;
  });
  return (
    <group>
      <mesh ref={ref}>
        <boxGeometry args={[5, 3, 0.5]} />
        <meshStandardMaterial
          color={active ? accent : '#d4cec1'}
          metalness={0.1}
          roughness={0.6}
        />
      </mesh>
      <Text position={[0, 0, 0.4]} fontSize={1.2} color="#ffffff" anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}
