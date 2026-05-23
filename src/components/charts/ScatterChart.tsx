import { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAppStore } from '@/stores/useAppStore';
import { useScatterData } from '@/hooks/useScatterData';
import type { ScatterPoint } from '@/types/timeseries';
import type { SegmentId } from '@/types/literals';
import { CONFIDENCE_GRADES, PRIMARY_PATTERNS } from '@/types/literals';
import { ANOMALY_COLORS, ANOMALY_RADII } from '@/utils/colorUtils';
import { CHART_THEME } from '@/utils/chartTheme';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { StateView } from '@/components/ui/StateView';

// ── Constants (light theme tokens) ────────────────────────────
const BASELINE_COLOR = 'var(--brand)';
const SLIDER_INTERVAL_MS = 200;
const ZONE_LABEL_COLOR = CHART_THEME.axisLabel;
const ZONE_DESC_COLOR = CHART_THEME.axisText;
const TRAJECTORY_COLOR = CHART_THEME.axisText;
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
  D_prime: 'D′',
};

const TABS_3SEG: SegmentId[] = ['A', 'B', 'D_prime'];
const TABS_4SEG: SegmentId[] = ['A', 'B', 'C', 'D', 'D_prime'];

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

interface TooltipInfo {
  point: ScatterPoint;
  x: number;
  y: number;
}

export function ScatterChart() {
  const primaryCommodityId = useAppStore((s) => s.primaryCommodityId);
  const commodities = useAppStore((s) => s.commodities);
  const scatterSegment = useAppStore((s) => s.scatterSegment);
  const setScatterSegment = useAppStore((s) => s.setScatterSegment);
  const selectAnomaly = useAppStore((s) => s.selectAnomaly);

  const { data, isLoading, error } = useScatterData();

  const commodity = commodities.find((c) => c.commodity_id === primaryCommodityId) ?? null;
  const tabs = commodity?.has_wholesale ? TABS_4SEG : TABS_3SEG;

  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [sliderPosition, setSliderPosition] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!data) return;
    setSliderPosition(data.actual_to);
    setIsPlaying(false);
  }, [data]);

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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const sync = (w: number, h: number) => {
      if (w > 0 && h > 0) setDimensions({ width: w, height: h });
    };
    const trySync = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        sync(rect.width, rect.height);
      } else {
        raf = requestAnimationFrame(trySync);
      }
    };
    trySync();
    const obs = new ResizeObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      sync(e.contentRect.width, e.contentRect.height);
    });
    obs.observe(el);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [data]);

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
      if (p.is_anomaly && p.anomaly_id === null) {
        console.warn('[PARSE-SCHEMA-001] is_anomaly=true but anomaly_id=null — point not clickable');
      }
      return true;
    });

    const filteredPoints = sliderPosition
      ? validPoints.filter((p) => p.period <= sliderPosition)
      : validPoints;

    const allX = validPoints.map((p) => p.upstream_pct);
    const allY = validPoints.map((p) => p.downstream_pct);
    const rawXExt = d3.extent(allX) as [number, number];
    const rawYExt = d3.extent(allY) as [number, number];
    const xPad = (rawXExt[1] - rawXExt[0]) * 0.05 || 0.5;
    const yPad = (rawYExt[1] - rawYExt[0]) * 0.05 || 0.5;
    const xDomain: [number, number] = [rawXExt[0] - xPad, rawXExt[1] + xPad];
    const yDomain: [number, number] = [rawYExt[0] - yPad, rawYExt[1] + yPad];

    const xScale = d3.scaleLinear().domain(xDomain).range([0, W]);
    const yScale = d3.scaleLinear().domain(yDomain).range([H, 0]);

    const defs = svg.append('defs');
    defs
      .append('clipPath')
      .attr('id', 'scatter-clip')
      .append('rect')
      .attr('width', W)
      .attr('height', H);

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Grid (horizontal, solid Observable style)
    g.append('g')
      .attr('class', 'y-grid')
      .call(d3.axisLeft(yScale).ticks(6).tickSize(-W).tickFormat(() => ''))
      .call((ax) => ax.select('.domain').remove())
      .selectAll('line')
      .style('stroke', CHART_THEME.gridLine);

    // Axes
    const xAxisG = g
      .append('g')
      .attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(6).tickSize(0).tickPadding(10));
    xAxisG.select('.domain').style('stroke', CHART_THEME.axisLine);
    xAxisG.selectAll('text')
      .style('fill', CHART_THEME.axisText)
      .style('font-size', '11px')
      .style('font-family', CHART_THEME.fontFamilyMono);

    const yAxisG = g.append('g').call(d3.axisLeft(yScale).ticks(6).tickSize(0).tickPadding(10));
    yAxisG.select('.domain').remove();
    yAxisG.selectAll('text')
      .style('fill', CHART_THEME.axisText)
      .style('font-size', '11px')
      .style('font-family', CHART_THEME.fontFamilyMono);

    g.append('text')
      .attr('x', W / 2)
      .attr('y', H + 46)
      .attr('text-anchor', 'middle')
      .style('fill', CHART_THEME.axisLabel)
      .style('font-size', '12px')
      .text(data.upstream_label);

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(H / 2))
      .attr('y', -44)
      .attr('text-anchor', 'middle')
      .style('fill', CHART_THEME.axisLabel)
      .style('font-size', '12px')
      .text(data.downstream_label);

    // 원점 강조선
    g.append('line')
      .attr('x1', 0).attr('x2', W)
      .attr('y1', yScale(0)).attr('y2', yScale(0))
      .style('stroke', CHART_THEME.axisText).style('stroke-opacity', 0.4).style('stroke-width', 1);

    g.append('line')
      .attr('x1', xScale(0)).attr('x2', xScale(0))
      .attr('y1', 0).attr('y2', H)
      .style('stroke', CHART_THEME.axisText).style('stroke-opacity', 0.4).style('stroke-width', 1);

    // 대각선 기준선 y=x (brand teal)
    const diagMin = Math.max(xDomain[0], yDomain[0]);
    const diagMax = Math.min(xDomain[1], yDomain[1]);
    if (diagMin < diagMax) {
      g.append('line')
        .attr('x1', xScale(diagMin)).attr('y1', yScale(diagMin))
        .attr('x2', xScale(diagMax)).attr('y2', yScale(diagMax))
        .style('stroke', BASELINE_COLOR)
        .style('stroke-opacity', 0.5)
        .style('stroke-width', 1.5)
        .style('stroke-dasharray', '4,4');
    }

    // 구역 레이블 (4사분면)
    const zones = [
      { x: (xDomain[0] + 0) / 2, y: (0 + yDomain[1]) / 2, label: '깃털 패턴', desc: '상류 하락에도 하류 무반응 또는 상승' },
      { x: (0 + xDomain[1]) / 2, y: (0 + yDomain[1]) / 2, label: '과대 전달', desc: '상류 상승이 하류에 더 크게 전달됨' },
      { x: (xDomain[0] + 0) / 2, y: (yDomain[0] + 0) / 2, label: '과소 전달', desc: '상류 하락에 하류가 덜 반응' },
      { x: (0 + xDomain[1]) / 2, y: (yDomain[0] + 0) / 2, label: '역전', desc: '상류 상승, 하류 하락' },
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

    // 궤적선
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

    // 일반 관측치 (warm gray small dot)
    g.selectAll<SVGCircleElement, ScatterPoint>('.normal-pt')
      .data(filteredPoints.filter((p) => !p.is_anomaly))
      .join('circle')
      .attr('class', 'normal-pt')
      .attr('clip-path', 'url(#scatter-clip)')
      .attr('cx', (p) => xScale(p.upstream_pct))
      .attr('cy', (p) => yScale(p.downstream_pct))
      .attr('r', ANOMALY_RADII.reference)
      .style('fill', 'var(--text-muted)')
      .style('opacity', 0.7);

    // 이상 관측치 — 3 layer pulse halo + white ring + dot (or reference outline)
    const anomalyPts = filteredPoints.filter(
      (p) => p.is_anomaly && p.confidence_grade !== null && CONFIDENCE_GRADES.includes(p.confidence_grade),
    );

    const nodeG = g.append('g').attr('class', 'scatter-anomaly-nodes');

    anomalyPts.forEach((p) => {
      const cx = xScale(p.upstream_pct);
      const cy = yScale(p.downstream_pct);
      const grade = p.confidence_grade!;
      const r = ANOMALY_RADII[grade];
      const color = ANOMALY_COLORS[grade];
      const isReference = grade === 'reference';

      // Pulse halo — high only, CSS keyframes
      if (grade === 'high') {
        nodeG.append('circle')
          .attr('class', 'anomaly-pulse-high')
          .attr('clip-path', 'url(#scatter-clip)')
          .attr('cx', cx).attr('cy', cy)
          .attr('r', r + 3)
          .attr('fill', color)
          .style('pointer-events', 'none');
      }

      // White ring separator (non-reference only)
      if (!isReference) {
        nodeG.append('circle')
          .attr('clip-path', 'url(#scatter-clip)')
          .attr('cx', cx).attr('cy', cy)
          .attr('r', r + 2.5)
          .attr('fill', 'var(--bg-surface)')
          .style('pointer-events', 'none');
      }

      // Main dot
      const circle = nodeG.append('circle')
        .attr('clip-path', 'url(#scatter-clip)')
        .attr('cx', cx).attr('cy', cy)
        .attr('r', r)
        .attr('fill', isReference ? 'var(--bg-surface)' : color)
        .attr('stroke', isReference ? color : 'transparent')
        .attr('stroke-width', isReference ? 2 : 0)
        .style('cursor', p.anomaly_id !== null ? 'pointer' : 'default')
        .on('mouseenter', (event: MouseEvent) => handleMouseEnter(event, p))
        .on('mouseleave', handleMouseLeave)
        .on('click', () => {
          if (p.anomaly_id !== null) selectAnomaly(p.anomaly_id);
        });

      // r 변화 시 circle 미사용 처리 (unused var lint 회피)
      void circle;
    });
  }, [data, dimensions, sliderPosition, handleMouseEnter, handleMouseLeave, selectAnomaly]);

  const months = data ? buildMonthRange(data.actual_from, data.actual_to) : [];
  const sliderIdx = months.indexOf(sliderPosition);
  const effectiveIdx = sliderIdx < 0 ? months.length - 1 : sliderIdx;
  const progressPct = months.length > 1 ? (effectiveIdx / (months.length - 1)) * 100 : 0;

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

  const hasAnomalyPoints = data?.points.some((p) => p.is_anomaly) ?? false;

  if (!primaryCommodityId) {
    return (
      <div className="flex items-center justify-center h-full">
        <StateView variant="empty" size="inline" icon="list" title="품목을 선택하세요" />
      </div>
    );
  }
  if (isLoading) {
    return <StateView variant="loading" size="large" title="데이터를 불러오는 중…" />;
  }
  if (error) {
    const apiError = error as { code?: string; publicCode?: string; message?: string };
    const code = apiError?.publicCode ?? apiError?.code ?? '';
    if (code === 'COMMODITY_NOT_FOUND') {
      return (
        <StateView
          variant="empty"
          size="large"
          icon="search"
          title="선택한 품목 데이터가 아직 없습니다"
        />
      );
    }
    return (
      <StateView
        variant="error"
        size="large"
        title="데이터를 불러오지 못했습니다"
        description={apiError?.message}
        errorCode={code || undefined}
      />
    );
  }

  if (!data) return null;
  const emptyPoints = data.points.length === 0;

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      {/* 구간 탭 — brand teal active */}
      <div className="flex gap-1 shrink-0">
        {tabs.map((tab) => {
          const isActive = scatterSegment === tab;
          return (
            <button
              key={tab}
              onClick={() => setScatterSegment(tab)}
              className={[
                'h-[30px] px-3.5 rounded-md text-[13px] font-medium',
                'transition-[background-color,border-color,color] duration-fast ease-out border',
                isActive
                  ? 'bg-brand border-brand text-on-brand'
                  : 'bg-subtle border-border-default text-tertiary hover:bg-muted hover:border-border-strong hover:text-secondary',
              ].join(' ')}
            >
              구간 {SEGMENT_DISPLAY[tab]}
            </button>
          );
        })}
      </div>

      {/* 접이식 설명 패널 */}
      <div className="border border-border-default rounded-md bg-surface shrink-0">
        <button
          onClick={() => setIsPanelExpanded((v) => !v)}
          aria-expanded={isPanelExpanded}
          className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-medium text-secondary hover:bg-subtle transition-colors duration-fast rounded-md"
        >
          <span>전달 구조 뷰란?</span>
          <Icon
            name="chevron-down"
            size={14}
            className={`text-tertiary transition-transform duration-default ease-out ${isPanelExpanded ? 'rotate-180' : ''}`}
          />
        </button>
        {isPanelExpanded && (
          <div className="px-4 pb-4 text-[13px] text-secondary leading-[1.625] border-t border-border-subtle pt-3 whitespace-pre-line">
            {`이 그래프는 특정 구간에서 가격이 '얼마나, 어느 방향으로' 전달됐는지를 보여줍니다.

X축: 상류(앞 단계) 가격의 월별 변화율
Y축: 하류(다음 단계) 가격의 월별 변화율
각 점: 1개월 관측치

teal 점선(기준선)에 가까울수록 상류 변화가 그대로 전달된 정상적인 달입니다.
빨간·주황 점은 이상 탐지 시점이며, 클릭하면 분석 수치를 확인할 수 있습니다.

흐름 보기가 '언제 이상이 있었는가'라면,
전달 구조는 '그 이상이 어떤 형태였는가'를 보여줍니다.`}
          </div>
        )}
      </div>

      {/* 차트 + 오버레이 */}
      <div
        className="relative flex-1 min-h-0 bg-surface border border-border-default rounded-xl shadow-e2 overflow-hidden"
        ref={containerRef}
      >
        {emptyPoints && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <StateView
              variant="empty"
              size="large"
              icon="chart-bar-square"
              title="이 기간에는 관측 데이터가 없습니다"
            />
          </div>
        )}

        {!emptyPoints && !hasAnomalyPoints && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 pointer-events-none">
            <StateView
              variant="empty"
              size="chip"
              icon="info"
              title="이 기간에는 이상 탐지 관측치가 없습니다"
            />
          </div>
        )}

        <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="block" />

        {tooltip && tooltip.point.is_anomaly && tooltip.point.confidence_grade && (
          <div
            className="absolute pointer-events-none bg-surface border border-border-default rounded-md px-3 py-2.5 text-[12px] text-primary shadow-e3"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 8,
              minWidth: 160,
              transform:
                tooltip.x > dimensions.width - 180
                  ? 'translateX(-100%) translateX(-24px)'
                  : undefined,
            }}
          >
            <div className="font-semibold mb-1 text-primary">
              {(() => {
                const [y, m] = tooltip.point.period.split('-');
                return `${y}년 ${parseInt(m, 10)}월`;
              })()}
            </div>
            <div className="text-tertiary font-mono">
              X: {tooltip.point.upstream_pct >= 0 ? '+' : ''}
              {tooltip.point.upstream_pct.toFixed(1)}%
            </div>
            <div className="text-tertiary font-mono">
              Y: {tooltip.point.downstream_pct >= 0 ? '+' : ''}
              {tooltip.point.downstream_pct.toFixed(1)}%
            </div>
            <div className="mt-1.5 font-semibold" style={{ color: ANOMALY_COLORS[tooltip.point.confidence_grade] }}>
              {GRADE_LABELS[tooltip.point.confidence_grade]}
            </div>
            {tooltip.point.primary_pattern && (
              <div className="text-tertiary">
                패턴: {PATTERN_LABELS[tooltip.point.primary_pattern] ?? tooltip.point.primary_pattern}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 시점 슬라이더 — brand teal */}
      {months.length > 0 && (
        <div className="shrink-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <IconButton
              aria-label="처음부터 재생"
              onClick={handleReset}
              variant="ghost"
              size="sm"
              icon={<Icon name="rewind" size={14} />}
            />
            {isPlaying ? (
              <IconButton
                aria-label="일시정지"
                onClick={handlePause}
                variant="ghost"
                size="sm"
                icon={
                  <Icon
                    name="pause"
                    size={14}
                    style={{ color: 'var(--brand)' }}
                  />
                }
              />
            ) : (
              <IconButton
                aria-label="재생"
                onClick={handlePlay}
                variant="ghost"
                size="sm"
                icon={
                  <Icon
                    name="play"
                    size={14}
                    style={{ color: 'var(--brand)' }}
                  />
                }
              />
            )}
            <input
              type="range"
              min={0}
              max={months.length - 1}
              value={effectiveIdx}
              onChange={handleSliderChange}
              className="flex-1 h-1.5 rounded-pill cursor-pointer appearance-none"
              style={{
                background: `linear-gradient(to right, var(--brand) 0%, var(--brand) ${progressPct}%, var(--bg-muted) ${progressPct}%, var(--bg-muted) 100%)`,
              }}
              aria-label="시점 슬라이더"
            />
            <span className="text-[12px] font-mono text-secondary w-16 text-right tabular-nums">
              {sliderPosition || data.actual_to}
            </span>
          </div>
          <div className="flex justify-between text-[10px] font-mono text-tertiary px-9">
            <span>{data.actual_from}</span>
            <span>{data.actual_to}</span>
          </div>
        </div>
      )}
    </div>
  );
}
