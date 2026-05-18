import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { useMinimapData, type MinimapVariant } from '@/hooks/useMinimapData';
import { useAppStore } from '@/stores/useAppStore';
import { SEGMENT_COLORS_PRIMARY, RAW_PRICE_COLORS, ANOMALY_COLORS } from '@/utils/colorUtils';
import type {
  StreamMinimapResponse,
  RawPricesMinimapResponse,
  AnomalyDensityItem,
} from '@/types/timeseries';
import type { SegmentId, RawPriceSource } from '@/types/literals';

interface MinimapProps {
  variant: MinimapVariant;
}

const HEIGHT = 64;
// left/right 24px = 양 끝 연도 라벨("2000"/"2026") 잘림 방지 (text-anchor: middle 기준 약 ±10px)
const MARGIN = { top: 8, bottom: 20, left: 24, right: 24 };
const BRUSH_FILL = 'rgba(100, 149, 237, 0.20)';
const BRUSH_STROKE = '#6495ED';
const MIN_BRUSH_MONTHS = 3;
const fmtYM = d3.timeFormat('%Y-%m');

function densityColor(item: AnomalyDensityItem): string | null {
  if (item.high_count > 0) return ANOMALY_COLORS.high;
  if (item.medium_count > 0) return ANOMALY_COLORS.medium;
  if (item.reference_count > 0) return ANOMALY_COLORS.reference;
  return null;
}

function densityOpacity(item: AnomalyDensityItem): number {
  if (item.high_count > 0 || item.medium_count > 0) return 0.12;
  return 0.10;
}

export function Minimap({ variant }: MinimapProps) {
  const { data, isLoading, isError } = useMinimapData(variant);
  const filterFrom = useAppStore((s) => s.filterFrom);
  const filterTo = useAppStore((s) => s.filterTo);
  const setFilterFrom = useAppStore((s) => s.setFilterFrom);
  const setFilterTo = useAppStore((s) => s.setFilterTo);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const brushGroupRef = useRef<SVGGElement | null>(null);
  const xScaleRef = useRef<d3.ScaleTime<number, number> | null>(null);
  const brushRef = useRef<d3.BrushBehavior<unknown> | null>(null);
  const isInternalRef = useRef(false);

  // Refs for latest filter values — avoids including them in render deps
  const filterFromRef = useRef(filterFrom);
  const filterToRef = useRef(filterTo);
  filterFromRef.current = filterFrom;
  filterToRef.current = filterTo;

  const parseEnv = useCallback(
    (s: string | null | undefined) => (s ? d3.timeParse('%Y-%m')(s) : null),
    [],
  );

  const parsePeriod = useCallback(
    (s: string) =>
      variant === 'stream' ? d3.timeParse('%Y')(s) : d3.timeParse('%Y-%m')(s),
    [variant],
  );

  const computeMinPx = useCallback(
    (xScale: d3.ScaleTime<number, number>) => {
      const [d0, d1] = xScale.domain() as [Date, Date];
      const [p0, p1] = xScale.range();
      const threeMonthMs = MIN_BRUSH_MONTHS * 30.44 * 24 * 3600 * 1000;
      return (threeMonthMs / (d1.getTime() - d0.getTime())) * (p1 - p0);
    },
    [],
  );

  // Main render — depends only on data/variant; reads filter via refs
  const render = useCallback(() => {
    if (!data || !svgRef.current || !containerRef.current) return;
    const width = containerRef.current.getBoundingClientRect().width;
    if (width === 0) return; // FE-D3-003

    const innerW = width - MARGIN.left - MARGIN.right;
    const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

    const domainFrom = parseEnv(data.actual_from);
    const domainTo = parseEnv(data.actual_to);
    if (!domainFrom || !domainTo) return;

    const xScale = d3.scaleTime().domain([domainFrom, domainTo]).range([0, innerW]);
    xScaleRef.current = xScale;

    type Pt = { date: Date; value: number };
    type Entry = { key: string; color: string; points: Pt[] };
    let entries: Entry[] = [];

    if (variant === 'stream') {
      const sd = data as StreamMinimapResponse;
      if (!sd.series.some((s) => s.data.length > 0)) {
        showFallback(svgRef.current, width);
        return;
      }
      entries = sd.series.map((s) => ({
        key: s.segment_id,
        color: SEGMENT_COLORS_PRIMARY[s.segment_id as SegmentId] ?? '#94a3b8',
        points: s.data.flatMap((dp) => {
          const date = parsePeriod(dp.period);
          if (!date) return [];
          if (dp.transmission_rate === null) {
            if (!dp.in_warmup_period) {
              console.warn('[Minimap] PARSE-NUM-002: null transmission_rate outside warmup', dp.period);
            }
            return [];
          }
          return [{ date, value: dp.transmission_rate }];
        }),
      }));
    } else {
      const rd = data as RawPricesMinimapResponse;
      if (!rd.series.some((s) => s.data.length > 0)) {
        showFallback(svgRef.current, width);
        return;
      }
      entries = rd.series.map((s) => ({
        key: s.source,
        color: RAW_PRICE_COLORS[s.source as RawPriceSource] ?? '#94a3b8',
        points: s.data.flatMap((dp) => {
          const date = parsePeriod(dp.period);
          if (!date || dp.index_2020 === null) return [];
          return [{ date, value: dp.index_2020 }];
        }),
      }));
    }

    const allVals = entries.flatMap((e) => e.points.map((p) => p.value));
    const [vMin = 0, vMax = 1] = d3.extent(allVals) as [number, number];
    const pad = Math.max(0.05, 0.05 * Math.abs(vMax - vMin));
    const yScale = d3.scaleLinear().domain([vMin - pad, vMax + pad]).range([innerH, 0]);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', HEIGHT);
    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // ① Anomaly density bands
    const density: AnomalyDensityItem[] = data.anomaly_density ?? [];
    const yearMs = 365.25 * 24 * 3600 * 1000;
    density.forEach((item) => {
      const color = densityColor(item);
      if (!color) return;
      const date = parsePeriod(item.period);
      if (!date) return;
      const x0 = Math.max(0, xScale(date));
      const x1 = Math.min(innerW, xScale(new Date(date.getTime() + yearMs)));
      if (x1 <= x0) return;
      g.append('rect')
        .attr('x', x0)
        .attr('y', 0)
        .attr('width', x1 - x0)
        .attr('height', innerH)
        .attr('fill', color)
        .attr('fill-opacity', densityOpacity(item));
    });

    // ② Series curves
    const line = d3
      .line<Pt>()
      .x((p) => xScale(p.date))
      .y((p) => yScale(p.value));

    entries.forEach(({ key, color, points }) => {
      g.append('path')
        .datum(points)
        .attr('class', `series-${key}`)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.3)
        .attr('d', line);
    });

    // ③ X axis
    const years = domainTo.getFullYear() - domainFrom.getFullYear();
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(d3.timeYear.every(years > 10 ? 2 : 1))
      .tickFormat(d3.timeFormat('%Y') as (d: Date | d3.NumberValue) => string)
      .tickSize(3);

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis)
      .call((ax) => ax.select('.domain').remove())
      .call((ax) => ax.selectAll('text').attr('fill', '#64748b').attr('font-size', '9px'));

    // ④ Brush
    const setFrom = setFilterFrom;
    const setTo = setFilterTo;

    const brush = d3.brushX<unknown>()
      .extent([[0, 0], [innerW, innerH]])
      .on('end', (event: d3.D3BrushEvent<unknown>) => {
        if (!event.selection || isInternalRef.current) return;
        const [px0, px1] = event.selection as [number, number];
        const minPx = computeMinPx(xScale);
        let lo = px0;
        let hi = px1;
        if (hi - lo < minPx) {
          const mid = (lo + hi) / 2;
          lo = Math.max(0, mid - minPx / 2);
          hi = Math.min(innerW, lo + minPx);
          lo = Math.max(0, hi - minPx);
        }
        const newFrom = fmtYM(xScale.invert(lo));
        const newTo = fmtYM(xScale.invert(hi));
        if (newFrom === filterFromRef.current && newTo === filterToRef.current) return;
        setFrom(newFrom);
        setTo(newTo);
      });

    brushRef.current = brush;
    const brushG = g.append('g').attr('class', 'minimap-brush');
    brushG.call(brush);
    brushG.select('.selection')
      .attr('fill', BRUSH_FILL)
      .attr('stroke', BRUSH_STROKE)
      .attr('stroke-width', 1);
    brushGroupRef.current = brushG.node() as SVGGElement;

    // Initial brush from store (or full domain)
    const initFrom = parseEnv(filterFromRef.current) ?? domainFrom;
    const initTo = parseEnv(filterToRef.current) ?? domainTo;
    isInternalRef.current = true;
    brushG.call(brush.move, [xScale(initFrom), xScale(initTo)]);
    isInternalRef.current = false;
  }, [data, variant, parsePeriod, parseEnv, computeMinPx, setFilterFrom, setFilterTo]);

  useEffect(() => {
    render();
  }, [render]);

  // Sync brush when filterFrom/filterTo change from outside (zoom, preset, etc.)
  useEffect(() => {
    const xScale = xScaleRef.current;
    const brush = brushRef.current;
    const node = brushGroupRef.current;
    if (!xScale || !brush || !node) return;

    const f = parseEnv(filterFrom);
    const t = parseEnv(filterTo);
    if (!f || !t) return;

    const lo = xScale(f);
    const hi = xScale(t);
    const sel = d3.brushSelection(node) as [number, number] | null;
    if (sel && Math.abs(sel[0] - lo) < 0.5 && Math.abs(sel[1] - hi) < 0.5) return;

    isInternalRef.current = true;
    d3.select(node).call(brush.move, [lo, hi]);
    isInternalRef.current = false;
  }, [filterFrom, filterTo, parseEnv]);

  // ResizeObserver — FE-D3-003
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => render());
    ro.observe(el);
    return () => ro.disconnect();
  }, [render]);

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className="bg-slate-800/30 border border-slate-700/50 rounded-lg flex items-center justify-center"
        style={{ height: HEIGHT }}
      >
        <span className="text-slate-600 text-xs">로딩 중...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        ref={containerRef}
        className="bg-slate-800/30 border border-slate-700/50 rounded-lg flex items-center justify-center"
        style={{ height: HEIGHT }}
      >
        <span className="text-slate-600 text-xs">전체 기간 데이터 없음</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden"
      style={{ height: HEIGHT }}
    >
      <svg ref={svgRef} style={{ display: 'block' }} />
    </div>
  );
}

function showFallback(svg: SVGSVGElement, width: number) {
  const sel = d3.select(svg);
  sel.selectAll('*').remove();
  sel.attr('width', width).attr('height', HEIGHT);
  sel
    .append('text')
    .attr('x', width / 2)
    .attr('y', HEIGHT / 2 + 4)
    .attr('text-anchor', 'middle')
    .attr('fill', '#64748b')
    .attr('font-size', '11px')
    .text('전체 기간 데이터 없음');
}
