// ② 가격 전달 경로 — 선택 품목의 구간(A~E) 3D 체인. 대표 이상이 속한 구간을 강조하고
// 그 구간의 실제 수치(전이율·모형·공적분)를 배지로(대표 detail.stat_metrics 기반).
import { Line } from '@react-three/drei';
import type { StationProps } from '../journeyContract';
import type { Commodity } from '@/types/commodity';
import type { AnomalyDetail } from '@/types/anomaly';
import { SEGMENT_COLORS_PRIMARY } from '@/utils/colorUtils';
import { formatRatio } from '@/services/anomaly';
import { Label3D } from '../primitives/Label3D';

interface Props extends StationProps {
  commodity?: Commodity;
  detail?: AnomalyDetail;
}

const SEG_LABEL: Record<string, string> = { A: 'A', B: 'B', C: 'C', D: 'D', D_prime: 'E' };

export function Station2Segments({ active, commodity, detail }: Props) {
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

  return (
    <group>
      {levels.map((lv, i) => (
        <group key={lv}>
          <mesh position={nodePos(i)} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.58, 0.58, 0.35, 36]} />
            <meshStandardMaterial color="#d4cec1" roughness={0.5} />
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
            <Line points={[a, b]} color={color} lineWidth={isHot ? 6 : 3} transparent opacity={isHot ? 1 : 0.7} />
            {active && (
              <Label3D position={mid} size={12} color={color}>
                {`구간 ${SEG_LABEL[seg] ?? seg}`}
              </Label3D>
            )}
            {active && isHot && sm && (
              <Label3D position={[mid[0], 1.7, 0]} size={11} chip color={color}>
                {`전이율 ${formatRatio(sm.transmission_rate)} · ${sm.model_type}${sm.cointegrated ? ' · 공적분' : ''}`}
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
