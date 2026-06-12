import { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { useRawPricesData } from '@/hooks/useRawPricesData';
import { useAppStore } from '@/stores/useAppStore';
import { ApiError } from '@/api/error';
import { confidenceLabel } from '@/services/anomaly';
import { RAW_PRICE_COLORS, ANOMALY_COLORS, ANOMALY_RADII } from '@/utils/colorUtils';
import { CHART_THEME } from '@/utils/chartTheme';
import { Z_INDEX } from '@/utils/zIndex';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { StateView } from '@/components/ui/StateView';
import type { RawPriceAnomalyNode, RawPriceDataPoint } from '@/types/timeseries';
import type { RawPriceSource, SegmentId } from '@/types/literals';

const Z_INDEX_TOAST_INLINE = Z_INDEX.TOAST;

// 이상 노드 Y 매핑 — segment_id 별 하류 소스 (spec §3.3 ⑤ "segment_id의 하류 소스 곡선 위에 표시").
// 매핑이 없거나 응답에 해당 소스가 없으면 BASELINE_Y(=100)로 폴백.
const SEGMENT_TO_DOWNSTREAM_SOURCE: Record<SegmentId, RawPriceSource> = {
  A: 'ppi',
  B: 'wholesale_price',
  C: 'wholesale_price',
  D: 'cpi',
  D_prime: 'cpi',
};

// ── Constants ──────────────────────────────────────────────────
const MARGIN = { top: 24, right: 32, bottom: 40, left: 64 };
const OVERLAY_COLOR = CHART_THEME.axisText;
const OVERLAY_DASH = '4,3';
const BASELINE_Y = 100;
const TOAST_LAYOUT4 = '이 품목은 도매가 데이터가 없어 레이아웃 1로 전환합니다.';
const TOAST_INVALID = '잘못된 레이아웃 번호입니다. 레이아웃 1로 전환합니다.';
// 신뢰도 라벨은 services/anomaly.ts confidenceLabel() 단일 출처 사용 (중복 제거).
const PATTERN_LABEL: Record<string, string> = {
  pattern1: '패턴1: 비대칭',
  pattern2: '패턴2: 과대',
  pattern3: '패턴3: 깃털',
};
const SOURCES_ALL: RawPriceSource[] = [
  'intl_price_krw',
  'import_price_usd',
  'ppi',
  'wholesale_price',
  'cpi',
];
// 백엔드 _SOURCE_META 正本(ed79246) 그대로 표시.
const SOURCE_LABEL: Record<RawPriceSource, string> = {
  intl_price_krw: '국제가 (원화 환산)',
  import_price_usd: '수입단가',
  ppi: '생산자물가지수 (PPI)',
  wholesale_price: '도매가격',
  cpi: '소비자물가지수 (CPI)',
};

const parseYM = d3.timeParse('%Y-%m');
const fmtYM = d3.timeFormat('%Y-%m');

export function RawPricesChart() {
  const { data, error, isLoading } = useRawPricesData();
  const layoutNumber = useAppStore((s) => s.layoutNumber);
  const setLayoutNumber = useAppStore((s) => s.setLayoutNumber);
  const filterFrom = useAppStore((s) => s.filterFrom);
  const filterTo = useAppStore((s) => s.filterTo);
  const setFilterFrom = useAppStore((s) => s.setFilterFrom);
  const setFilterTo = useAppStore((s) => s.setFilterTo);
  const confidenceFilter = useAppStore((s) => s.confidenceFilter);
  const eventFilter = useAppStore((s) => s.eventFilter);
  const events = useAppStore((s) => s.events);
  const selectAnomaly = useAppStore((s) => s.selectAnomaly);
  const commodities = useAppStore((s) => s.commodities);
  const primaryCommodityId = useAppStore((s) => s.primaryCommodityId);
  const primaryCommodity = commodities.find((c) => c.commodity_id === primaryCommodityId);
  const hasWholesale = primaryCommodity?.has_wholesale ?? true;

  // Local state for layout-1 source toggle and toast
  const [enabledSources, setEnabledSources] = useState<Set<RawPriceSource>>(
    new Set(SOURCES_ALL),
  );
  const [toast, setToast] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    node: RawPriceAnomalyNode;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const xScaleRef = useRef<d3.ScaleTime<number, number> | null>(null);
  const fallbackHandledRef = useRef(false);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Error handling — WHOLESALE_NOT_AVAILABLE / INVALID_LAYOUT
  useEffect(() => {
    if (!error) {
      fallbackHandledRef.current = false;
      return;
    }
    if (fallbackHandledRef.current) return;
    if (error instanceof ApiError) {
      const pc = error.publicCode;
      if (pc === 'WHOLESALE_NOT_AVAILABLE' || pc === 'INVALID_LAYOUT') {
        fallbackHandledRef.current = true;
        setToast(pc === 'WHOLESALE_NOT_AVAILABLE' ? TOAST_LAYOUT4 : TOAST_INVALID);
        if (layoutNumber !== 1) setLayoutNumber(1);
      }
    }
  }, [error, layoutNumber, setLayoutNumber]);

  const toggleSource = useCallback((src: RawPriceSource) => {
    setEnabledSources((prev) => {
      const next = new Set(prev);
      if (next.has(src)) next.delete(src);
      else next.add(src);
      return next;
    });
  }, []);

  const render = useCallback(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.getBoundingClientRect().width;
    const height = container.getBoundingClientRect().height;
    if (width === 0 || height === 0) return; // FE-D3-003

    const innerW = width - MARGIN.left - MARGIN.right;
    const innerH = height - MARGIN.top - MARGIN.bottom;

    // Build X domain from filterFrom/filterTo or from data extent
    const allPeriods = data.series.flatMap((s) => s.data.map((dp) => dp.period));
    const allDates = allPeriods.map((p) => parseYM(p)).filter((d): d is Date => d !== null);

    const rawFrom = parseYM(filterFrom ?? '') ?? d3.min(allDates) ?? new Date();
    const rawTo = parseYM(filterTo ?? '') ?? d3.max(allDates) ?? new Date();

    const xScale = d3.scaleTime().domain([rawFrom, rawTo]).range([0, innerW]);
    xScaleRef.current = xScale;

    // Y scale from index_2020 values
    const allIdx = data.series
      .flatMap((s) => s.data.map((dp) => dp.index_2020))
      .filter((v): v is number => v !== null);
    if (allIdx.length === 0) {
      renderEmpty(svgRef.current, width, height);
      return;
    }
    const [yMin = 0, yMax = 200] = d3.extent(allIdx) as [number, number];
    const yPad = (yMax - yMin) * 0.1;
    const yScale = d3.scaleLinear()
      .domain([Math.min(yMin - yPad, BASELINE_Y - 5), yMax + yPad])
      .range([innerH, 0]);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Clip path
    svg.append('defs').append('clipPath').attr('id', 'raw-chart-clip')
      .append('rect').attr('width', innerW).attr('height', innerH);
    const clipped = g.append('g').attr('clip-path', 'url(#raw-chart-clip)');

    // ① Event overlays
    const visibleEvents = events.filter((ev) => eventFilter.includes(ev.event_key));
    visibleEvents.forEach((ev) => {
      const evFrom = parseYM(ev.start_date);
      const evTo = parseYM(ev.end_date);
      if (!evFrom || !evTo) return;
      const x0 = xScale(evFrom);
      const x1 = xScale(evTo);
      if (x1 < 0 || x0 > innerW) return;
      clipped.append('rect')
        .attr('x', Math.max(0, x0))
        .attr('y', 0)
        .attr('width', Math.max(0, Math.min(innerW, x1) - Math.max(0, x0)))
        .attr('height', innerH)
        .attr('fill', ev.color_hex ?? CHART_THEME.axisText)
        .attr('fill-opacity', 0.08);
    });

    // ② Grid lines — Observable solid horizontal only
    const yGridTicks = yScale.ticks(6);
    clipped.append('g').attr('class', 'grid-y')
      .selectAll('line')
      .data(yGridTicks)
      .join('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', (d) => yScale(d)).attr('y2', (d) => yScale(d))
      .attr('stroke', CHART_THEME.gridLine);

    // ③ Baseline y=100 with right-aligned label
    const baselineY = yScale(BASELINE_Y);
    if (baselineY >= 0 && baselineY <= innerH) {
      clipped.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', baselineY).attr('y2', baselineY)
        .attr('stroke', CHART_THEME.axisText)
        .attr('stroke-opacity', 0.4)
        .attr('stroke-width', 1.25)
        .attr('stroke-dasharray', '4,4');
      clipped.append('text')
        .attr('x', innerW - 4)
        .attr('y', baselineY - 4)
        .attr('text-anchor', 'end')
        .attr('font-size', 10)
        .attr('font-family', CHART_THEME.fontFamilyMono)
        .attr('fill', CHART_THEME.axisText)
        .text('기준 (100)');
    }

    // ④ Source curves with Observable-style area gradient
    const line = d3
      .line<RawPriceDataPoint>()
      .defined((dp) => dp.index_2020 !== null)
      .x((dp) => xScale(parseYM(dp.period) ?? new Date()))
      .y((dp) => yScale(dp.index_2020 as number))
      .curve(d3.curveMonotoneX);

    const area = d3
      .area<RawPriceDataPoint>()
      .defined((dp) => dp.index_2020 !== null)
      .x((dp) => xScale(parseYM(dp.period) ?? new Date()))
      .y0(innerH)
      .y1((dp) => yScale(dp.index_2020 as number))
      .curve(d3.curveMonotoneX);

    const activeSources = layoutNumber === 1
      ? data.series.filter((s) => enabledSources.has(s.source))
      : data.series;

    const defs = svg.select('defs');
    activeSources.forEach((s) => {
      const color = RAW_PRICE_COLORS[s.source] ?? CHART_THEME.axisText;
      const gradId = `raw-area-${s.source}`;
      const grad = defs
        .append('linearGradient')
        .attr('id', gradId)
        .attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
      grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.12);
      grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);
      clipped.append('path').datum(s.data).attr('fill', `url(#${gradId})`).attr('d', area);
      clipped.append('path')
        .datum(s.data)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.75)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('d', line);
    });

    // ⑤ Transmission overlay (layouts 2–6)
    if (layoutNumber !== 1 && data.transmission_overlay.length > 0) {
      const overlayLine = d3
        .line<{ period: string; transmission_rate: number | null }>()
        .defined((dp) => dp.transmission_rate !== null)
        .x((dp) => xScale(parseYM(dp.period) ?? new Date()))
        .y((dp) => yScale(dp.transmission_rate as number));
      data.transmission_overlay.forEach((ov) => {
        clipped.append('path')
          .datum(ov.data)
          .attr('fill', 'none')
          .attr('stroke', OVERLAY_COLOR)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', OVERLAY_DASH)
          .attr('opacity', 0.7)
          .attr('d', overlayLine);
      });
    }

    // ⑥ Anomaly nodes
    const visibleNodes = data.anomaly_nodes.filter((n) =>
      confidenceFilter.includes(n.confidence_grade),
    );

    const nodeG = clipped.append('g').attr('class', 'anomaly-nodes');

    visibleNodes.forEach((node) => {
      const date = parseYM(node.period);
      if (!date) return;
      const px = xScale(date);
      if (px < 0 || px > innerW) return;

      // Y 위치: segment_id → 하류 소스 매핑 (spec §3.3 ⑤). 매핑 series가 없거나
      // 해당 period 데이터가 없으면 다른 series에서 period 일치 데이터 탐색 후 BASELINE_Y 폴백.
      const downstream = SEGMENT_TO_DOWNSTREAM_SOURCE[node.segment_id];
      const matchSeries =
        data.series.find((s) => s.source === downstream) ??
        data.series.find((s) => s.data.some((dp) => dp.period === node.period));
      const matchPt = matchSeries?.data.find((dp) => dp.period === node.period);
      const yVal = matchPt?.index_2020 ?? BASELINE_Y;
      const py = yScale(yVal);

      const r = ANOMALY_RADII[node.confidence_grade];
      const color = ANOMALY_COLORS[node.confidence_grade];

      const isReference = node.confidence_grade === 'reference';

      // Pulse halo — high only, CSS @keyframes (no SVG <animate>)
      if (node.confidence_grade === 'high') {
        nodeG.append('circle')
          .attr('class', 'anomaly-pulse-high')
          .attr('cx', px).attr('cy', py)
          .attr('r', r + 3)
          .attr('fill', color)
          .style('pointer-events', 'none');
      }

      // White ring separator (filled grades only)
      if (!isReference) {
        nodeG.append('circle')
          .attr('cx', px).attr('cy', py)
          .attr('r', r + 2.5)
          .attr('fill', 'var(--bg-surface)')
          .style('pointer-events', 'none');
      }

      // Main dot — reference = outline-only
      const circle = nodeG.append('circle')
        .attr('cx', px).attr('cy', py)
        .attr('r', r)
        .attr('fill', isReference ? 'var(--bg-surface)' : color)
        .attr('stroke', isReference ? color : 'transparent')
        .attr('stroke-width', isReference ? 2 : 0)
        .attr('cursor', 'pointer');

      // NEW dot top-right
      if (node.is_new) {
        nodeG.append('circle')
          .attr('cx', px + r + 1)
          .attr('cy', py - r - 1)
          .attr('r', 2.5)
          .attr('fill', 'var(--warning)')
          .attr('stroke', 'var(--bg-surface)')
          .attr('stroke-width', 1)
          .style('pointer-events', 'none');
      }

      // Click handler
      circle.on('click', () => selectAnomaly(node.anomaly_id));

      // Hover — use synthetic React state via stored callback refs
      circle
        .on('mouseenter', (event: MouseEvent) => {
          const rect = (svgRef.current as SVGSVGElement).getBoundingClientRect();
          setTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            node,
          });
        })
        .on('mouseleave', () => setTooltip(null));
    });

    // ⑦ Axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(8)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(d3.timeFormat('%Y-%m') as (d: Date | d3.NumberValue) => string);
    const xAxisG = g
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis);
    xAxisG.selectAll('text')
      .attr('fill', CHART_THEME.axisText)
      .attr('font-size', CHART_THEME.fontSize)
      .attr('font-family', CHART_THEME.fontFamilyMono);
    xAxisG.select('.domain').attr('stroke', CHART_THEME.axisLine);

    const yAxis = d3.axisLeft(yScale).ticks(6).tickSize(0).tickPadding(10).tickFormat((d) => String(d));
    const yAxisG = g.append('g').call(yAxis);
    yAxisG.selectAll('text')
      .attr('fill', CHART_THEME.axisText)
      .attr('font-size', CHART_THEME.fontSize)
      .attr('font-family', CHART_THEME.fontFamilyMono);
    yAxisG.select('.domain').remove();

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -MARGIN.left + 16)
      .attr('text-anchor', 'middle')
      .attr('fill', CHART_THEME.axisText)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('letter-spacing', '0.08em')
      .attr('font-family', CHART_THEME.fontFamilyMono)
      .text('지수 (2020=100)');

    // ⑧ Wheel zoom
    const svgEl = svgRef.current as SVGSVGElement;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svgEl.getBoundingClientRect();
      const mouseX = event.clientX - rect.left - MARGIN.left;
      const [d0, d1] = xScale.domain() as [Date, Date];
      const rangeMs = d1.getTime() - d0.getTime();
      const minMs = MIN_BRUSH_MONTHS * 30.44 * 24 * 3600 * 1000;
      const zoomFactor = event.deltaY < 0 ? 0.75 : 1.33;
      const newRangeMs = Math.max(minMs, rangeMs * zoomFactor);
      const focusDate = xScale.invert(mouseX);
      const ratio = Math.max(0, Math.min(1, (focusDate.getTime() - d0.getTime()) / rangeMs));
      const newFrom = new Date(focusDate.getTime() - ratio * newRangeMs);
      const newTo = new Date(focusDate.getTime() + (1 - ratio) * newRangeMs);
      setFilterFrom(fmtYM(newFrom));
      setFilterTo(fmtYM(newTo));
    };

    svgEl.addEventListener('wheel', handleWheel, { passive: false });

    // ⑨ Double-click zoom 2x
    const handleDblClick = (event: MouseEvent) => {
      const rect = svgEl.getBoundingClientRect();
      const mouseX = event.clientX - rect.left - MARGIN.left;
      const [d0, d1] = xScale.domain() as [Date, Date];
      const rangeMs = d1.getTime() - d0.getTime();
      const newRangeMs = rangeMs / 2;
      const focusDate = xScale.invert(mouseX);
      const newFrom = new Date(focusDate.getTime() - newRangeMs / 2);
      const newTo = new Date(focusDate.getTime() + newRangeMs / 2);
      setFilterFrom(fmtYM(newFrom));
      setFilterTo(fmtYM(newTo));
    };

    svgEl.addEventListener('dblclick', handleDblClick);

    return () => {
      svgEl.removeEventListener('wheel', handleWheel);
      svgEl.removeEventListener('dblclick', handleDblClick);
    };
  }, [
    data,
    layoutNumber,
    enabledSources,
    filterFrom,
    filterTo,
    confidenceFilter,
    eventFilter,
    events,
    selectAnomaly,
    setFilterFrom,
    setFilterTo,
  ]);

  useEffect(() => {
    const cleanup = render();
    return cleanup;
  }, [render]);

  // ResizeObserver + rAF retry — mount 직후 size 0이면 render() bail, ResizeObserver
  // 첫 fire도 0 가능. 양쪽 0이면 영영 안 그려짐 (다른 탭 갔다 돌아와야 풀리는 회귀).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const trySync = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) {
        render();
      } else {
        raf = requestAnimationFrame(trySync);
      }
    };
    trySync();
    const ro = new ResizeObserver(() => render());
    ro.observe(el);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [render]);

  // CLAUDE.md §StreamChart 방어 패턴: 컨테이너 항상 mount. loading/error는 overlay로.
  const showLoadingOverlay = isLoading && !data;
  const showErrorOverlay =
    error &&
    !(
      error instanceof ApiError &&
      ['WHOLESALE_NOT_AVAILABLE', 'INVALID_LAYOUT'].includes((error as ApiError).publicCode)
    );

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Layout 1 source toggles — 5 sources with color identity */}
      {layoutNumber === 1 && data && (
        <div className="flex items-center gap-2 flex-wrap">
          {SOURCES_ALL.map((src) => {
            const color = RAW_PRICE_COLORS[src];
            const active = enabledSources.has(src);
            const disabled = src === 'wholesale_price' && !hasWholesale;
            return (
              <button
                key={src}
                onClick={() => !disabled && toggleSource(src)}
                disabled={disabled}
                aria-disabled={disabled}
                title={
                  disabled
                    ? '이 품목은 도매가 데이터가 없습니다'
                    : undefined
                }
                className={[
                  'inline-flex items-center gap-2 h-7 px-3 rounded-md text-[12px] font-medium',
                  'border transition-[background-color,border-color,color] duration-fast ease-out',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                ].join(' ')}
                style={{
                  borderColor: active && !disabled ? color : 'var(--border-default)',
                  background: active && !disabled ? `${color}1f` : 'transparent',
                  color: active && !disabled ? color : 'var(--text-tertiary)',
                }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: color }}
                />
                {SOURCE_LABEL[src]}
              </button>
            );
          })}
        </div>
      )}

      {/* Main chart area */}
      <div
        ref={containerRef}
        className="flex-1 relative min-h-0 bg-surface border border-border-default rounded-xl shadow-e2 overflow-hidden"
      >
        <svg ref={svgRef} className="w-full h-full" />

        {/* loading overlay */}
        {showLoadingOverlay && (
          <div className="absolute inset-0">
            <StateView variant="loading" size="large" title="데이터를 불러오는 중…" />
          </div>
        )}

        {/* error overlay */}
        {showErrorOverlay && (
          <div className="absolute inset-0 flex items-center justify-center">
            <StateView
              variant="error"
              size="large"
              title="데이터를 불러오지 못했습니다"
              description="잠시 후 다시 시도해주세요."
            />
          </div>
        )}

        {/* 백엔드 데이터 미적재 안내 — warning 카드 (spec §4.5) */}
        {!showLoadingOverlay && !showErrorOverlay && data && (data.total_points === 0 || data.series.every((s) => s.data.length === 0)) && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none p-6">
            <div className="flex flex-col items-center gap-3 px-8 py-7 max-w-[420px] text-center bg-surface border border-warning-border rounded-lg shadow-e3 pointer-events-auto">
              <div className="w-16 h-16 rounded-full bg-warning-subtle flex items-center justify-center text-warning">
                <Icon name="database" size={32} />
              </div>
              <Badge tone="warning" size="sm" uppercase>
                구현 대기
              </Badge>
              <p className="text-[14px] font-semibold text-primary m-0">
                원시 시계열 데이터가 아직 DB에 적재되지 않았습니다
              </p>
              <p className="text-[13px] text-secondary leading-[1.625] m-0">
                파이프라인 Phase 0 결과물(국제가·수입단가·PPI·CPI)이
                적재된 후 자동으로 표시됩니다.
              </p>
              <div className="w-full border-t border-border-subtle pt-3 mt-1">
                <p className="text-[12px] text-tertiary m-0">
                  흐름 보기 / 전달 구조 탭은 정상 작동합니다.
                </p>
              </div>
            </div>
          </div>
        )}
        {!showLoadingOverlay && !showErrorOverlay && data && data.series.length === 0 && data.total_points !== 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <StateView
              variant="empty"
              size="large"
              title="이 기간에는 데이터가 없습니다"
              description="필터 기간을 넓혀보세요."
            />
          </div>
        )}

        {/* Anomaly hover tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-surface border border-border-default rounded-md px-3 py-2.5 text-[12px] text-primary shadow-e3"
            style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
          >
            <div className="font-semibold mb-1">
              {(() => {
                const d = parseYM(tooltip.node.period);
                return d ? `${d.getFullYear()}년 ${d.getMonth() + 1}월` : tooltip.node.period;
              })()}
            </div>
            <div className="text-tertiary">{confidenceLabel(tooltip.node.confidence_grade)}</div>
            <div className="text-tertiary">{PATTERN_LABEL[tooltip.node.primary_pattern] ?? tooltip.node.primary_pattern}</div>
          </div>
        )}
      </div>

      {/* Toast notification — inline (showToast 마이그레이션은 후속) */}
      {toast && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 bg-surface border border-warning-border text-secondary text-[13px] px-5 py-3 rounded-lg shadow-e4 pointer-events-none"
          style={{ zIndex: Z_INDEX_TOAST_INLINE }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function renderEmpty(svg: SVGSVGElement, width: number, height: number) {
  const sel = d3.select(svg);
  sel.selectAll('*').remove();
  sel.attr('width', width).attr('height', height);
  sel
    .append('text')
    .attr('x', width / 2)
    .attr('y', height / 2 + 4)
    .attr('text-anchor', 'middle')
    .attr('fill', CHART_THEME.axisText)
    .attr('font-size', '13px')
    .text('이 기간에는 데이터가 없습니다.');
}

const MIN_BRUSH_MONTHS = 3;
