// ⑥ 결과 및 외부충격 검증. 시간축에 탐지 이상(등급색)과 외부충격 음영을 겹쳐 표시한다.
import { Line } from '@react-three/drei';
import type { StationProps } from '../journeyContract';
import type { StreamResponse, StreamAnomalyNode } from '@/types/timeseries';
import type { ExternalEvent } from '@/types/event';
import { Label3D } from '../primitives/Label3D';
import { useHoverBinders } from '../journeyHover';
import { useJourneySelection, JOURNEY_GRADE_COLORS } from '../journeyContract';

interface Props extends StationProps {
  stream?: StreamResponse;
  events: ExternalEvent[];
}

const W = 15;
const GRADE_Y: Record<string, number> = { high: 1.7, medium: 1.0, reference: 0.35 };
// 등급별 발광 강도. H>M>R 위계를 시각적으로 차등한다.
const GRADE_EMIS: Record<string, number> = { high: 0.25, medium: 0.12, reference: 0.03 };
const GRADE_KR: Record<string, string> = { high: '고신뢰', medium: '중신뢰', reference: '참고' };
const PATTERN_KR: Record<string, string> = {
  pattern1: '방향역전·시차',
  pattern2: '전이율·비대칭',
  pattern3: '스프레드',
};

function ym(period: string): number {
  const [y, m] = period.split('-').map(Number);
  return y + ((m || 1) - 1) / 12;
}
// 마커 반경 균일. 특정 시점을 크기로 강조하지 않고 전이율은 호버 게이지로만 표시한다.
const MARKER_R = 0.13;

export function Station6Results({ active, stream, events }: Props) {
  const bind = useHoverBinders();
  const selectedId = useJourneySelection((s) => s.selectedAnomalyId);
  const setSelected = useJourneySelection((s) => s.setSelected);
  const setPickerSegment = useJourneySelection((s) => s.setPickerSegment);
  const nodes = stream?.anomaly_nodes ?? [];

  // 실제 데이터 범위로 시간 도메인을 계산해 균형 배치한다.
  const times = [
    ...nodes.map((n) => ym(n.period)),
    ...events.flatMap((e) => [ym(e.start_date), ym(e.end_date)]),
  ].filter((t) => Number.isFinite(t));
  const T0 = times.length ? Math.min(...times) - 0.5 : 2000;
  const T1 = times.length ? Math.max(...times) + 0.5 : 2026;
  const span = Math.max(0.5, T1 - T0);
  const tx = (period: string) => ((ym(period) - T0) / span) * W - W / 2;

  // 동일 (period, grade) 마커 그룹을 x 오프셋으로 분산해 중첩을 줄인다.
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
        const labelY = 2.2 + (i % 2) * 0.55; // y 스태거로 가로 겹침 완화
        return (
          <group key={ev.event_key}>
            <mesh
              position={[cx, 1.2, -0.2]}
              {...bind({
                title: ev.label_kr,
                color: ev.color_hex,
                rows: [
                  { label: '기간', value: `${ev.start_date}~${ev.end_date}` },
                  { label: '구간 내 탐지', value: `${hits}건` },
                ],
                note: '성격: Weak Ground Truth 외부충격 검증 구간\n비고: 인과 해석 아님',
              })}
            >
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
          const c = JOURNEY_GRADE_COLORS[nd.confidence_grade];
          const rr = MARKER_R;
          const isSel = nd.anomaly_id === selectedId;
          return (
            <group key={`${nd.anomaly_id}-${j}`} position={[tx(nd.period) + off, y, 0.1]}>
              {isSel && (
                <mesh>
                  <torusGeometry args={[rr * 2.0, 0.05, 8, 28]} />
                  <meshBasicMaterial color="#1a1814" />
                </mesh>
              )}
              <mesh
                scale={isSel ? 1.5 : 1}
                onClick={() => {
                  setSelected(nd.anomaly_id);
                  setPickerSegment(nd.segment_id); // 미니맵 구간 동기화
                }}
                {...bind({
                  title: `이상 · ${nd.period}`,
                  color: c,
                  rows: [
                    { label: '등급', value: GRADE_KR[nd.confidence_grade] ?? nd.confidence_grade },
                    { label: '패턴', value: PATTERN_KR[nd.primary_pattern] ?? nd.primary_pattern },
                  ],
                  note: '동작: 클릭 시 기준 이상으로 선택(②④⑤ 연동)',
                  viz: {
                    kind: 'gauge',
                    value: nd.transmission_rate ?? 0,
                    max: 2,
                    threshold: 1,
                    label: '전이율(1=완전전달)',
                    color: c,
                  },
                })}
              >
                <sphereGeometry args={[rr, 16, 16]} />
                <meshStandardMaterial
                  color={c}
                  emissive={c}
                  emissiveIntensity={isSel ? 0.7 : GRADE_EMIS[nd.confidence_grade] ?? 0.1}
                />
              </mesh>
            </group>
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
