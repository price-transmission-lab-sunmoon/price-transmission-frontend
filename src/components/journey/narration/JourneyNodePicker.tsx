// 좌측 패널 하단 노드 선택기 — 전달구조 '전이 산점도'의 축소판.
// x=국제가(상류, upstream_pct) · y=수입단가(하류, downstream_pct), 사분면(깃털/과대/과소/역전) + y=x 대각선.
// 회색=정상, 색=이상(등급색). 이상점 클릭 → '기준 이상' 선택(상세 기반 ②④⑤만 변경). 구간별.
import { useEffect, useRef, useState } from 'react';
import type { ScatterResponse } from '@/types/timeseries';
import { useJourneySelection, JOURNEY_GRADE_COLORS } from '../journeyContract';

const GRADE_KR: Record<string, string> = { high: '고신뢰', medium: '중신뢰', reference: '참고' };
const GRADE_SHORT: Record<string, string> = { high: '고', medium: '중', reference: '참' };
const SEG_LABEL: Record<string, string> = { A: 'A', B: 'B', C: 'C', D: 'D', D_prime: 'E' };
const GRADES = ['high', 'medium', 'reference'] as const;
const NODE_COLORS = JOURNEY_GRADE_COLORS;

const clamp = (v: number) => Math.max(3, Math.min(97, v));

export function JourneyNodePicker({
  scatter,
  segments,
}: {
  scatter?: ScatterResponse;
  segments: string[];
}) {
  const selected = useJourneySelection((s) => s.selectedAnomalyId);
  const setSelected = useJourneySelection((s) => s.setSelected);
  const selectedNormal = useJourneySelection((s) => s.selectedNormal);
  const setSelectedNormal = useJourneySelection((s) => s.setSelectedNormal);
  const pickerSegment = useJourneySelection((s) => s.pickerSegment);
  const setPickerSegment = useJourneySelection((s) => s.setPickerSegment);

  const [zoom, setZoom] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  // 미니맵 위 휠 → 산점도만 확대(페이지 스크롤·카메라 영향 차단).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setZoom((z) => Math.max(1, Math.min(6, z * (1 + e.deltaY * -0.0015))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  const zt = `translate(${50 * (1 - zoom)} ${50 * (1 - zoom)}) scale(${zoom})`;

  const seg = pickerSegment ?? segments[0] ?? '';
  const pts = scatter?.points ?? [];

  const maxAbs = Math.max(
    5,
    ...pts.map((p) => Math.abs(p.upstream_pct)),
    ...pts.map((p) => Math.abs(p.downstream_pct)),
  );
  const X = (v: number) => clamp(50 + (v / maxAbs) * 45);
  const Y = (v: number) => clamp(50 - (v / maxAbs) * 45);

  const cur = pts.find((p) => p.anomaly_id != null && p.anomaly_id === selected);
  const anomalies = pts.filter((p) => p.is_anomaly && p.anomaly_id != null);

  return (
    <div className="mt-5 pt-4 border-t border-border-default shrink-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-secondary text-[12px] font-medium">기준 이상 선택 · 전이 산점도</span>
        <div className="flex items-center gap-1">
          {zoom > 1 && (
            <button
              onClick={() => setZoom(1)}
              className="text-[11px] px-2 py-0.5 rounded-full text-tertiary hover:bg-subtle"
            >
              1×
            </button>
          )}
          <button
            onClick={() => setSelected(null)}
            className={[
              'text-[11px] px-2 py-0.5 rounded-full transition-colors',
              cur || selectedNormal ? 'text-tertiary hover:bg-subtle' : 'text-brand bg-subtle',
            ].join(' ')}
          >
            자동
          </button>
        </div>
      </div>

      {/* 구간 선택(산점도는 구간별) */}
      <div className="flex flex-wrap items-center gap-1 mb-2">
        <span className="text-tertiary text-[11px] mr-0.5">구간</span>
        {segments.map((s) => (
          <button
            key={s}
            onClick={() => setPickerSegment(s)}
            className={[
              'text-[11px] px-2 py-0.5 rounded-md border transition-colors',
              s === seg
                ? 'border-brand text-brand bg-subtle'
                : 'border-border-default text-tertiary hover:bg-subtle',
            ].join(' ')}
          >
            {SEG_LABEL[s] ?? s}
          </button>
        ))}
      </div>

      {/* 산점도 미니맵 — 정사각 유지(meet), 고정 높이 */}
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-[168px] overflow-hidden"
      >
        {/* 사분면 라벨(연하게) */}
        <text x="6" y="9" fontSize="4.5" fill="var(--text-tertiary)" opacity="0.7">깃털</text>
        <text x="94" y="9" fontSize="4.5" fill="var(--text-tertiary)" opacity="0.7" textAnchor="end">과대전달</text>
        <text x="6" y="97" fontSize="4.5" fill="var(--text-tertiary)" opacity="0.7">과소전달</text>
        <text x="94" y="97" fontSize="4.5" fill="var(--text-tertiary)" opacity="0.7" textAnchor="end">역전</text>
        {/* 축 십자 */}
        <line x1="50" y1="2" x2="50" y2="98" stroke="var(--border-default)" strokeWidth="0.4" />
        <line x1="2" y1="50" x2="98" y2="50" stroke="var(--border-default)" strokeWidth="0.4" />
        {/* y=x 대각선(완전 전달 기준) */}
        <line x1="5" y1="95" x2="95" y2="5" stroke="#0d9488" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
        <g transform={zt}>
          {/* 모든 점 클릭 선택 — 크기 균일, 고/중/참은 얇은 테두리로 구분, 선택만 강조 */}
          {pts.map((p, i) => {
            const isAnom = p.is_anomaly && p.anomaly_id != null;
            const isSel = isAnom
              ? p.anomaly_id === selected
              : selectedNormal?.period === p.period && selectedNormal?.segment === seg;
            const color = isAnom
              ? p.confidence_grade
                ? NODE_COLORS[p.confidence_grade]
                : '#ea580c'
              : 'var(--text-tertiary)';
            return (
              <circle
                key={`p${i}`}
                cx={X(p.upstream_pct)}
                cy={Y(p.downstream_pct)}
                r={isSel ? 1.3 : 0.75}
                fill={color}
                stroke={isSel ? 'var(--text-primary)' : isAnom ? '#1a1814' : 'none'}
                strokeWidth={isSel ? 0.9 : isAnom ? 0.35 : 0}
                vectorEffect="non-scaling-stroke"
                opacity={isAnom ? 0.95 : 0.35}
                style={{ cursor: 'pointer' }}
                onClick={() =>
                  isAnom
                    ? setSelected(p.anomaly_id)
                    : setSelectedNormal({
                        period: p.period,
                        segment: seg,
                        upstream_pct: p.upstream_pct,
                        downstream_pct: p.downstream_pct,
                      })
                }
              >
                <title>{`${p.period}${p.confidence_grade ? ` · ${GRADE_KR[p.confidence_grade]}` : ' · 정상'}`}</title>
              </circle>
            );
          })}
        </g>
      </svg>
      <div className="flex justify-between text-tertiary text-[10px] mt-0.5">
        <span>국제가 →</span>
        <span>{anomalies.length}개 이상 · 클릭 선택</span>
        <span>↑ 수입단가</span>
      </div>

      {/* 등급 범례 */}
      <div className="flex items-center gap-2 mt-1">
        {GRADES.map((g) => (
          <span key={g} className="flex items-center gap-1 text-[10px] text-tertiary">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NODE_COLORS[g] }} />
            {GRADE_SHORT[g]}
          </span>
        ))}
      </div>

      {/* 기준 명시 */}
      <div className="mt-2 text-[12px]">
        {cur ? (
          <span className="text-secondary">
            기준 이상:{' '}
            <span
              className="font-medium"
              style={{ color: cur.confidence_grade ? NODE_COLORS[cur.confidence_grade] : undefined }}
            >
              {cur.period} · {cur.confidence_grade ? GRADE_KR[cur.confidence_grade] : ''} · 구간 {SEG_LABEL[seg] ?? seg}
            </span>
          </span>
        ) : selectedNormal ? (
          <span className="text-secondary">
            기준:{' '}
            <span className="font-medium">
              정상 시점 {selectedNormal.period} · 구간 {SEG_LABEL[seg] ?? seg} · 상류{' '}
              {selectedNormal.upstream_pct.toFixed(1)}% · 하류 {selectedNormal.downstream_pct.toFixed(1)}%
            </span>
          </span>
        ) : (
          <span className="text-tertiary">기준 이상: 자동 (고신뢰·최신 우선)</span>
        )}
      </div>
    </div>
  );
}
