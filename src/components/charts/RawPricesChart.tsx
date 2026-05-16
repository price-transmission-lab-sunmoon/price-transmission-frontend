import { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { useRawPricesData } from '@/hooks/useRawPricesData';
import { useAppStore } from '@/stores/useAppStore';
import { ApiError } from '@/api/error';
import { RAW_PRICE_COLORS, ANOMALY_COLORS, ANOMALY_RADII } from '@/utils/colorUtils';
import type { RawPriceAnomalyNode, RawPriceDataPoint } from '@/types/timeseries';
import type { RawPriceSource } from '@/types/literals';

// ── Constants ──────────────────────────────────────────────────
const MARGIN = { top: 24, right: 32, bottom: 40, left: 64 };
const OVERLAY_COLOR = '#64748b';
const OVERLAY_DASH = '4,3';
const GRID_OPACITY = 0.3;
const BASELINE_Y = 100;
const TOAST_LAYOUT4 = '이 품목은 도매가 데이터가 없어 레이아웃 1로 전환합니다.';
const TOAST_INVALID = '잘못된 레이아웃 번호입니다. 레이아웃 1로 전환합니다.';
const GRADE_LABEL: Record<string, string> = {
  high: '고신뢰',
  medium: '중신뢰',
  reference: '참고',
};
const PATTERN_LABEL: Record<string, string> = {
  pattern1: '패턴1: 비대칭',
  pattern2: '패턴2: 과대',
  pattern3: '패턴3: 깃털',
};
const SOURCES_ALL: RawPriceSource[] = [
  'intl_price_krw',
  'import_price',
  'ppi',
  'wholesale_price',
  'cpi',
];
const SOURCE_LABEL: Record<RawPriceSource, string> = {
  intl_price_krw: '국제가 (원화)',
  import_price: '수입단가',
  ppi: 'PPI',
  wholesale_price: '도매가',
  cpi: 'CPI',
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
      if (
        error.code === 'WHOLESALE_NOT_AVAILABLE' ||
        error.code === 'INVALID_LAYOUT'
      ) {
        fallbackHandledRef.current = true;
        setToast(error.code === 'WHOLESALE_NOT_AVAILABLE' ? TOAST_LAYOUT4 : TOAST_INVALID);
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
        .attr('fill', ev.color_hex ?? '#94a3b8')
        .attr('fill-opacity', 0.08);
    });

    // ② Grid lines
    const yGridTicks = yScale.ticks(6);
    clipped.append('g').attr('class', 'grid-y')
      .selectAll('line')
      .data(yGridTicks)
      .join('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', (d) => yScale(d)).attr('y2', (d) => yScale(d))
      .attr('stroke', '#94a3b8').attr('stroke-opacity', GRID_OPACITY)
      .attr('stroke-dasharray', '2,3');

    const xGridTicks = xScale.ticks(8);
    clipped.append('g').attr('class', 'grid-x')
      .selectAll('line')
      .data(xGridTicks)
      .join('line')
      .attr('x1', (d) => xScale(d)).attr('x2', (d) => xScale(d))
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', '#94a3b8').attr('stroke-opacity', GRID_OPACITY)
      .attr('stroke-dasharray', '2,3');

    // ③ Baseline y=100
    const baselineY = yScale(BASELINE_Y);
    if (baselineY >= 0 && baselineY <= innerH) {
      clipped.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', baselineY).attr('y2', baselineY)
        .attr('stroke', '#94a3b8').attr('stroke-opacity', 0.5).attr('stroke-width', 1.5);
    }

    // ④ Source curves
    const line = d3
      .line<RawPriceDataPoint>()
      .defined((dp) => dp.index_2020 !== null)
      .x((dp) => xScale(parseYM(dp.period) ?? new Date()))
      .y((dp) => yScale(dp.index_2020 as number));

    const activeSources = layoutNumber === 1
      ? data.series.filter((s) => enabledSources.has(s.source))
      : data.series;

    activeSources.forEach((s) => {
      clipped.append('path')
        .datum(s.data)
        .attr('fill', 'none')
        .attr('stroke', RAW_PRICE_COLORS[s.source] ?? '#94a3b8')
        .attr('stroke-width', 2)
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

      // Find Y position: use the first matching series data point
      const matchSeries = data.series[0];
      const matchPt = matchSeries?.data.find((dp) => dp.period === node.period);
      const yVal = matchPt?.index_2020 ?? BASELINE_Y;
      const py = yScale(yVal);

      const r = ANOMALY_RADII[node.confidence_grade];
      const color = ANOMALY_COLORS[node.confidence_grade];

      // Glow filter for high/medium
      if (node.confidence_grade === 'high' || node.confidence_grade === 'medium') {
        const filterId = `glow-${node.anomaly_id}`;
        const defs = svg.select('defs');
        const filter = defs.append('filter').attr('id', filterId).attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
        filter.append('feGaussianBlur').attr('stdDeviation', node.confidence_grade === 'high' ? 3 : 2).attr('result', 'blur');
        filter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

        nodeG.append('circle')
          .attr('cx', px).attr('cy', py)
          .attr('r', r + 3)
          .attr('fill', color)
          .attr('opacity', 0.25)
          .attr('filter', `url(#${filterId})`);
      }

      const circle = nodeG.append('circle')
        .attr('cx', px).attr('cy', py)
        .attr('r', r)
        .attr('fill', color)
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 1)
        .attr('cursor', 'pointer');

      // NEW badge
      if (node.is_new) {
        nodeG.append('text')
          .attr('x', px)
          .attr('y', py - r - 4)
          .attr('text-anchor', 'middle')
          .attr('fill', color)
          .attr('font-size', '8px')
          .attr('font-weight', 'bold')
          .text('NEW');
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
      .tickFormat(d3.timeFormat('%Y-%m') as (d: Date | d3.NumberValue) => string);
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis)
      .call((ax) => ax.selectAll('text').attr('fill', '#94a3b8').attr('font-size', '10px'));

    const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat((d) => String(d));
    g.append('g')
      .call(yAxis)
      .call((ax) => ax.selectAll('text').attr('fill', '#94a3b8').attr('font-size', '10px'));

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -MARGIN.left + 16)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
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

  // ResizeObserver — FE-D3-003
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => render());
    ro.observe(el);
    return () => ro.disconnect();
  }, [render]);

  // ── Render ─────────────────────────────────────────────────
  if (isLoading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        데이터 로딩 중...
      </div>
    );
  }

  // Error state (non-layout errors)
  if (error && !(error instanceof ApiError && ['WHOLESALE_NOT_AVAILABLE', 'INVALID_LAYOUT'].includes((error as ApiError).code))) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        데이터를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Layout 1 source toggles */}
      {layoutNumber === 1 && data && (
        <div className="flex items-center gap-2 flex-wrap px-1">
          {SOURCES_ALL.map((src) => {
            const color = RAW_PRICE_COLORS[src];
            const active = enabledSources.has(src);
            return (
              <button
                key={src}
                onClick={() => toggleSource(src)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-opacity"
                style={{
                  borderColor: color,
                  color: active ? color : '#64748b',
                  opacity: active ? 1 : 0.4,
                }}
              >
                <span
                  className="inline-block w-3 h-0.5 rounded"
                  style={{ backgroundColor: active ? color : '#64748b' }}
                />
                {SOURCE_LABEL[src]}
              </button>
            );
          })}
        </div>
      )}

      {/* Main chart area */}
      <div ref={containerRef} className="flex-1 relative min-h-0">
        {data && data.series.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
            이 기간에는 데이터가 없습니다.
          </div>
        )}
        <svg ref={svgRef} className="w-full h-full" />

        {/* Anomaly hover tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-50 bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-xs text-slate-200 shadow-lg"
            style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
          >
            <div className="font-medium mb-1">
              {(() => {
                const d = parseYM(tooltip.node.period);
                return d ? `${d.getFullYear()}년 ${d.getMonth() + 1}월` : tooltip.node.period;
              })()}
            </div>
            <div className="text-slate-400">{GRADE_LABEL[tooltip.node.confidence_grade] ?? tooltip.node.confidence_grade}</div>
            <div className="text-slate-400">{PATTERN_LABEL[tooltip.node.primary_pattern] ?? tooltip.node.primary_pattern}</div>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-700 border border-slate-500 text-white text-sm px-5 py-2.5 rounded-lg shadow-xl pointer-events-none">
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
    .attr('fill', '#64748b')
    .attr('font-size', '13px')
    .text('이 기간에는 데이터가 없습니다.');
}

const MIN_BRUSH_MONTHS = 3;
