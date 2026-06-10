// ⑤ 신뢰도 등급화 — H/M/R 분포 빈 + 5단계 판정 경로(통계 탐지→패턴→ML→일치→최종).
import type { StationProps } from '../journeyContract';
import type { AnomalyDetail } from '@/types/anomaly';
import type { StreamResponse } from '@/types/timeseries';
import { JOURNEY_GRADE_COLORS } from '../journeyContract';
import { confidenceLabel } from '@/services/anomaly';
import { Label3D } from '../primitives/Label3D';
import { FlowLine } from '../primitives/FlowLine';
import { useHoverBinders, type HoverInfo } from '../journeyHover';

interface Props extends StationProps {
  detail?: AnomalyDetail;
  stream?: StreamResponse; // 등급 분포는 stream.anomaly_nodes(품목 전기간) 기준
  normalMode?: boolean; // 정상 점 선택(이상 아님)
}

const GRADES = [
  { key: 'high', label: '고신뢰 H', color: JOURNEY_GRADE_COLORS.high },
  { key: 'medium', label: '중신뢰 M', color: JOURNEY_GRADE_COLORS.medium },
  { key: 'reference', label: '참고 R', color: JOURNEY_GRADE_COLORS.reference },
];
const STEP_ON = '#0d9488';
const STEP_OFF = '#a8a298';
const GRADE_NOTE: Record<string, string> = {
  high: '판정: 계량과 ML 모두 이상\n의미: 독립 두 방법의 합의, 신뢰 가장 높음',
  medium: '판정: 계량 규칙만 위반\n의미: ML 이상점수는 정상 범위',
  reference: '판정: ML 앙상블만 이상\n의미: 계량 규칙 위반 없음, 참고용',
};
const PATTERN_KR: Record<string, string> = {
  pattern1: '방향 역전·시차 이탈',
  pattern2: '전이율 이탈·비대칭',
  pattern3: '스프레드 누적',
};
const PATTERN_NOTE: Record<string, string> = {
  pattern1: '정의: 상류와 하류가 반대로 움직이거나 시차 이탈\n판정: IRF 피크+버퍼 이후에도 하류 무반응',
  pattern2: '정의: 월별 전이율의 분포 이탈\n판정: Z-score(경보 2.5)와 IQR 상한 동시 초과\n비고: 상·하방 비대칭은 TECM',
  pattern3: '정의: 안정기 마진 괴리의 누적\n판정: 국제가 ±3% 안정기에 수입단가와 PPI 괴리가 연속(2·3·6개월) 확대',
};

export function Station5Confidence({ active, detail, stream, normalMode }: Props) {
  const bind = useHoverBinders();
  const grade = detail?.confidence_grade;
  const sm = detail?.stat_metrics;
  const ml = detail?.ml_summary;
  const pat = detail?.primary_pattern;
  const nodes = stream?.anomaly_nodes ?? [];
  const counts: Record<string, number> = { high: 0, medium: 0, reference: 0 };
  for (const n of nodes) counts[n.confidence_grade] = (counts[n.confidence_grade] ?? 0) + 1;
  const maxC = Math.max(1, ...Object.values(counts));
  const total = nodes.length;
  const selList = grade ? nodes.filter((n) => n.confidence_grade === grade) : [];
  const rank = detail ? selList.findIndex((n) => n.anomaly_id === detail.anomaly_id) + 1 : 0;

  // 계량 탐지 사유(이 이상의 근거)
  const econReasons = [
    sm?.direction_reversal && '방향역전',
    sm?.lag_deviation && '시차이탈',
    (sm?.zscore_alert || sm?.iqr_outlier) && '전이율 이탈(Z·IQR)',
    sm?.spread_n3 != null && sm.spread_n3 > 0 && '스프레드 확대',
  ].filter(Boolean) as string[];
  const econDet = econReasons.length > 0;
  const mlDet = !!ml?.ml_detected;

  // 고정 5단계 판정 경로
  const FIVE: { key: string; label: string; on: boolean; info: HoverInfo }[] = [
    {
      key: 'stat',
      label: '통계 탐지',
      on: econDet,
      info: {
        title: '① 통계 탐지 근거',
        color: STEP_ON,
        rows: [
          { label: '탐지 사유', value: econDet ? econReasons.join(' · ') : '없음' },
          { label: 'IQR', value: sm?.iqr_outlier ? '상한 초과' : '범위 내' },
        ],
        viz:
          sm?.zscore != null
            ? {
                kind: 'gauge',
                value: Math.abs(sm.zscore),
                max: Math.max(3, Math.abs(sm.zscore) * 1.2),
                threshold: sm.zscore_threshold_alert ?? 2.5,
                label: 'Z-score',
                color: STEP_ON,
              }
            : undefined,
        note: '판정: 계량 규칙(Z-score, IQR, 방향, 시차, 스프레드)\n근거: 위 탐지 사유가 이 이상의 원인',
        diagram: 'term_zscore',
      },
    },
    {
      key: 'pattern',
      label: '패턴 분류',
      on: !!pat,
      info: {
        title: '② 패턴 분류',
        rows: pat ? [{ label: '유형', value: PATTERN_KR[pat] ?? pat }] : undefined,
        viz: pat ? { kind: 'diagram', phase: `pat_${pat}` } : undefined,
        note: pat ? PATTERN_NOTE[pat] : '이상 유형 분류.',
      },
    },
    {
      key: 'ml',
      label: 'ML 합의',
      on: mlDet,
      info: {
        title: '③ ML 합의',
        color: STEP_ON,
        rows: [
          { label: 'IF', value: ml?.if_percentile != null ? `${ml.if_percentile.toFixed(1)}%` : '—' },
          { label: 'LOF', value: ml?.lof_percentile != null ? `${ml.lof_percentile.toFixed(1)}%` : '—' },
          { label: 'SVM', value: ml?.svm_percentile != null ? `${ml.svm_percentile.toFixed(1)}%` : '—' },
          { label: '합의', value: `${ml?.ml_vote ?? 0}/3` },
        ],
        viz: ml
          ? {
              kind: 'bars',
              items: [
                { label: 'IF', value: ml.if_percentile ?? 0, min: 70, max: 100, on: !!ml.if_anomaly, color: STEP_ON },
                { label: 'LOF', value: ml.lof_percentile ?? 0, min: 70, max: 100, on: !!ml.lof_anomaly, color: STEP_ON },
                { label: 'SVM', value: ml.svm_percentile ?? 0, min: 70, max: 100, on: !!ml.svm_anomaly, color: STEP_ON },
              ],
            }
          : undefined,
        note: '모델: IF(고립도) / LOF(국소밀도) / OCSVM(경계)\n판정: 3개 중 2개 이상 합의 시 ML 탐지\n표시: 백분위 70~100 범위 확대(미세차 가시화)',
        diagram: 'phase7_ml',
      },
    },
    {
      key: 'match',
      label: '통계·ML 일치',
      on: econDet || mlDet,
      info: {
        title: '④ 통계·ML 일치',
        rows: [
          { label: '통계', value: econDet ? '탐지' : '정상' },
          { label: 'ML', value: mlDet ? '탐지' : '정상' },
        ],
        viz: {
          kind: 'bars',
          items: [
            { label: '통계', value: 1, max: 1, on: econDet, color: STEP_ON },
            { label: 'ML', value: 1, max: 1, on: mlDet, color: STEP_ON },
          ],
        },
        note: '대조: 계량과 ML의 독립 판정을 한눈에\n의미: 양방 합의 시 최고 신뢰(H)',
      },
    },
    {
      key: 'final',
      label: '최종 결과',
      on: !!grade,
      info: {
        title: '⑤ 최종 결과',
        color: grade ? JOURNEY_GRADE_COLORS[grade] : undefined,
        rows: grade ? [{ label: '등급', value: confidenceLabel(grade) }] : undefined,
        viz: grade ? { kind: 'diagram', phase: `grade_${grade}` } : undefined,
        note: normalMode
          ? '판정: 이상으로 분류되지 않은 정상 시점\n의미: 계량과 ML 모두 임계 이내'
          : grade
            ? GRADE_NOTE[grade]
            : '등급 미산출.',
      },
    },
  ];

  return (
    <group>
      {GRADES.map((gr, i) => {
        const x = -6 + i * 3;
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
                rows: [
                  { label: '건수', value: `${c}건` },
                  { label: '비중', value: total > 0 ? `${((c / total) * 100).toFixed(0)}%` : '—' },
                ],
                note: GRADE_NOTE[gr.key],
                viz: { kind: 'diagram', phase: `grade_${gr.key}` },
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

      {/* 5단계 판정 경로 (FlowLine 흐름) */}
      {FIVE.map((st, i) => {
        const y = 2.0 - i * 0.95;
        const pos: [number, number, number] = [2.5, y, 0];
        const isFinal = st.key === 'final';
        const col = isFinal && grade ? JOURNEY_GRADE_COLORS[grade] : st.on ? STEP_ON : STEP_OFF;
        const r = isFinal ? 0.34 : 0.24;
        return (
          <group key={st.key}>
            <mesh position={pos} {...bind(st.info)}>
              <sphereGeometry args={[r, 24, 24]} />
              <meshStandardMaterial
                color={col}
                emissive={col}
                emissiveIntensity={st.on ? 0.45 : 0}
                transparent
                opacity={st.on ? 1 : 0.5}
              />
            </mesh>
            {i < FIVE.length - 1 && (
              <FlowLine from={pos} to={[2.5, y - 0.95, 0]} color="#0d9488" particles={2} opacity={0.4} />
            )}
            {active && (
              <Label3D
                position={[4.4, y, 0]}
                size={10}
                chip
                color={isFinal && grade ? JOURNEY_GRADE_COLORS[grade] : undefined}
              >
                {`${i + 1}. ${st.label}`}
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
      {active && normalMode && (
        <Label3D position={[-3, 2.7, 0]} chip>
          정상 시점 (이상 아님)
        </Label3D>
      )}
      {active && (
        <Label3D position={[2.5, 2.9, 0]} size={11} chip>
          판정 경로
        </Label3D>
      )}
    </group>
  );
}
