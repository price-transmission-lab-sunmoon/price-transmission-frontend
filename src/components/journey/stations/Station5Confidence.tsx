// ⑤ 신뢰도 등급화 — H/M/R 빈(높이=해당 품목 실제 카운트) + 대표 이상의 판정 경로 체인.
import type { StationProps } from '../journeyContract';
import type { AnomalyDetail } from '@/types/anomaly';
import type { StreamResponse } from '@/types/timeseries';
import { ANOMALY_COLORS } from '@/utils/colorUtils';
import { confidenceLabel } from '@/services/anomaly';
import { Label3D } from '../primitives/Label3D';
import { useHoverBinders } from '../journeyHover';

interface Props extends StationProps {
  detail?: AnomalyDetail;
  stream?: StreamResponse; // 등급 분포·랭크는 stream.anomaly_nodes(품목 전기간) 기준
}

const GRADES = [
  { key: 'high', label: '고신뢰 H', color: ANOMALY_COLORS.high },
  { key: 'medium', label: '중신뢰 M', color: ANOMALY_COLORS.medium },
  { key: 'reference', label: '참고 R', color: ANOMALY_COLORS.reference },
];
// 통과/미통과를 가치색(초록/빨강) 대신 중립색 + 채움/흐림으로 — 판단이 아닌 '단계 사실'만.
const STEP_ON = '#0d9488';
const STEP_OFF = '#a8a298';
const GRADE_NOTE: Record<string, string> = {
  high: '두 분석 모두 탐지 — 최고 신뢰',
  medium: '계량 규칙 위반, ML 범위 이내',
  reference: 'ML만 탐지 (참고)',
};

export function Station5Confidence({ active, detail, stream }: Props) {
  const bind = useHoverBinders();
  const grade = detail?.confidence_grade;
  const nodes = stream?.anomaly_nodes ?? []; // 품목 전기간 이상(등급 분포의 실 소스)
  const counts: Record<string, number> = { high: 0, medium: 0, reference: 0 };
  for (const n of nodes) counts[n.confidence_grade] = (counts[n.confidence_grade] ?? 0) + 1;
  const maxC = Math.max(1, ...Object.values(counts));
  const steps = (detail?.judgment_path ?? []).slice(0, 6);
  // 선택 이상이 해당 등급 내 몇 번째인지(사실 정보).
  const selList = grade ? nodes.filter((n) => n.confidence_grade === grade) : [];
  const rank = detail ? selList.findIndex((n) => n.anomaly_id === detail.anomaly_id) + 1 : 0;

  return (
    <group>
      {GRADES.map((gr, i) => {
        const x = -6 + i * 3; // 우편향 보정(전 콘텐츠 −3 재중심)
        const c = counts[gr.key] ?? 0;
        const h = 0.6 + (c / maxC) * 2.6;
        const isSel = grade === gr.key;
        return (
          <group key={gr.key}>
            <mesh
              position={[x, h / 2 - 1.6, 0]}
              {...bind({
                title: gr.label,
                color: gr.color,
                rows: [{ label: '건수', value: `${c}건` }],
                note: GRADE_NOTE[gr.key],
                viz: { kind: 'gauge', value: c, max: maxC, label: '품목 내 비중', color: gr.color },
              })}
            >
              <boxGeometry args={[1.5, h, 1.0]} />
              <meshStandardMaterial
                color={gr.color}
                emissive={isSel ? gr.color : '#000000'}
                emissiveIntensity={isSel ? 0.4 : 0}
                opacity={isSel ? 1 : 0.5}
                transparent
              />
            </mesh>
            {active && (
              <Label3D position={[x, -2, 0]} chip size={12} color={gr.color}>
                {`${gr.label} · ${c}건`}
              </Label3D>
            )}
          </group>
        );
      })}

      {steps.map((st, i) => {
        const y = 2 - i * 0.8;
        const pos: [number, number, number] = [2.5, y, 0];
        const col = st.passed ? STEP_ON : STEP_OFF;
        return (
          <group key={st.step}>
            <mesh
              position={pos}
              {...bind({
                title: st.label,
                rows: [
                  { label: '값', value: String(st.value) },
                  { label: '단계', value: st.passed ? '통과' : '미통과' },
                ],
              })}
            >
              <sphereGeometry args={[0.22, 20, 20]} />
              <meshStandardMaterial
                color={col}
                emissive={col}
                emissiveIntensity={st.passed ? 0.4 : 0}
                transparent
                opacity={st.passed ? 1 : 0.5}
              />
            </mesh>
            {i < steps.length - 1 && (
              <mesh position={[2.5, y - 0.4, 0]}>
                <boxGeometry args={[0.04, 0.4, 0.04]} />
                <meshStandardMaterial color="#a8a298" />
              </mesh>
            )}
            {active && (
              <Label3D position={[4.6, y, 0]} size={10} chip>
                {st.label.length > 16 ? `${st.label.slice(0, 16)}…` : st.label}
              </Label3D>
            )}
          </group>
        );
      })}

      {active && grade && (
        <Label3D position={[-3, 2.7, 0]} chip>
          {`분류 등급: ${confidenceLabel(grade)}${rank > 0 ? ` · ${selList.length}건 중 ${rank}번째` : ''}`}
        </Label3D>
      )}
      {active && steps.length > 0 && (
        <Label3D position={[2.5, 2.8, 0]} size={11} chip>
          판정 경로
        </Label3D>
      )}
    </group>
  );
}
