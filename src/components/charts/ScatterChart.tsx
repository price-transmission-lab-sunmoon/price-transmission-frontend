import { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAppStore } from '@/stores/useAppStore';
import { useScatterData } from '@/hooks/useScatterData';
import type { ScatterPoint } from '@/types/timeseries';
import type { SegmentId } from '@/types/literals';
import { CONFIDENCE_GRADES, PRIMARY_PATTERNS } from '@/types/literals';
import { ANOMALY_COLORS, ANOMALY_RADII } from '@/utils/colorUtils';

// ── 상수 ────────────────────────────────────────────────────────
const BASELINE_COLOR = '#3b82f6';
const SLIDER_INTERVAL_MS = 200;
const ZONE_LABEL_COLOR = '#94a3b8';
const ZONE_DESC_COLOR = '#64748b';
const TRAJECTORY_COLOR = '#475569';
const TRAJECTORY_OPACITY = 0.4;
const MARGIN = { top: 24, right: 32, bottom: 56, left: 56 };

const PATTERN_LABELS: Record<string, string> = {
  pattern1: '비대칭 전달',
  pattern2: '과대 전달',
  pattern3: '깃털 패턴',
};

const GRADE_LABELS: Record<string, string> = {
  high: '고신뢰',
  medium: '중신뢰',
  reference: '참고',
};

const SEGMENT_DISPLAY: Record<SegmentId, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  D_prime: "D′",
};

const TABS_3SEG: SegmentId[] = ['A', 'B', 'D_prime'];
const TABS_4SEG: SegmentId[] = ['A', 'B', 'C', 'D', 'D_prime'];

// ── YYYY-MM 월 범위 배열 생성 ────────────────────────────────────
function buildMonthRange(from: string, to: string): string[] {
  const months: string[] = [];
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

// ── 툴팁 데이터 타입 ─────────────────────────────────────────────
interface TooltipInfo {
  point: ScatterPoint;
  x: number;
  y: number;
}

// ════════════════════════════════════════════════════════════════
export function ScatterChart() {
  const primaryCommodityId = useAppStore((s) => s.primaryCommodityId);
  const commodities = useAppStore((s) => s.commodities);
  const scatterSegment = useAppStore((s) => s.scatterSegment);
  const setScatterSegment = useAppStore((s) => s.setScatterSegment);
  const selectAnomaly = useAppStore((s) => s.selectAnomaly);

  const { data, isLoading, error } = useScatterData();

  // 품목 정보 → 탭 구성
  const commodity = commodities.find((c) => c.commodity_id === primaryCommodityId) ?? null;
  const tabs = commodity?.has_wholesale ? TABS_4SEG : TABS_3SEG;

  // ── 로컬 상태 ──────────────────────────────────────────────────
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [sliderPosition, setSliderPosition] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showBaselineTooltip, setShowBaselineTooltip] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 데이터 로드 시 슬라이더 초기화 + 기준선 말풍선 ──────────────
  useEffect(() => {
    if (!data) return;
    setSliderPosition(data.actual_to);
    setIsPlaying(false);
    setShowBaselineTooltip(true);
    const t = setTimeout(() => setShowBaselineTooltip(false), 2000);
    return () => clearTimeout(t);
  }, [data]);

  // ── 재생 애니메이션 ────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !data) return;
    const months = buildMonthRange(data.actual_from, data.actual_to);
    const idx = months.indexOf(sliderPosition);
    if (idx < 0 || idx >= months.length - 1) {
      setIsPlaying(false);
      return;
    }
    playTimerRef.current = setTimeout(() => {
      setSliderPosition(months[idx + 1]);
    }, SLIDER_INTERVAL_MS);
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [isPlaying, sliderPosition, data]);

  // ── ResizeObserver ─────────────────────────────────────────────
  // data 의존성 필요: data 로드 전엔 containerRef.current가 null(로딩 화면 렌더)이므로
  // data가 도착해 전체 JSX가 마운트된 뒤 다시 실행해야 observe가 정상 동작함
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      setDimensions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    obs.observe(el);
    // 최초 1회 강제 초기화 (ResizeObserver 첫 콜백 전에 초기 크기 반영)
    setDimensions({ width: el.clientWidth, height: el.clientHeight });
    return () => obs.disconnect();
  }, [data]);

  // ── D3 렌더링 ──────────────────────────────────────────────────
  const handleMouseEnter = useCallback(
    (event: MouseEvent, p: ScatterPoint) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({ point: p, x: event.clientX - rect.left, y: event.clientY - rect.top });
    },
    [],
  );
  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  useEffect(() => {
    if (!svgRef.current || !data || dimensions.width <= 0 || dimensions.height <= 0) return;

    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const W = dimensions.width - MARGIN.left - MARGIN.right;
    const H = dimensions.height - MARGIN.top - MARGIN.bottom;
    if (W <= 0 || H <= 0) return;

    // ── 유효 포인트 필터링 (PARSE-NUM-002, PARSE-ENUM-002) ─────────
    const validPoints = data.points.filter((p) => {
      if (typeof p.upstream_pct !== 'number' || isNaN(p.upstream_pct)) return false;
      if (typeof p.downstream_pct !== 'number' || isNaN(p.downstream_pct)) return false;
      if (p.is_anomaly && p.confidence_grade !== null) {
        if (!CONFIDENCE_GRADES.includes(p.confidence_grade)) {
          console.warn(`[PARSE-ENUM-002] Invalid confidence_grade: ${p.confidence_grade}`);
          return false;
        }
      }
      if (p.is_anomaly && p.primary_pattern !== null) {
        if (!PRIMARY_PATTERNS.includes(p.primary_pattern)) {
          console.warn(`[PARSE-ENUM-002] Invalid primary_pattern: ${p.primary_pattern}`);
        }
      }
      // PARSE-SCHEMA-001: is_anomaly=true 이지만 anomaly_id=null
      if (p.is_anomaly && p.anomaly_id === null) {
        console.warn('[PARSE-SCHEMA-001] is_anomaly=true but anomaly_id=null — point not clickable');
      }
      return true;
    });

    // 슬라이더 위치 이하 포인트만 렌더링
    const filteredPoints = sliderPosition
      ? validPoints.filter((p) => p.period <= sliderPosition)
      : validPoints;

    // ── 스케일 ────────────────────────────────────────────────────
    const allX = validPoints.map((p) => p.upstream_pct);
    const allY = validPoints.map((p) => p.downstream_pct);
    const rawXExt = d3.extent(allX) as [number, number];
    const rawYExt = d3.extent(allY) as [number, number];
    const xPad = Math.max((rawXExt[1] - rawXExt[0]) * 0.12, 2);
    const yPad = Math.max((rawYExt[1] - rawYExt[0]) * 0.12, 2);
    const xDomain: [number, number] = [
      Math.min(rawXExt[0] - xPad, -2),
      Math.max(rawXExt[1] + xPad, 2),
    ];
    const yDomain: [number, number] = [
      Math.min(rawYExt[0] - yPad, -2),
      Math.max(rawYExt[1] + yPad, 2),
    ];

    const xScale = d3.scaleLinear().domain(xDomain).range([0, W]);
    const yScale = d3.scaleLinear().domain(yDomain).range([H, 0]);

    // ── SVG 구성 ──────────────────────────────────────────────────
    const defs = svg.append('defs');

    // 클립 패스
    defs
      .append('clipPath')
      .attr('id', 'scatter-clip')
      .append('rect')
      .attr('width', W)
      .attr('height', H);

    // Glow 필터 — high
    const fHigh = defs
      .append('filter')
      .attr('id', 'glow-high')
      .attr('x', '-80%').attr('y', '-80%')
      .attr('width', '260%').attr('height', '260%');
    fHigh.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '3').attr('result', 'blur');
    const mHigh = fHigh.append('feMerge');
    mHigh.append('feMergeNode').attr('in', 'blur');
    mHigh.append('feMergeNode').attr('in', 'SourceGraphic');

    // Glow 필터 — medium
    const fMed = defs
      .append('filter')
      .attr('id', 'glow-medium')
      .attr('x', '-60%').attr('y', '-60%')
      .attr('width', '220%').attr('height', '220%');
    fMed.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '2').attr('result', 'blur');
    const mMed = fMed.append('feMerge');
    mMed.append('feMergeNode').attr('in', 'blur');
    mMed.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // ── 그리드 ────────────────────────────────────────────────────
    g.append('g')
      .attr('class', 'x-grid')
      .attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(6).tickSize(-H).tickFormat(() => ''))
      .call((ax) => ax.select('.domain').remove())
      .selectAll('line')
      .style('stroke', '#94a3b8')
      .style('stroke-opacity', 0.3)
      .style('stroke-dasharray', '3,3');

    g.append('g')
      .attr('class', 'y-grid')
      .call(d3.axisLeft(yScale).ticks(6).tickSize(-W).tickFormat(() => ''))
      .call((ax) => ax.select('.domain').remove())
      .selectAll('line')
      .style('stroke', '#94a3b8')
      .style('stroke-opacity', 0.3)
      .style('stroke-dasharray', '3,3');

    // ── 축 ────────────────────────────────────────────────────────
    g.append('g')
      .attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(6))
      .call((ax) => ax.select('.domain').style('stroke', '#475569'))
      .selectAll('text')
      .style('fill', '#94a3b8')
      .style('font-size', '11px');

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(6))
      .call((ax) => ax.select('.domain').style('stroke', '#475569'))
      .selectAll('text')
      .style('fill', '#94a3b8')
      .style('font-size', '11px');

    // 축 타이틀
    g.append('text')
      .attr('x', W / 2)
      .attr('y', H + 46)
      .attr('text-anchor', 'middle')
      .style('fill', '#94a3b8')
      .style('font-size', '12px')
      .text(data.upstream_label);

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(H / 2))
      .attr('y', -44)
      .attr('text-anchor', 'middle')
      .style('fill', '#94a3b8')
      .style('font-size', '12px')
      .text(data.downstream_label);

    // ── 원점 강조선 (opacity: 0.5) ────────────────────────────────
    g.append('line')
      .attr('x1', 0).attr('x2', W)
      .attr('y1', yScale(0)).attr('y2', yScale(0))
      .style('stroke', '#94a3b8').style('stroke-opacity', 0.5).style('stroke-width', 1);

    g.append('line')
      .attr('x1', xScale(0)).attr('x2', xScale(0))
      .attr('y1', 0).attr('y2', H)
      .style('stroke', '#94a3b8').style('stroke-opacity', 0.5).style('stroke-width', 1);

    // ── 대각선 기준선 y=x ─────────────────────────────────────────
    const diagMin = Math.max(xDomain[0], yDomain[0]);
    const diagMax = Math.min(xDomain[1], yDomain[1]);
    if (diagMin < diagMax) {
      g.append('line')
        .attr('x1', xScale(diagMin)).attr('y1', yScale(diagMin))
        .attr('x2', xScale(diagMax)).attr('y2', yScale(diagMax))
        .style('stroke', BASELINE_COLOR)
        .style('stroke-opacity', 0.8)
        .style('stroke-width', 1.5)
        .style('stroke-dasharray', '6,4');

      // 기준선 말풍선 (2초 표시 후 fade-out)
      if (showBaselineTooltip) {
        const midX = xScale((diagMin + diagMax) / 2);
        const midY = yScale((diagMin + diagMax) / 2);
        const bub = g.append('g').attr('transform', `translate(${midX},${midY - 16})`);
        bub
          .append('rect')
          .attr('x', -88).attr('y', -18)
          .attr('width', 176).attr('height', 24)
          .attr('rx', 4)
          .style('fill', '#1e3a5f')
          .style('stroke', BASELINE_COLOR)
          .style('stroke-width', 0.8)
          .style('opacity', 0.92);
        bub
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '-2')
          .style('fill', '#93c5fd')
          .style('font-size', '11px')
          .text('이 선에 가까울수록 정상 전달');
      }
    }

    // ── 구역 레이블 (4사분면) ─────────────────────────────────────
    const zones = [
      {
        x: (xDomain[0] + 0) / 2,
        y: (0 + yDomain[1]) / 2,
        label: '깃털 패턴',
        desc: '상류 하락에도 하류 무반응 또는 상승',
      },
      {
        x: (0 + xDomain[1]) / 2,
        y: (0 + yDomain[1]) / 2,
        label: '과대 전달',
        desc: '상류 상승이 하류에 더 크게 전달됨',
      },
      {
        x: (xDomain[0] + 0) / 2,
        y: (yDomain[0] + 0) / 2,
        label: '과소 전달',
        desc: '상류 하락에 하류가 덜 반응',
      },
      {
        x: (0 + xDomain[1]) / 2,
        y: (yDomain[0] + 0) / 2,
        label: '역전',
        desc: '상류 상승, 하류 하락',
      },
    ];

    zones.forEach((z) => {
      const gx = xScale(z.x);
      const gy = yScale(z.y);
      if (gx < 0 || gx > W || gy < 0 || gy > H) return;
      const zg = g.append('g').attr('transform', `translate(${gx},${gy})`);
      zg.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.4em')
        .style('fill', ZONE_LABEL_COLOR)
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('pointer-events', 'none')
        .text(z.label);
      zg.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1em')
        .style('fill', ZONE_DESC_COLOR)
        .style('font-size', '11px')
        .style('pointer-events', 'none')
        .text(z.desc);
    });

    // ── 궤적선 ────────────────────────────────────────────────────
    if (filteredPoints.length > 1) {
      const sorted = [...filteredPoints].sort((a, b) => a.period.localeCompare(b.period));
      const lineGen = d3
        .line<ScatterPoint>()
        .x((p) => xScale(p.upstream_pct))
        .y((p) => yScale(p.downstream_pct));

      g.append('path')
        .datum(sorted)
        .attr('clip-path', 'url(#scatter-clip)')
        .attr('d', lineGen)
        .style('fill', 'none')
        .style('stroke', TRAJECTORY_COLOR)
        .style('stroke-opacity', TRAJECTORY_OPACITY)
        .style('stroke-width', 1);
    }

    // ── 일반 관측치 ───────────────────────────────────────────────
    g.selectAll<SVGCircleElement, ScatterPoint>('.normal-pt')
      .data(filteredPoints.filter((p) => !p.is_anomaly))
      .join('circle')
      .attr('class', 'normal-pt')
      .attr('clip-path', 'url(#scatter-clip)')
      .attr('cx', (p) => xScale(p.upstream_pct))
      .attr('cy', (p) => yScale(p.downstream_pct))
      .attr('r', ANOMALY_RADII.reference) // 일반 = 4px (reference 반지름과 동일)
      // spec §3.3 ④ "일반 관측치: 효과 없음" — opacity 미적용
      .style('fill', '#94a3b8');

    // ── 이상 관측치 ───────────────────────────────────────────────
    const anomalyPts = filteredPoints.filter(
      (p) => p.is_anomaly && p.confidence_grade !== null && CONFIDENCE_GRADES.includes(p.confidence_grade),
    );

    const anomalyCircles = g
      .selectAll<SVGCircleElement, ScatterPoint>('.anomaly-pt')
      .data(anomalyPts)
      .join('circle')
      .attr('class', 'anomaly-pt')
      .attr('clip-path', 'url(#scatter-clip)')
      .attr('cx', (p) => xScale(p.upstream_pct))
      .attr('cy', (p) => yScale(p.downstream_pct))
      .attr('r', (p) => ANOMALY_RADII[p.confidence_grade!])
      .style('fill', (p) => ANOMALY_COLORS[p.confidence_grade!])
      .style('cursor', (p) => (p.anomaly_id !== null ? 'pointer' : 'default'));

    // 글로우 필터 적용
    anomalyCircles
      .filter((p) => p.confidence_grade === 'high')
      .attr('filter', 'url(#glow-high)');
    anomalyCircles
      .filter((p) => p.confidence_grade === 'medium')
      .attr('filter', 'url(#glow-medium)');

    // 펄스 애니메이션 — high 등급 (SVG animate)
    anomalyCircles
      .filter((p) => p.confidence_grade === 'high')
      .each(function () {
        const r = ANOMALY_RADII.high;
        d3.select(this)
          .append('animate')
          .attr('attributeName', 'r')
          .attr('from', String(r))
          .attr('to', String(r * 1.45))
          .attr('dur', '1.5s')
          .attr('repeatCount', 'indefinite');
      });

    // 이벤트 핸들러
    anomalyCircles
      .on('mouseenter', function (event: MouseEvent, p: ScatterPoint) {
        handleMouseEnter(event, p);
      })
      .on('mouseleave', handleMouseLeave)
      .on('click', (_event: MouseEvent, p: ScatterPoint) => {
        if (p.anomaly_id !== null) selectAnomaly(p.anomaly_id);
      });
  }, [data, dimensions, sliderPosition, showBaselineTooltip, handleMouseEnter, handleMouseLeave, selectAnomaly]);

  // ── 슬라이더 관련 ─────────────────────────────────────────────
  const months = data ? buildMonthRange(data.actual_from, data.actual_to) : [];
  const sliderIdx = months.indexOf(sliderPosition);
  const effectiveIdx = sliderIdx < 0 ? months.length - 1 : sliderIdx;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    setSliderPosition(months[Number(e.target.value)] ?? '');
  };

  const handlePlay = () => {
    if (sliderIdx >= months.length - 1) {
      setSliderPosition(months[0] ?? '');
    }
    setIsPlaying(true);
  };

  const handlePause = () => setIsPlaying(false);

  const handleReset = () => {
    setIsPlaying(false);
    setSliderPosition(months[0] ?? '');
    setTimeout(() => setIsPlaying(true), 50);
  };

  // ── 포인트 중 이상 없음 확인 ─────────────────────────────────────
  const hasAnomalyPoints = data?.points.some((p) => p.is_anomaly) ?? false;

  // ── Loading / Error ────────────────────────────────────────────
  if (!primaryCommodityId) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        품목을 선택하세요
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        데이터 불러오는 중…
      </div>
    );
  }

  if (error) {
    const apiError = error as { code?: string; message?: string };
    const code = apiError?.code ?? '';
    if (code === 'COMMODITY_NOT_FOUND') {
      return (
        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
          해당 품목 데이터가 없습니다.
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 text-sm">
        <span>데이터를 불러오지 못했습니다.</span>
        <span className="text-xs text-slate-600">{apiError?.message}</span>
      </div>
    );
  }

  if (!data) return null;

  // FE-D3-001: 포인트 빈 배열
  const emptyPoints = data.points.length === 0;

  return (
    <div className="flex flex-col h-full gap-2 min-h-0">
      {/* ── 구간 탭 ─────────────────────────────────��─────────── */}
      <div className="flex gap-1 px-1 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setScatterSegment(tab)}
            className={[
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              scatterSegment === tab
                ? 'bg-blue-600/80 text-white'
                : 'bg-slate-700/60 text-slate-400 hover:bg-slate-600/60 hover:text-slate-200',
            ].join(' ')}
          >
            구간 {SEGMENT_DISPLAY[tab]}
          </button>
        ))}
      </div>

      {/* ── 접이식 설명 패널 ───────────────────────────────────── */}
      <div className="border border-slate-700/50 rounded-lg bg-slate-800/30 shrink-0">
        <button
          onClick={() => setIsPanelExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
        >
          <span className="font-medium">[전달 구조 뷰란?]</span>
          <span>{isPanelExpanded ? '▲' : '▼'}</span>
        </button>
        {isPanelExpanded && (
          <div className="px-3 pb-3 text-xs text-slate-400 leading-relaxed border-t border-slate-700/40 pt-2 whitespace-pre-line">
            {`이 그래프는 특정 구간에서 가격이 '얼마나, 어느 방향으로' 전달됐는지를 보여줍니다.

X축: 상류(앞 단계) 가격의 월별 변화율
Y축: 하류(다음 단계) 가격의 월별 변화율
각 점: 1개월 관측치

파란 점선(기준선)에 가까울수록 상류 변화가 그대로 전달된 정상적인 달입니다.
빨간·주황 점은 이상 탐지 시점이며, 클릭하면 분석 수치를 확인할 수 있습니다.

흐름 보기가 '언제 이상이 있었는가'라면,
전달 구조는 '그 이상이 어떤 형태였는가'를 보여줍니다.`}
          </div>
        )}
      </div>

      {/* ── 차트 + 오버레이 ───────────────────────────────────── */}
      <div className="relative flex-1 min-h-0" ref={containerRef}>
        {/* FE-D3-001: 빈 배열 */}
        {emptyPoints && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="bg-slate-800/80 text-slate-400 text-xs px-3 py-1.5 rounded">
              이 기간에는 관측 데이터가 없습니다.
            </span>
          </div>
        )}

        {/* 이상 관측치 없음 오버레이 (포인트는 있지만 모두 is_anomaly: false) */}
        {!emptyPoints && !hasAnomalyPoints && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-none z-10">
            <span className="bg-slate-800/80 text-slate-400 text-xs px-3 py-1.5 rounded border border-slate-700/40">
              이 기간에는 이상 탐지 관측치가 없습니다
            </span>
          </div>
        )}

        <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="block" />

        {/* 호버 툴팁 */}
        {tooltip && tooltip.point.is_anomaly && tooltip.point.confidence_grade && (
          <div
            className="absolute pointer-events-none z-20 bg-slate-800 border border-slate-600/60 rounded-lg px-3 py-2 text-xs text-slate-200 shadow-xl"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 8,
              minWidth: 160,
              transform:
                tooltip.x > dimensions.width - 180 ? 'translateX(-100%) translateX(-24px)' : undefined,
            }}
          >
            <div className="font-medium mb-1 text-slate-100">
              {(() => {
                const [y, m] = tooltip.point.period.split('-');
                return `${y}년 ${parseInt(m, 10)}월`;
              })()}
            </div>
            <div className="text-slate-300">
              X축: {tooltip.point.upstream_pct >= 0 ? '+' : ''}
              {tooltip.point.upstream_pct.toFixed(1)}%
            </div>
            <div className="text-slate-300">
              Y축: {tooltip.point.downstream_pct >= 0 ? '+' : ''}
              {tooltip.point.downstream_pct.toFixed(1)}%
            </div>
            <div className="mt-1" style={{ color: ANOMALY_COLORS[tooltip.point.confidence_grade] }}>
              {GRADE_LABELS[tooltip.point.confidence_grade]}
            </div>
            {tooltip.point.primary_pattern && (
              <div className="text-slate-400">
                패턴: {PATTERN_LABELS[tooltip.point.primary_pattern] ?? tooltip.point.primary_pattern}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 시점 슬라이더 ─────────────────────────────────────── */}
      {months.length > 0 && (
        <div className="shrink-0 flex flex-col gap-1 px-1 pb-1">
          <div className="flex items-center gap-2">
            {/* 재시작 */}
            <button
              onClick={handleReset}
              title="처음부터 재생"
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-200 text-xs"
            >
              ↺
            </button>
            {/* 재생 / 일시정지 */}
            {isPlaying ? (
              <button
                onClick={handlePause}
                className="w-6 h-6 flex items-center justify-center text-blue-400 hover:text-blue-200 text-xs"
              >
                ❚❚
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="w-6 h-6 flex items-center justify-center text-blue-400 hover:text-blue-200 text-xs"
              >
                ▶
              </button>
            )}
            <input
              type="range"
              min={0}
              max={months.length - 1}
              value={effectiveIdx}
              onChange={handleSliderChange}
              className="flex-1 h-1 accent-blue-500 cursor-pointer"
            />
            <span className="text-xs text-slate-400 w-16 text-right tabular-nums">
              {sliderPosition || data.actual_to}
            </span>
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 px-8">
            <span>{data.actual_from}</span>
            <span>{data.actual_to}</span>
          </div>
        </div>
      )}
    </div>
  );
}
