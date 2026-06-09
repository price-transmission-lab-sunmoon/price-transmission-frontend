// ④ 이중 탐지 — 이상 후보가 계량(Phase 7)·ML(Phase 7-ML) 두 갈래로 분기. 실제 판정 반영.
// 계량: z/IQR 발광 + 정상/실제 시차 이중선(lag_deviation) + 비대칭 표시.
// ML: 3구체 반경=percentile, 발광=anomaly, 중앙 ml_vote n/3.
import { Line, RoundedBox } from '@react-three/drei';
import type { StationProps } from '../journeyContract';
import type { AnomalyDetail } from '@/types/anomaly';
import { ML_MODEL_COLORS } from '@/utils/colorUtils';
import { Label3D } from '../primitives/Label3D';

interface Props extends StationProps {
  detail?: AnomalyDetail;
}

const MODELS = [
  { key: 'if', label: 'Isolation Forest', color: ML_MODEL_COLORS.isolation_forest },
  { key: 'lof', label: 'LOF', color: ML_MODEL_COLORS.lof },
  { key: 'svm', label: 'One-Class SVM', color: ML_MODEL_COLORS.ocsvm },
];

const CENTER: [number, number, number] = [0, 2.4, 0];
const ECON: [number, number, number] = [-3.8, 0, 0];

export function Station4DualDetect({ active, detail }: Props) {
  const sm = detail?.stat_metrics;
  const ml = detail?.ml_summary;
  const econHit = !!(sm?.zscore_alert || sm?.iqr_outlier);
  const flags: Record<string, boolean | undefined> = {
    if: ml?.if_anomaly,
    lof: ml?.lof_anomaly,
    svm: ml?.svm_anomaly,
  };
  const pct: Record<string, number | null | undefined> = {
    if: ml?.if_percentile,
    lof: ml?.lof_percentile,
    svm: ml?.svm_percentile,
  };

  const normalLag = sm?.normal_lag ?? null;
  const actualLag = sm?.actual_lag ?? null;
  const lagDev = normalLag !== null && actualLag !== null && actualLag !== normalLag;

  return (
    <group>
      <mesh position={CENTER}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color="#1a1814" />
      </mesh>
      {active && (
        <Label3D position={[CENTER[0], CENTER[1] + 1, 0]} chip>
          이상 후보
        </Label3D>
      )}

      {/* 계량 lane */}
      <Line points={[CENTER, ECON]} color="#0d9488" lineWidth={2.5} />
      <RoundedBox position={ECON} args={[1.4, 1.0, 0.5]} radius={0.09} smoothness={4}>
        <meshStandardMaterial
          color={econHit ? '#0d9488' : '#d4cec1'}
          emissive={econHit ? '#0d9488' : '#000000'}
          emissiveIntensity={econHit ? 0.4 : 0}
        />
      </RoundedBox>
      {active && (
        <Label3D position={[ECON[0], ECON[1] + 1, 0]} size={11}>
          {`Z=${sm?.zscore?.toFixed(2) ?? '—'} · IQR ${sm?.iqr_outlier ? '이탈' : '범위 내'}`}
        </Label3D>
      )}
      {active && (
        <Label3D position={[ECON[0], ECON[1] - 0.9, 0]} chip size={12}>
          계량 (Phase 7)
        </Label3D>
      )}

      {/* 정상/실제 시차 이중선 (lag_deviation) — ECON 기준 상대좌표 + 길이 캡 */}
      {(() => {
        if (normalLag === null || actualLag === null) return null;
        const lagBaseX = ECON[0] - 2.4;
        const lenFor = (v: number) => (v > 0 ? Math.max(0.4, Math.min(2, v * 0.3)) : 0);
        const nLen = lenFor(normalLag);
        const aLen = lenFor(actualLag);
        return (
          <>
            <Line
              points={[
                [lagBaseX, -2, 0],
                [lagBaseX + nLen, -2, 0],
              ]}
              color="#0d9488"
              lineWidth={3}
            />
            <Line
              points={[
                [lagBaseX, -2.4, 0],
                [lagBaseX + aLen, -2.4, 0],
              ]}
              color={lagDev ? '#d97706' : '#0d9488'}
              lineWidth={3}
            />
            {active && (
              <Label3D position={[lagBaseX, -2.95, 0]} size={10} color={lagDev ? '#d97706' : undefined}>
                {`시차 정상 ${normalLag} → 실제 ${actualLag}`}
              </Label3D>
            )}
          </>
        );
      })()}

      {/* ML lane */}
      {MODELS.map((m, i) => {
        const pos: [number, number, number] = [3.8, 1.2 - i * 1.5, 0];
        const hit = !!flags[m.key];
        const p = pct[m.key]; // percentile은 0~100 스케일
        const r = 0.3 + (typeof p === 'number' ? p / 100 : 0.5) * 0.38;
        return (
          <group key={m.key}>
            <Line points={[CENTER, pos]} color={m.color} lineWidth={1.8} transparent opacity={0.5} />
            <mesh position={pos}>
              <sphereGeometry args={[r, 32, 32]} />
              <meshStandardMaterial
                color={m.color}
                emissive={hit ? m.color : '#000000'}
                emissiveIntensity={hit ? 0.5 : 0}
                opacity={hit ? 1 : 0.5}
                transparent
              />
            </mesh>
            {active && (
              <Label3D position={[pos[0] + 2.3, pos[1], 0]} size={11} chip>
                {typeof p === 'number' ? `${m.label} · ${p.toFixed(0)}%` : m.label}
              </Label3D>
            )}
          </group>
        );
      })}
      {active && ml && (
        <Label3D position={[3.8, -1.7, 0]} chip color="#0891b2">
          {`IF·LOF·SVM 중 ${ml.ml_vote}종 탐지`}
        </Label3D>
      )}
      {active && sm?.asymmetry_significant && (
        <Label3D position={[ECON[0], ECON[1] + 1.8, 0]} chip size={11}>
          비대칭 전달 유의 (TECM)
        </Label3D>
      )}
    </group>
  );
}
