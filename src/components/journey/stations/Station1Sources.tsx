// ① 원천 데이터 — 선택 품목의 가격 시리즈(국제가·수입단가·PPI·도매가·CPI)가 중앙
// '병합 데이터셋'으로 흘러듦. 반경=관측 커버리지, 라벨=최신 index_2020, has_anomaly→발광.
import { RoundedBox } from '@react-three/drei';
import type { StationProps } from '../journeyContract';
import type { RawPricesResponse } from '@/types/timeseries';
import { RAW_PRICE_COLORS } from '@/utils/colorUtils';
import { Label3D } from '../primitives/Label3D';
import { FlowLine } from '../primitives/FlowLine';
import { useHoverBinders } from '../journeyHover';

interface Props extends StationProps {
  rawPrices?: RawPricesResponse;
}

// rawPrices 미도달 시 폴백(정적 소스 목록).
const FALLBACK = [
  { label_kr: 'World Bank', color: '#7c3aed' },
  { label_kr: 'FAO FFPI', color: '#059669' },
  { label_kr: '관세청', color: '#0891b2' },
  { label_kr: '한국은행 ECOS', color: '#0d9488' },
  { label_kr: 'KAMIS', color: '#ea580c' },
];

// fixture label_kr이 인코딩 손상(mojibake)된 경우가 있어 신뢰하지 않고 source로 깨끗한 라벨 매핑.
const SOURCE_LABEL: Record<string, string> = {
  intl_price_krw: '국제가(원화)',
  import_price_usd: '수입단가',
  ppi: 'PPI',
  wholesale_price: '도매가',
  cpi: 'CPI',
};

const HUB: [number, number, number] = [4.5, 0, 0];

export function Station1Sources({ active, rawPrices }: Props) {
  // 객체를 useFrame으로 직접 움직이지 않는다 — drei Html(transform) 라벨이 1프레임
  // 묵은 matrixWorld로 그려져 메시와 어긋나기 때문. 움직임은 카메라(JourneyRig)가 담당.
  const bind = useHoverBinders();
  const series = rawPrices?.series ?? [];
  const items = series.length
    ? series.map((sr) => {
        const valid = sr.data.filter((d) => d.value !== null);
        const coverage = valid.length;
        const lastIdx = [...sr.data].reverse().find((d) => d.index_2020 !== null)?.index_2020 ?? null;
        const hasAnomaly = sr.data.some((d) => d.has_anomaly);
        return {
          label: SOURCE_LABEL[sr.source] ?? sr.label_kr,
          color: RAW_PRICE_COLORS[sr.source] ?? sr.color_hint ?? '#0d9488',
          coverage,
          lastIdx,
          hasAnomaly,
        };
      })
    : FALLBACK.map((f) => ({ label: f.label_kr, color: f.color, coverage: 0, lastIdx: null, hasAnomaly: false }));

  const maxCov = Math.max(1, ...items.map((it) => it.coverage));
  const count = items.length;
  // 시리즈가 많아져도(백엔드 실데이터) 장면 밖으로 안 나가게 간격 동적 클램프.
  const gap = Math.min(1.6, 9 / Math.max(count, 1));

  return (
    <group>
      {items.map((it, i) => {
        const y = (i - (count - 1) / 2) * -gap;
        const pos: [number, number, number] = [-4.5, y, 0];
        const r = it.coverage > 0 ? 0.36 + (it.coverage / maxCov) * 0.3 : 0.5;
        return (
          <group key={it.label}>
            <mesh
              position={pos}
              {...bind({
                title: it.label,
                color: it.color,
                rows: [
                  { label: '관측 커버리지', value: `${it.coverage}개월` },
                  { label: '최신 index_2020', value: it.lastIdx != null ? it.lastIdx.toFixed(1) : '—' },
                  { label: '이상 포함', value: it.hasAnomaly ? '있음' : '없음' },
                ],
                note: '원천 가격 시리즈 — 병합 데이터셋으로 유입(Phase 0)',
                viz: { kind: 'gauge', value: it.coverage, max: maxCov, label: '관측 커버리지', color: it.color },
              })}
            >
              <sphereGeometry args={[r, 32, 32]} />
              <meshStandardMaterial
                color={it.color}
                roughness={0.4}
                metalness={0.1}
              />
            </mesh>
            <FlowLine from={pos} to={HUB} color={it.color} />
            {active && (
              <Label3D position={[-7.0, y, 0]} size={12} chip>
                {`${it.label} · ${it.coverage}개월${it.lastIdx !== null ? ` · ${it.lastIdx.toFixed(0)}` : ''}`}
              </Label3D>
            )}
            {active && it.hasAnomaly && (
              <Label3D position={[-4.5, y + 0.62, 0]} size={10} chip color="#ea580c">
                이상 포함
              </Label3D>
            )}
          </group>
        );
      })}
      <RoundedBox
        position={HUB}
        args={[1.3, 1.3, 1.3]}
        radius={0.12}
        smoothness={4}
        {...bind({
          title: '병합 데이터셋',
          note: '전 소스를 품목별 단일 데이터셋으로 병합 (Phase 0). 이후 모든 분석의 입력.',
        })}
      >
        <meshStandardMaterial color="#1a1814" roughness={0.5} />
      </RoundedBox>
      {active && (
        <Label3D position={[4.5, -1.5, 0]} chip>
          병합 데이터셋
        </Label3D>
      )}
    </group>
  );
}
