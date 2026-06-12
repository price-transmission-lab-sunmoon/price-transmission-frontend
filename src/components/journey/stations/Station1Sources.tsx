// ① 원천 데이터 — 가격 시리즈가 중앙 병합 데이터셋으로 흘러듦. 반경=커버리지, 이상 포함 시 라벨 표시.
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

// 데이터 미도달 시 정적 폴백.
const FALLBACK = [
  { label_kr: 'World Bank', color: '#7c3aed' },
  { label_kr: 'FAO FFPI', color: '#059669' },
  { label_kr: '관세청', color: '#0891b2' },
  { label_kr: '한국은행 ECOS', color: '#0d9488' },
  { label_kr: 'KAMIS', color: '#ea580c' },
];

// label_kr은 인코딩 손상이 있을 수 있어 source 키 기반 매핑을 우선한다.
const SOURCE_LABEL: Record<string, string> = {
  intl_price_krw: '국제가(원화)',
  import_price_usd: '수입단가',
  ppi: 'PPI',
  wholesale_price: '도매가',
  cpi: 'CPI',
};

// 소스별 호버 설명.
const SOURCE_NOTE: Record<string, string> = {
  intl_price_krw:
    '역할: 전달 사슬의 시작점, 상류 충격의 원천\n출처: World Bank Pink Sheet 국제 시세\n선정: 환율 반영 원화 환산으로 국내 비교 가능',
  import_price_usd:
    '역할: 국제가가 국내로 들어오는 첫 관문(구간 A 하류)\n출처: 관세청 수입 통관 단가\n선정: 계약·운임이 반영된 실제 수입가격 포착',
  ppi: '역할: 국내 생산자 단계 가격(구간 B 하류)\n출처: 한국은행 생산자물가지수\n선정: 가공·유통 초입의 가격 형성 반영',
  wholesale_price:
    '역할: 도매 유통 단계(구간 C와 D 경유)\n출처: KAMIS 도매가격\n선정: 산지에서 소비로 가는 중간 단계 포착',
  cpi: '역할: 최종 소비자 단계, 전달 사슬의 종점\n출처: 한국은행 ECOS 소비자물가\n선정: 소비자 체감 물가로 전달의 최종 결과 확인',
};

const HUB: [number, number, number] = [4.5, 0, 0];

export function Station1Sources({ active, rawPrices }: Props) {
  // 객체를 useFrame으로 직접 움직이지 않는다. drei Html 라벨이 1프레임 묵은 matrixWorld로
  // 그려져 메시와 어긋나기 때문이다. 움직임은 카메라(JourneyRig)가 담당한다.
  const bind = useHoverBinders();
  const series = rawPrices?.series ?? [];
  const items = series.length
    ? series.map((sr) => {
        const valid = sr.data.filter((d) => d.value !== null);
        const coverage = valid.length;
        const lastIdx =
          [...sr.data].reverse().find((d) => d.index_2020 !== null)?.index_2020 ?? null;
        const hasAnomaly = sr.data.some((d) => d.has_anomaly);
        return {
          source: sr.source,
          label: SOURCE_LABEL[sr.source] ?? sr.label_kr,
          color: RAW_PRICE_COLORS[sr.source] ?? sr.color_hint ?? '#0d9488',
          coverage,
          lastIdx,
          hasAnomaly,
        };
      })
    : FALLBACK.map((f) => ({
        source: '',
        label: f.label_kr,
        color: f.color,
        coverage: 0,
        lastIdx: null,
        hasAnomaly: false,
      }));

  const maxCov = Math.max(1, ...items.map((it) => it.coverage));
  const count = items.length;
  // 시리즈가 많아져도 장면 밖으로 나가지 않게 간격을 동적으로 클램프한다.
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
                  {
                    label: '최신 index_2020',
                    value: it.lastIdx != null ? it.lastIdx.toFixed(1) : '—',
                  },
                  { label: '이상 포함', value: it.hasAnomaly ? '있음' : '없음' },
                ],
                note:
                  SOURCE_NOTE[it.source] ?? '역할: 원천 가격 시리즈\n유입: 병합 데이터셋(Phase 0)',
                viz: {
                  kind: 'gauge',
                  value: it.coverage,
                  max: maxCov,
                  label: '관측 커버리지(개월)',
                  color: it.color,
                },
              })}
            >
              <sphereGeometry args={[r, 32, 32]} />
              <meshStandardMaterial color={it.color} roughness={0.4} metalness={0.1} />
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
