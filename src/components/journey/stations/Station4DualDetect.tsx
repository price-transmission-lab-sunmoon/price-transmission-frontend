// ④ 이중 탐지 — 이상 후보가 계량(Phase 7)·ML(Phase 7-ML) 두 갈래로 분기. 실제 판정 반영.
// 계량: z/IQR 발광 + 정상/실제 시차 이중선(lag_deviation) + 비대칭 표시.
// ML: 3구체 반경=percentile, 발광=anomaly, 중앙 ml_vote n/3.
import { Line, RoundedBox } from '@react-three/drei';
import type { StationProps } from '../journeyContract';
import type { AnomalyDetail } from '@/types/anomaly';
import { ML_MODEL_COLORS } from '@/utils/colorUtils';
import { Label3D } from '../primitives/Label3D';
import { useHoverBinders } from '../journeyHover';

interface Props extends StationProps {
  detail?: AnomalyDetail;
}

const MODELS = [
  { key: 'if', label: 'Isolation Forest', color: ML_MODEL_COLORS.isolation_forest, note: '무작위 분기 트리로 고립도 측정' },
  { key: 'lof', label: 'LOF', color: ML_MODEL_COLORS.lof, note: '국소 도달 밀도 비율 — 점진적 이탈에 민감' },
  { key: 'svm', label: 'One-Class SVM', color: ML_MODEL_COLORS.ocsvm, note: 'RBF 커널로 정상 분포 경계 학습' },
];

const CENTER: [number, number, number] = [0, 2.4, 0];
const ECON: [number, number, number] = [-3.8, 0, 0];

export function Station4DualDetect({ active, detail }: Props) {
  const bind = useHoverBinders();
  const sm = detail?.stat_metrics;
  const ml = detail?.ml_summary;
  // 계량 탐지(Phase 7)는 3유형 전체: 패턴1(방향역전·시차) + 패턴2(Z·IQR) + 패턴3(스프레드).
  const econHit = !!(
    sm?.zscore_alert ||
    sm?.iqr_outlier ||
    sm?.direction_reversal ||
    sm?.lag_deviation ||
    (sm?.spread_n3 != null && sm.spread_n3 > 0)
  );
  // ML(Phase 7-ML)은 구간 A·B에만 수행(논문 3-3).
  const mlApplies = detail?.segment_id === 'A' || detail?.segment_id === 'B';
  // 계량 탐지 사유(논문 §6-1: 방향역전형 88.6% 최다) — Z·IQR만 표시하면 실제 사유 왜곡.
  const econReasons = [
    sm?.direction_reversal && '방향역전',
    sm?.lag_deviation && '시차이탈',
    sm?.spread_n3 != null && sm.spread_n3 > 0 && '스프레드확대',
  ].filter(Boolean);
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
      <mesh
        position={CENTER}
        {...bind({
          title: '이상 후보 (동일 관측점)',
          note: '계량·ML 두 분석이 같은 데이터를 독립 수행 — 판정은 공유하지 않음',
        })}
      >
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
      <RoundedBox
        position={ECON}
        args={[1.4, 1.0, 0.5]}
        radius={0.09}
        smoothness={4}
        {...bind({
          title: '계량 탐지 (Phase 7)',
          color: '#0d9488',
          rows: [
            { label: 'Z-score', value: sm?.zscore != null ? sm.zscore.toFixed(2) : '—' },
            { label: 'IQR', value: sm?.iqr_outlier ? '이탈' : '범위 내' },
            { label: '탐지 사유', value: econReasons.length ? econReasons.join('·') : econHit ? 'Z/IQR' : '없음' },
          ],
          note: '계량 탐지 3유형: 방향역전·시차 / Z·IQR / 스프레드 누적',
          viz: {
            kind: 'gauge',
            value: sm?.zscore != null ? Math.abs(sm.zscore) : 0,
            max: 2.5,
            threshold: 2.0,
            label: '|Z-score| (경보 2.5)',
            color: '#0d9488',
          },
        })}
      >
        <meshStandardMaterial
          color={econHit ? '#0d9488' : '#d4cec1'}
          emissive={econHit ? '#0d9488' : '#000000'}
          emissiveIntensity={econHit ? 0.4 : 0}
        />
      </RoundedBox>
      {active && (
        <Label3D position={[ECON[0], ECON[1] + 1, 0]} size={11}>
          {`${econReasons.length ? `${econReasons.join('·')} · ` : ''}Z=${sm?.zscore?.toFixed(2) ?? '—'} · IQR ${sm?.iqr_outlier ? '이탈' : '범위 내'}`}
        </Label3D>
      )}
      {active && (
        <Label3D position={[ECON[0], ECON[1] - 0.9, 0]} chip size={12}>
          계량 (Phase 7)
        </Label3D>
      )}

      {/* 계량 Z-score 이탈 게이지 — 입력 데이터에 반응(길이·색 변함). 주의 2.0 눈금. */}
      {(() => {
        const z = sm?.zscore != null ? Math.abs(sm.zscore) : 0;
        const gw = 1.4;
        const len = gw * Math.min(z / 2.5, 1);
        const gy = -1.5;
        const col = z > 2.5 ? '#d97706' : z > 2.0 ? '#eab308' : '#0d9488';
        return (
          <group>
            <mesh position={[ECON[0], gy, 0]}>
              <boxGeometry args={[gw, 0.16, 0.12]} />
              <meshStandardMaterial color="#e7e2d8" />
            </mesh>
            {len > 0.01 && (
              <mesh position={[ECON[0] - gw / 2 + len / 2, gy, 0.03]}>
                <boxGeometry args={[len, 0.16, 0.14]} />
                <meshStandardMaterial color={col} emissive={col} emissiveIntensity={z > 2.0 ? 0.45 : 0.15} />
              </mesh>
            )}
            <mesh position={[ECON[0] - gw / 2 + gw * (2.0 / 2.5), gy, 0.05]}>
              <boxGeometry args={[0.03, 0.26, 0.16]} />
              <meshStandardMaterial color="#78736a" />
            </mesh>
          </group>
        );
      })()}

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

      {/* ML lane: 3 모델 → 앙상블(2개 이상 합의) → 이상 후보 */}
      {(() => {
        const vote = ml?.ml_vote ?? 0;
        const ensHit = vote >= 2;
        const ENS: [number, number, number] = [1.7, -0.3, 0];
        return (
          <>
            {MODELS.map((m, i) => {
              const pos: [number, number, number] = [4.0, 1.2 - i * 1.5, 0];
              const hit = !!flags[m.key];
              const p = pct[m.key]; // percentile은 0~100 스케일
              const r = 0.3 + (typeof p === 'number' ? p / 100 : 0.5) * 0.38;
              return (
                <group key={m.key}>
                  <Line points={[pos, ENS]} color={m.color} lineWidth={1.6} transparent opacity={hit ? 0.7 : 0.3} />
                  <mesh
                    position={pos}
                    {...bind({
                      title: m.label,
                      color: m.color,
                      rows: [
                        { label: '이상점수 백분위', value: typeof p === 'number' ? `${p.toFixed(0)}%` : '—' },
                        { label: '탐지 여부', value: hit ? '탐지' : '미탐지' },
                      ],
                      note: m.note,
                      viz:
                        typeof p === 'number'
                          ? { kind: 'gauge', value: p, max: 100, label: '이상점수 백분위', color: m.color }
                          : undefined,
                    })}
                  >
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
                    <Label3D position={[pos[0] + 1.9, pos[1], 0]} size={11} chip>
                      {typeof p === 'number' ? `${m.label} · ${p.toFixed(0)}%` : m.label}
                    </Label3D>
                  )}
                </group>
              );
            })}

            {/* 앙상블 노드 — 2개 이상 합의 시 강조 */}
            <Line points={[ENS, CENTER]} color="#0891b2" lineWidth={ensHit ? 3 : 1.8} transparent opacity={ensHit ? 0.9 : 0.4} />
            <RoundedBox
              position={ENS}
              args={[1.0, 0.8, 0.5]}
              radius={0.1}
              smoothness={4}
              scale={ensHit ? 1.18 : 1}
              {...bind({
                title: '앙상블 (2/3+ 합의)',
                color: '#0891b2',
                rows: [{ label: '모델 합의', value: `${vote}/3` }],
                note: 'IF·LOF·OCSVM 3개 중 2개 이상이 이상으로 판정할 때만 앙상블 탐지로 확정.',
                viz: {
                  kind: 'bars',
                  items: MODELS.map((m) => ({
                    label: m.key.toUpperCase(),
                    value: flags[m.key] ? 1 : 0,
                    max: 1,
                    on: !!flags[m.key],
                    color: m.color,
                  })),
                },
              })}
            >
              <meshStandardMaterial
                color={ensHit ? '#0891b2' : '#d4cec1'}
                emissive={ensHit ? '#0891b2' : '#000000'}
                emissiveIntensity={ensHit ? 0.5 : 0}
              />
            </RoundedBox>
            {active && (
              <Label3D position={[ENS[0], ENS[1] - 0.85, 0]} chip size={11} color={ensHit ? '#0891b2' : undefined}>
                {`앙상블 ${vote}/3 탐지`}
              </Label3D>
            )}
          </>
        );
      })()}
      {active && (
        <Label3D position={[3.8, 2.5, 0]} size={10} chip color={mlApplies ? '#0891b2' : '#a8a298'}>
          {mlApplies ? 'ML 적용: 구간 A·B' : 'ML 미적용 (A·B 한정)'}
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
