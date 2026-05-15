import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAppStore } from '@/stores/useAppStore';
import { useMinimapData, type MinimapVariant } from '@/hooks/useMinimapData';
import { getSegmentColor } from '@/utils/colorUtils';
import type { AnomalyDensityItem, StreamDataPoint } from '@/types/timeseries';

interface MinimapProps {
  variant: MinimapVariant;
}

const TOTAL_HEIGHT = 64;
const MARGIN = { top: 8, bottom: 20, left: 0, right: 0 };

// 이상 밀도 밴드 색상 — feature_spec §3.3 ⑤ (PM 별건 #2 잠정 채택값)
function getAnomalyBandStyle(
  item: AnomalyDensityItem,
): { color: string; opacity: number } | null {
  if (item.high_count > 0) return { color: '#e24b4a', opacity: 0.12 };
  if (item.medium_count > 0) return { color: '#ef9f27', opacity: 0.12 };
  if (item.reference_count > 0) return { color: '#c8d850', opacity: 0.10 };
  return null;
}

export function Minimap({ variant }: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // D3 내부 객체 — 브러시 sync effect에서 재사용
  const brushGroupDomRef = useRef<SVGGElement | null>(null);
  const brushBehaviorRef = useRef<d3.BrushBehavior<unknown> | null>(null);
  const xScaleRef = useRef<d3.ScaleTime<number, number> | null>(null);
  // 브러시를 코드로 이동할 때 brush end 핸들러의 store 갱신을 차단하는 플래그
  const isProgrammaticRef = useRef(false);

  const filterFrom = useAppStore((s) => s.filterFrom);
  const filterTo = useAppStore((s) => s.filterTo);
  const setFilterFrom = useAppStore((s) => s.setFilterFrom);
  const setFilterTo = useAppStore((s) => s.setFilterTo);

  // stale closure 방지용 최신값 ref
  const filterFromRef = useRef(filterFrom);
  const filterToRef = useRef(filterTo);
  useEffect(() => {
    filterFromRef.current = filterFrom;
    filterToRef.current = filterTo;
  }, [filterFrom, filterTo]);

  const [containerWidth, setContainerWidth] = useState(0);

  const { data, isError } = useMinimapData(variant);

  // FE-D3-003: ResizeObserver로 컨테이너 크기 복구 감지 → 재렌더링
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setContainerWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── 메인 D3 렌더링 ──────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!data || !svg || containerWidth === 0) return;

    const { series, anomaly_density, actual_from, actual_to } = data;

    // FE-D3-001: 유효 데이터 없음 → 렌더 중단 (fallback UI가 대신 표시됨)
    const hasData = series.length > 0 && series.some((s) => s.data.length > 0);
    if (!hasData) return;

    const width = containerWidth;
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = TOTAL_HEIGHT - MARGIN.top - MARGIN.bottom;

    const parseYear = d3.timeParse('%Y');
    const parseMonth = d3.timeParse('%Y-%m');
    const formatMonth = d3.timeFormat('%Y-%m');

    const domainStart = parseMonth(actual_from)!;
    const domainEnd = parseMonth(actual_to)!;

    const xScale = d3.scaleTime().domain([domainStart, domainEnd]).range([0, innerWidth]);
    xScaleRef.current = xScale;

    // Y 도메인: 유효한 transmission_rate 전체 범위 (워밍업 제외)
    const allRates = series.flatMap((s) =>
      s.data
        .filter((d) => d.transmission_rate !== null && !d.in_warmup_period)
        .map((d) => d.transmission_rate as number),
    );
    const yMin = allRates.length > 0 ? Math.min(...allRates) : 0;
    const yMax = allRates.length > 0 ? Math.max(...allRates) : 1;
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]);

    // SVG 초기화
    const root = d3.select(svg);
    root.selectAll('*').remove();
    root.attr('width', width).attr('height', TOTAL_HEIGHT);

    const g = root.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // ① 이상 밀도 배경 밴드
    const densityMap = new Map(anomaly_density.map((d) => [d.period, d]));
    const years = d3.timeYear.range(
      d3.timeYear.floor(domainStart),
      d3.timeYear.ceil(domainEnd),
    );
    years.forEach((year) => {
      const yearStr = d3.timeFormat('%Y')(year);
      const item = densityMap.get(yearStr);
      if (!item) return;
      const style = getAnomalyBandStyle(item);
      if (!style) return;
      const x0 = xScale(year);
      const x1 = xScale(d3.timeYear.offset(year, 1));
      g.append('rect')
        .attr('x', x0)
        .attr('y', 0)
        .attr('width', x1 - x0)
        .attr('height', innerHeight)
        .attr('fill', style.color)
        .attr('opacity', style.opacity);
    });

    // ② 구간별 전이율 곡선 (배경, opacity 0.3)
    series.forEach((seriesItem) => {
      const lineGen = d3
        .line<StreamDataPoint>()
        .x((d) => xScale(parseYear(d.period)!))
        .y((d) => yScale(d.transmission_rate as number))
        .defined((d) => {
          if (d.transmission_rate === null) {
            if (!d.in_warmup_period) {
              // PARSE-NUM-002: 연간 집계임에도 null인 비정상 케이스
              console.warn(`[Minimap] PARSE-NUM-002: null transmission_rate at ${d.period}`);
            }
            return false;
          }
          return true;
        });

      g.append('path')
        .datum(seriesItem.data)
        .attr('fill', 'none')
        .attr('stroke', getSegmentColor(seriesItem.segment_id))
        .attr('stroke-opacity', 0.3)
        .attr('stroke-width', 1)
        .attr('d', lineGen);
    });

    // ③ X축 (연도 눈금)
    const yearSpan = domainEnd.getFullYear() - domainStart.getFullYear();
    const tickEvery = yearSpan > 15 ? d3.timeYear.every(2) : d3.timeYear.every(1);
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(tickEvery)
      .tickFormat(d3.timeFormat('%Y') as (d: Date | d3.NumberValue) => string);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((ax) => {
        ax.select('.domain').remove();
        ax.selectAll('.tick line').attr('stroke', '#475569').attr('stroke-opacity', 0.5);
        ax.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '10px');
      });

    // ④ d3.brushX() 뷰포트 박스
    const brushGroup = g.append('g');
    brushGroupDomRef.current = brushGroup.node();

    // 최소 박스 너비: 3개월에 해당하는 픽셀
    const totalMs = domainEnd.getTime() - domainStart.getTime();
    const threeMonthMs = 3 * 30.44 * 24 * 60 * 60 * 1000;
    const minBrushPx = (threeMonthMs / totalMs) * innerWidth;

    const brush = d3
      .brushX()
      .extent([
        [0, 0],
        [innerWidth, innerHeight],
      ])
      .on('end', (event: d3.D3BrushEvent<unknown>) => {
        if (isProgrammaticRef.current) return;
        if (!event.selection) return;

        let [x0, x1] = event.selection as [number, number];

        // 최소 너비 클램프
        if (x1 - x0 < minBrushPx) {
          x1 = Math.min(x0 + minBrushPx, innerWidth);
          x0 = x1 - minBrushPx;
          isProgrammaticRef.current = true;
          d3.select(brushGroupDomRef.current!).call(brush.move, [x0, x1]);
          isProgrammaticRef.current = false;
        }

        const newFrom = formatMonth(xScale.invert(x0));
        const newTo = formatMonth(xScale.invert(x1));

        // 무한 루프 방지: 값이 실제로 바뀐 경우에만 store 갱신
        if (newFrom !== filterFromRef.current || newTo !== filterToRef.current) {
          setFilterFrom(newFrom);
          setFilterTo(newTo);
        }
      });

    brushBehaviorRef.current = brush;
    brushGroup.call(brush);

    // 브러시 스타일
    brushGroup
      .select('.selection')
      .attr('fill', 'rgba(100, 149, 237, 0.20)')
      .attr('stroke', '#6495ED')
      .attr('stroke-width', 1);
    brushGroup.selectAll<SVGElement, unknown>('.handle').attr('fill', '#6495ED');

    // store의 현재 기간으로 초기 브러시 위치 설정
    const initFrom = filterFromRef.current;
    const initTo = filterToRef.current;
    if (initFrom && initTo) {
      const pFrom = parseMonth(initFrom);
      const pTo = parseMonth(initTo);
      if (pFrom && pTo) {
        isProgrammaticRef.current = true;
        brushGroup.call(brush.move, [xScale(pFrom), xScale(pTo)]);
        isProgrammaticRef.current = false;
      }
    }
  }, [data, containerWidth, setFilterFrom, setFilterTo]);

  // ── 브러시 위치 동기화 (store → brush) ──────────────────────
  // 메인 차트 휠 줌 등 외부에서 filterFrom/filterTo가 바뀔 때 뷰포트 박스 위치 갱신
  useEffect(() => {
    const brush = brushBehaviorRef.current;
    const groupDom = brushGroupDomRef.current;
    const xScale = xScaleRef.current;
    if (!brush || !groupDom || !xScale) return;
    if (!filterFrom || !filterTo) return;

    const parseMonth = d3.timeParse('%Y-%m');
    const pFrom = parseMonth(filterFrom);
    const pTo = parseMonth(filterTo);
    if (!pFrom || !pTo) return;

    isProgrammaticRef.current = true;
    d3.select(groupDom).call(brush.move, [xScale(pFrom), xScale(pTo)]);
    isProgrammaticRef.current = false;
  }, [filterFrom, filterTo]);

  // ── FE-D3-001 / API 오류 fallback ────────────────────────────
  const hasData =
    data && data.series.length > 0 && data.series.some((s) => s.data.length > 0);

  if (isError || (data && !hasData)) {
    return (
      <div
        className="flex items-center justify-center bg-slate-800/30 border border-slate-700/50 rounded-lg"
        style={{ height: TOTAL_HEIGHT }}
      >
        <span className="text-slate-500 text-xs">전체 기간 데이터 없음</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height: TOTAL_HEIGHT }}>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
