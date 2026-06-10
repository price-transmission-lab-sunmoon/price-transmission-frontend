// ③ 분석 파이프라인 — Phase 0~8 노드를 네이티브 3D 가로 플로우로(Html 임베드 폐기:
// 캔버스 밖 투영 시 잘려 안 보이던 문제 해소, 다른 스테이션과 톤 일치). 실제 nodes/edges + params 칩.
import { RoundedBox } from '@react-three/drei';
import type { StationProps } from '../journeyContract';
import type { PipelineMetaResponse, AnalysisParamsResponse } from '@/types/meta';
import { Label3D } from '../primitives/Label3D';
import { FlowLine } from '../primitives/FlowLine';
import { useHoverBinders } from '../journeyHover';

interface Props extends StationProps {
  pipeline?: PipelineMetaResponse;
  params?: AnalysisParamsResponse;
}

// Phase별 상세 설명(정본 논문 기반) — 호버 패널 note. 백엔드 description(짧음)은 폴백.
// '라벨: 내용' 줄 → HoverPanel이 라벨 캡션으로 구조화 렌더(개조식).
const PHASE_DETAIL: Record<string, string> = {
  phase0: '역할: 데이터 수집·전처리\n방법: 5개 공공 소스를 품목별 단일 데이터셋으로 병합\n비고: 국제가는 환율로 원화 환산',
  phase1: '역할: 계절성 제거\n방법: STL 분해(period=12)로 추세·계절·잔차 분리\n비고: 견고성 분석상 결과에 가장 민감한 선택',
  phase2: '역할: 정상성 확인\n방법: ADF와 KPSS 동시 적용으로 단위근 판정\n분기: 미충족 시 1차 차분',
  phase3: '역할: 장기 균형관계 검정\n방법: Johansen 공적분 검정\n분기: 있으면 VECM, 없으면 VAR',
  phase4_vecm: '역할: 장·단기 동학 추정\n방법: 오차수정항(ECT) 포함 VECM\n산출: 충격반응(IRF)',
  phase4_var: '역할: 단기 동적 관계 추정\n방법: 차분 변수 VAR\n산출: 충격반응(IRF)',
  phase5: '역할: 전달 방향 확정\n방법: Granger 양방향 인과 검정\n대상: 도매가 단계가 있는 구간 C 한정',
  phase6: '역할: 구조 단절 시점 탐지\n방법: Bai-Perron과 Chow 검정\n활용: 분석기간 하위 분할',
  phase7: '역할: 계량 이상 탐지\n유형1: 방향 역전과 시차 이탈\n유형2: Z-score(2.0/2.5)+IQR 동시 초과, 비대칭(TECM)\n유형3: 안정기 스프레드 누적',
  phase7_ml: '역할: ML 보조 탐지\n방법: 6개 피처로 IF·LOF·OCSVM 비지도 학습\n판정: 3개 중 2개 합의 시 탐지(구간 A·B 한정)',
  phase8: '역할: 신뢰도 등급화\n방법: 계량×ML 교차 대조\n등급: H(둘 다) / M(계량만) / R(ML만)',
};

// Phase 진행(초록→주황) 그라데이션. 분기 노드는 같은 열 → 같은 t → 같은 색.
const GRAD_FROM = '#059669'; // 초록(emerald)
const GRAD_TO = '#ea580c'; // 주황(orange)
function lerpColor(a: string, b: string, t: number): string {
  const ca = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const cb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return (
    '#' +
    ca.map((c, i) => Math.round(c + (cb[i] - c) * t).toString(16).padStart(2, '0')).join('')
  );
}

export function Station3Pipeline({ active, pipeline, params }: Props) {
  const bind = useHoverBinders();
  const nodes = pipeline?.nodes ?? [];
  // 데이터 미도달 시에도 빈 화면이 되지 않도록 fallback(다른 스테이션과 동일 정책).
  if (nodes.length === 0) {
    return (
      <group>
        {Array.from({ length: 9 }, (_, i) => (
          <RoundedBox
            key={i}
            position={[-9 + (i / 8) * 18, 0, 0]}
            args={[0.95, 0.62, 0.4]}
            radius={0.08}
            smoothness={4}
          >
            <meshStandardMaterial color="#d4cec1" roughness={0.5} />
          </RoundedBox>
        ))}
        {active && (
          <Label3D position={[0, 1.4, 0]} size={12} chip>
            분석 파이프라인 (데이터 연결 시 표시)
          </Label3D>
        )}
      </group>
    );
  }
  // 열 = phase 정수부(floor) → phase 4(VAR/VECM)·7(계량/7-ML)이 같은 열에서 분기.
  const colKey = (n: { phase_number: number }) => Math.floor(n.phase_number);
  const cols = Array.from(new Set(nodes.map(colKey))).sort((a, b) => a - b);
  const xFor = (ci: number) => (cols.length > 1 ? -9 + (ci / (cols.length - 1)) * 18 : 0);

  const pos = new Map<string, [number, number, number]>();
  cols.forEach((col, ci) => {
    const row = nodes.filter((n) => colKey(n) === col);
    const rowGap = Math.min(1.8, 6 / Math.max(row.length, 1)); // 노드 많아도 화면 내
    row.forEach((n, j) => {
      const y = row.length > 1 ? (j - (row.length - 1) / 2) * rowGap : 0;
      pos.set(n.id, [xFor(ci), y, 0]);
    });
  });

  const p = params?.params;

  return (
    <group>
      {(pipeline?.edges ?? []).map((e, i) => {
        const a = pos.get(e.source);
        const b = pos.get(e.target);
        if (!a || !b) return null;
        return <FlowLine key={i} from={a} to={b} color="#0d9488" particles={2} opacity={0.3} />;
      })}

      {nodes.map((n) => {
        const pp = pos.get(n.id);
        if (!pp) return null;
        const ci = cols.indexOf(colKey(n));
        const below = ci % 2 === 0; // 열 단위 교번 — 다중행에도 안전
        const nodeColor = lerpColor(GRAD_FROM, GRAD_TO, cols.length > 1 ? ci / (cols.length - 1) : 0);
        return (
          <group key={n.id}>
            <RoundedBox
              position={pp}
              args={[0.95, 0.62, 0.4]}
              radius={0.08}
              smoothness={4}
              {...bind({
                title: n.description || n.label, // 기법명(3D 라벨 'Phase N'과 중복 방지)
                note: PHASE_DETAIL[n.id] ?? n.description,
                viz: { kind: 'diagram', phase: n.id },
              })}
            >
              <meshStandardMaterial color={nodeColor} roughness={0.5} metalness={0.1} />
            </RoundedBox>
            {active && (
              <Label3D position={[pp[0], pp[1] + (below ? -0.85 : 0.85), 0]} size={10} chip>
                {n.label.length > 12 ? `${n.label.slice(0, 12)}…` : n.label}
              </Label3D>
            )}
          </group>
        );
      })}

      {active && p && (
        <Label3D position={[0, 3, 0]} size={11} chip>
          {`롤링 ${p.rolling_window}개월 · Z ${p.zscore_warning}/${p.zscore_alert} · IQR×${p.iqr_multiplier}${
            p.chow_test_points?.length ? ` · 구조변화 ${p.chow_test_points.length}시점` : ''
          }`}
        </Label3D>
      )}
    </group>
  );
}
