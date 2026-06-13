// ② 가격 전달 경로. 구간 A~E 3D 체인으로 표시하며, 대표 이상 구간을 강조하고 stat_metrics 수치를 배지로 표시한다.
import { Line } from '@react-three/drei';
import type { StationProps } from '../journeyContract';
import type { Commodity } from '@/types/commodity';
import type { AnomalyDetail } from '@/types/anomaly';
import { SEGMENT_COLORS_PRIMARY } from '@/utils/colorUtils';
import { formatRatio } from '@/services/anomaly';
import { Label3D } from '../primitives/Label3D';
import { useHoverBinders } from '../journeyHover';

interface Props extends StationProps {
  commodity?: Commodity;
  detail?: AnomalyDetail;
}

const SEG_LABEL: Record<string, string> = { A: 'A', B: 'B', C: 'C', D: 'D', D_prime: 'E' };
const LEVEL_NOTE: Record<string, string> = {
  국제가: 'World Bank·FAO 국제 원자재가',
  수입단가: '관세청 수입단가(원화)',
  PPI: '한국은행 생산자물가지수',
  도매가: 'KAMIS 도매가격',
  CPI: '한국은행 소비자물가지수',
};
const SEG_NOTE: Record<string, string> = {
  A: '국제가 → 수입단가',
  B: '수입단가 → PPI',
  C: 'PPI → 도매가',
  D: '도매가 → CPI',
  D_prime: 'PPI → CPI (도매 미관측 품목)',
};

// 가격 단계별 노드 색.
const LEVEL_COLOR: Record<string, string> = {
  국제가: '#7c3aed',
  수입단가: '#ea580c',
  PPI: '#059669',
  도매가: '#0891b2',
  CPI: '#dc2626',
};

export function Station2Segments({ active, commodity, detail }: Props) {
  const bind = useHoverBinders();
  const segments = commodity?.segments ?? ['A', 'B', 'D_prime'];
  const has4 = segments.includes('C') && segments.includes('D');
  const levels = has4
    ? ['국제가', '수입단가', 'PPI', '도매가', 'CPI']
    : ['국제가', '수입단가', 'PPI', 'CPI'];
  const segOrder = has4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'D_prime'];
  const n = levels.length;
  const xStart = -((n - 1) * 2.5) / 2;
  const nodePos = (i: number): [number, number, number] => [xStart + i * 2.5, 0, 0];

  const sm = detail?.stat_metrics;
  const hotSeg = detail?.segment_id;
  const hotIdx = hotSeg ? segOrder.indexOf(hotSeg) : -1;
  const hotColor = hotSeg
    ? SEGMENT_COLORS_PRIMARY[hotSeg as keyof typeof SEGMENT_COLORS_PRIMARY] ?? '#0d9488'
    : '#0d9488';

  return (
    <group>
      {levels.map((lv, i) => (
        <group key={lv}>
          <mesh
            position={nodePos(i)}
            rotation={[Math.PI / 2, 0, 0]}
            scale={i === hotIdx || i === hotIdx + 1 ? 1.18 : 1}
            {...bind({ title: lv, note: LEVEL_NOTE[lv] ?? '가격 단계' })}
          >
            <cylinderGeometry args={[0.58, 0.58, 0.35, 36]} />
            <meshStandardMaterial
              color={LEVEL_COLOR[lv] ?? '#d4cec1'}
              emissive={i === hotIdx || i === hotIdx + 1 ? hotColor : '#000000'}
              emissiveIntensity={i === hotIdx || i === hotIdx + 1 ? 0.35 : 0}
              roughness={0.5}
            />
          </mesh>
          {active && (
            <Label3D position={[nodePos(i)[0], -1.1, 0]} size={12} chip>
              {lv}
            </Label3D>
          )}
        </group>
      ))}
      {segOrder.map((seg, i) => {
        const a = nodePos(i);
        const b = nodePos(i + 1);
        const mid: [number, number, number] = [(a[0] + b[0]) / 2, 0.7, 0];
        const color =
          SEGMENT_COLORS_PRIMARY[seg as keyof typeof SEGMENT_COLORS_PRIMARY] ?? '#0d9488';
        const isHot = hotSeg === seg;
        return (
          <group key={seg}>
            {isHot && (
              <mesh position={[mid[0], 0, 0]}>
                <boxGeometry args={[Math.abs(b[0] - a[0]), 0.9, 0.3]} />
                <meshBasicMaterial color={color} transparent opacity={0.12} />
              </mesh>
            )}
            <Line
              points={[a, b]}
              color={color}
              lineWidth={isHot ? 8 : 3}
              transparent
              opacity={isHot ? 1 : 0.28}
            />
            <mesh
              position={[mid[0], 0, 0]}
              {...bind({
                title: `구간 ${SEG_LABEL[seg] ?? seg}`,
                color,
                rows:
                  isHot && sm
                    ? [
                        { label: '모형', value: sm.model_type },
                        { label: '공적분', value: sm.cointegrated ? '예' : '아니오' },
                      ]
                    : undefined,
                note: SEG_NOTE[seg] ?? '가격 전달 구간',
                viz:
                  isHot && sm
                    ? {
                        kind: 'gauge',
                        value: sm.transmission_rate ?? 0,
                        max: 2,
                        threshold: 1,
                        label: '전이율(1=완전전달)',
                        color,
                      }
                    : undefined,
              })}
            >
              <boxGeometry args={[2.4, 0.5, 0.5]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            {active && (
              <Label3D position={mid} size={12} color={color}>
                {`구간 ${SEG_LABEL[seg] ?? seg}`}
              </Label3D>
            )}
            {active && isHot && sm && (
              <Label3D position={[mid[0], 1.7, 0]} size={11} chip color={color}>
                {`전이율 ${formatRatio(sm.transmission_rate)}${sm.model_type ? ` · ${sm.model_type}` : ''}${sm.cointegrated ? ' · 공적분' : ''}`}
              </Label3D>
            )}
          </group>
        );
      })}
      {active && hotSeg && (
        <Label3D position={[0, -2.1, 0]} chip size={11} color="#4a463e">
          {`대표 이상 구간: ${SEG_LABEL[hotSeg] ?? hotSeg}`}
        </Label3D>
      )}
    </group>
  );
}
