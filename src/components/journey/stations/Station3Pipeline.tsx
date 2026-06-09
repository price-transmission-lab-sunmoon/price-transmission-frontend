// ③ 분석 파이프라인 — Phase 0~8 노드를 네이티브 3D 가로 플로우로(Html 임베드 폐기:
// 캔버스 밖 투영 시 잘려 안 보이던 문제 해소, 다른 스테이션과 톤 일치). 실제 nodes/edges + params 칩.
import { RoundedBox } from '@react-three/drei';
import type { StationProps } from '../journeyContract';
import type { PipelineMetaResponse, AnalysisParamsResponse } from '@/types/meta';
import { Label3D } from '../primitives/Label3D';
import { FlowLine } from '../primitives/FlowLine';

interface Props extends StationProps {
  pipeline?: PipelineMetaResponse;
  params?: AnalysisParamsResponse;
}

export function Station3Pipeline({ active, pipeline, params }: Props) {
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
            <RoundedBox position={pp} args={[0.95, 0.62, 0.4]} radius={0.08} smoothness={4}>
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
