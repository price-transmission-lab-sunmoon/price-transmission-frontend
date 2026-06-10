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
const PHASE_DETAIL: Record<string, string> = {
  phase0: '데이터 수집·전처리. 5개 공공 소스(World Bank·FAO·관세청·한국은행·KAMIS)를 품목별 단일 데이터셋으로 병합. 국제가는 환율로 원화 환산.',
  phase1: '계절 조정. STL 분해(period=12)로 추세·계절·잔차 분리 후 계절 성분 제거. 견고성 분석상 결과에 가장 민감한 선택.',
  phase2: '정상성 검정. ADF·KPSS 동시 적용으로 단위근 판정, 미충족 시 1차 차분.',
  phase3: '공적분 검정. Johansen 검정으로 장기 균형관계 유무 판정 → 있으면 VECM, 없으면 VAR로 분기.',
  phase4_vecm: 'VECM 추정. 공적분 존재 시 오차수정항(ECT) 포함 모형으로 장·단기 동학 추정 + 충격반응(IRF) 산출.',
  phase4_var: 'VAR 추정. 공적분 없을 때 차분 변수로 단기 동적 관계 추정 + 충격반응(IRF) 산출.',
  phase5: 'Granger 인과 검정. 양방향 검정으로 전달 방향 확정(도매가 단계가 있는 구간 C 한정).',
  phase6: '구조 변화 검정. Bai-Perron·Chow로 전달 체계가 바뀐 시점(구조 단절) 탐지 → 분석기간 하위 분할.',
  phase7: '계량 이상 탐지. 3유형 규칙 — ①방향 역전·시차 이탈 ②전이율 Z-score(2.0/2.5)+IQR 동시 초과·비대칭(TECM) ③안정기 스프레드 누적.',
  phase7_ml: 'ML 보조 탐지. 6개 피처로 IF·LOF·OCSVM 비지도 학습, 3개 중 2개 이상 합의 시 앙상블 탐지(구간 A·B 한정).',
  phase8: '결과 종합·등급화. 두 분석 교차 대조 → H(둘다)/M(계량만)/R(ML만) 신뢰도 등급 부여.',
};

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
  const phases = Array.from(new Set(nodes.map((n) => n.phase_number))).sort((a, b) => a - b);
  const xFor = (pi: number) => (phases.length > 1 ? -9 + (pi / (phases.length - 1)) * 18 : 0);

  const pos = new Map<string, [number, number, number]>();
  phases.forEach((ph, pi) => {
    const row = nodes.filter((n) => n.phase_number === ph);
    const rowGap = Math.min(1.8, 6 / Math.max(row.length, 1)); // 노드 많아도 화면 내
    row.forEach((n, j) => {
      const y = row.length > 1 ? (j - (row.length - 1) / 2) * rowGap : 0;
      pos.set(n.id, [xFor(pi), y, 0]);
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
        const below = phases.indexOf(n.phase_number) % 2 === 0; // 열(phase) 단위 교번 — 다중행에도 안전
        return (
          <group key={n.id}>
            <RoundedBox
              position={pp}
              args={[0.95, 0.62, 0.4]}
              radius={0.08}
              smoothness={4}
              {...bind({
                title: n.label,
                rows: [{ label: 'Phase', value: String(n.phase_number) }],
                note: PHASE_DETAIL[n.id] ?? n.description,
              })}
            >
              <meshStandardMaterial color="#0d9488" roughness={0.5} metalness={0.1} />
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
