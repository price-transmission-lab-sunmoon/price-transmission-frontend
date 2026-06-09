// ⑥ 결과 · 외부충격 검증 — 시간축에 탐지 이상(등급색·반경=전이율) × 5 외부충격(음영).
// 데이터 기반 시간 도메인(우측 쏠림 방지) + 동일좌표 마커 분산 + 이벤트 라벨 y 스태거.
import { Line } from '@react-three/drei';
import type { StationProps } from '../journeyContract';
import type { StreamResponse, StreamAnomalyNode } from '@/types/timeseries';
import type { ExternalEvent } from '@/types/event';
import { ANOMALY_COLORS } from '@/utils/colorUtils';
import { Label3D } from '../primitives/Label3D';

interface Props extends StationProps {
  stream?: StreamResponse;
  events: ExternalEvent[];
}

const W = 15;
const GRADE_Y: Record<string, number> = { high: 1.7, medium: 1.0, reference: 0.35 };
// 등급 위계(논문 3-5: H=두 분석 모두·최고신뢰 / M=계량만 / R=ML만)를 발광으로도 차등.
const GRADE_EMIS: Record<string, number> = { high: 0.5, medium: 0.25, reference: 0.05 };

function ym(period: string): number {
  const [y, m] = period.split('-').map(Number);
  return y + ((m || 1) - 1) / 12;
}
function markerRadius(rate: number | null): number {
  if (rate === null || !Number.isFinite(rate)) return 0.12;
  const c = Math.max(0, Math.min(2, rate));
  return 0.08 + (c / 2) * 0.3; // 범위 확대 — 전이율 크기 차이가 눈에 보이게
}

export function Station6Results({ active, stream, events }: Props) {
  const nodes = stream?.anomaly_nodes ?? [];

  // 데이터 기반 시간 도메인 — 고정 2000~2026 대신 실제 범위에 맞춰 균형 배치.
  const times = [
    ...nodes.map((n) => ym(n.period)),
    ...events.flatMap((e) => [ym(e.start_date), ym(e.end_date)]),
  ].filter((t) => Number.isFinite(t));
  const T0 = times.length ? Math.min(...times) - 0.5 : 2000;
  const T1 = times.length ? Math.max(...times) + 0.5 : 2026;
  const span = Math.max(0.5, T1 - T0);
  const tx = (period: string) => ((ym(period) - T0) / span) * W - W / 2;

  // 동일 (period, grade) 마커 그룹 → x 오프셋 분산(완전 중첩 방지).
  const groups = new Map<string, StreamAnomalyNode[]>();
  nodes.forEach((n) => {
    const k = `${n.period}|${n.confidence_grade}`;
    const arr = groups.get(k) ?? [];
    arr.push(n);
    groups.set(k, arr);
  });

  return (
    <group>
      <Line
        points={[
          [-W / 2, 0, 0],
          [W / 2, 0, 0],
        ]}
        color="#78736a"
        lineWidth={1.5}
      />

      {events.map((ev, i) => {
        const x0 = tx(ev.start_date);
        const x1 = tx(ev.end_date);
        const w = Math.max(0.15, x1 - x0);
        const cx = (x0 + x1) / 2;
        const hits = nodes.filter(
          (n) => ym(n.period) >= ym(ev.start_date) && ym(n.period) <= ym(ev.end_date),
        ).length;
        const labelY = 2.2 + (i % 2) * 0.55; // y 스태거로 가로 겹침 완화(상단 클리핑 여유)
        return (
          <group key={ev.event_key}>
            <mesh position={[cx, 1.2, -0.2]}>
              <boxGeometry args={[w, 3.2, 0.1]} />
              <meshStandardMaterial color={ev.color_hex} transparent opacity={0.16} />
            </mesh>
            {active && (
              <Label3D position={[cx, labelY, 0]} size={10} color={ev.color_hex}>
                {`${ev.label_kr.length > 11 ? `${ev.label_kr.slice(0, 11)}…` : ev.label_kr}${hits > 0 ? ` · ${hits}건` : ''}`}
              </Label3D>
            )}
          </group>
        );
      })}

      {[...groups.values()].flatMap((grp) =>
        grp.map((nd, j) => {
          const off = (j - (grp.length - 1) / 2) * 0.32;
          const y = GRADE_Y[nd.confidence_grade] ?? 0.35;
          const c = ANOMALY_COLORS[nd.confidence_grade];
          return (
            <mesh key={`${nd.anomaly_id}-${j}`} position={[tx(nd.period) + off, y, 0.1]}>
              <sphereGeometry args={[markerRadius(nd.transmission_rate ?? null), 16, 16]} />
              <meshStandardMaterial color={c} emissive={c} emissiveIntensity={GRADE_EMIS[nd.confidence_grade] ?? 0.2} />
            </mesh>
          );
        }),
      )}

      {active && (
        <Label3D position={[0, -1.1, 0]} chip>
          {`탐지된 이상 × 외부충격 구간 · 총 ${nodes.length}건`}
        </Label3D>
      )}
      {active && times.length > 0 && (
        <Label3D position={[-W / 2, -0.6, 0]} size={10} color="#78736a">
          {Math.floor(T0 + 0.5)}
        </Label3D>
      )}
      {active && times.length > 0 && (
        <Label3D position={[W / 2, -0.6, 0]} size={10} color="#78736a">
          {Math.ceil(T1 - 0.5)}
        </Label3D>
      )}
    </group>
  );
}
