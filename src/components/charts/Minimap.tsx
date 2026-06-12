import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { useMinimapData, type MinimapVariant } from '@/hooks/useMinimapData';
import { useAppStore } from '@/stores/useAppStore';
import { SEGMENT_COLORS_PRIMARY, RAW_PRICE_COLORS, ANOMALY_COLORS } from '@/utils/colorUtils';
import { CHART_THEME } from '@/utils/chartTheme';
import type {
  AnomalyDensityItem,
  StreamSeriesItem,
  RawPriceSeriesItem,
} from '@/types/timeseries';
import type { SegmentId, RawPriceSource } from '@/types/literals';

interface MinimapProps {
  variant: MinimapVariant;
}

const HEIGHT = 70;
const TOTAL_HEIGHT = HEIGHT;
const MARGIN = { top: 8, bottom: 20, left: 24, right: 24 };
const BRUSH_FILL = 'rgba(13, 148, 136, 0.08)';
const BRUSH_STROKE = 'var(--brand)';
const MIN_BRUSH_MONTHS = 3;

function densityColor(item: AnomalyDensityItem): string | null {
  if (item.high_count > 0) return ANOMALY_COLORS.high;
  if (item.medium_count > 0) return ANOMALY_COLORS.medium;
  if (item.reference_count > 0) return ANOMALY_COLORS.reference;
  return null;
}

function densityOpacity(item: AnomalyDensityItem): number {
  if (item.high_count > 0 || item.medium_count > 0) return 0.12;
  return 0.1;
}

function getAnomalyBandStyle(item: AnomalyDensityItem): { color: string; opacity: number } | null {
  const color = densityColor(item);
  if (!color) return null;
  return { color, opacity: densityOpacity(item) };
}

export function Minimap({ variant }: MinimapProps) {
  const { data, isLoading, isError } = useMinimapData(variant);
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

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // D3 object refs (브러시 상태 유지)
  const xScaleRef = useRef<d3.ScaleTime<number, number> | null>(null);
  const brushGroupDomRef = useRef<SVGGElement | null>(null);
  const brushBehaviorRef = useRef<d3.BrushBehavior<unknown> | null>(null);
  const isProgrammaticRef = useRef(false);

  // variant별 구간/소스 색상 반환
  const getSegmentColor = useCallback(
    (item: StreamSeriesItem | RawPriceSeriesItem): string => {
      if (variant === 'stream') {
        return SEGMENT_COLORS_PRIMARY[(item as StreamSeriesItem).segment_id as SegmentId] ?? CHART_THEME.axisText;
      }
      return RAW_PRICE_COLORS[(item as RawPriceSeriesItem).source as RawPriceSource] ?? CHART_THEME.axisText;
    },
    [variant],
  );

  // FE-D3-003: ResizeObserver로 컨테이너 크기 복구 감지 → 재렌더링.
  // mount 직후 getBoundingClientRect와 ResizeObserver 첫 fire가 모두 0 가능.
  // 양쪽 무시 시 영영 0 → 차트 렌더 안 됨, 다른 탭 갔다 와야 풀림.
  // → rAF 폴링으로 첫 non-zero width 확보 후 observer 부착.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const sync = (w: number) => {
      if (w > 0) setContainerWidth(w);
    };
    const trySync = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) {
        sync(w);
      } else {
        raf = requestAnimationFrame(trySync);
      }
    };
    trySync();
    const observer = new ResizeObserver((entries) => {
      sync(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(el);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  // ── 메인 D3 렌더링 ──────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!data || !svg || containerWidth === 0) return;

    const { anomaly_density, actual_from, actual_to } = data;
    const series = data.series as (StreamSeriesItem | RawPriceSeriesItem)[];

    // FE-D3-001: 유효 데이터 없음 → 렌더 중단 (fallback UI가 대신 표시됨)
    const hasData = series.length > 0 && series.some((s) => s.data.length > 0);
    if (!hasData) return;

    const width = containerWidth;
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = TOTAL_HEIGHT - MARGIN.top - MARGIN.bottom;

    // actual_from/to 는 항상 YYYY-MM 형식 (stream minimap도 "2000-01" 반환)
    const parseYM = d3.timeParse('%Y-%m');
    // 백엔드 SoT: stream·raw-prices 데이터 포인트 period 모두 "YYYY-MM"(yearly도 12월 고정)
    const parsePeriod = (p: string): Date | null => parseYM(p);
    const formatMonth = d3.timeFormat('%Y-%m');

    const domainStart = parseYM(actual_from)!;
    const domainEnd = parseYM(actual_to)!;

    const xScale = d3.scaleTime().domain([domainStart, domainEnd]).range([0, innerWidth]);
    xScaleRef.current = xScale;

    // Y 도메인: variant별 값 추출
    let allValues: number[];
    if (variant === 'stream') {
      allValues = (series as StreamSeriesItem[]).flatMap((s) =>
        s.data
          .filter((d) => d.transmission_rate !== null && !d.in_warmup_period)
          .map((d) => d.transmission_rate as number),
      );
    } else {
      allValues = (series as RawPriceSeriesItem[]).flatMap((s) =>
        s.data.filter((d) => d.index_2020 !== null).map((d) => d.index_2020 as number),
      );
    }

    const yMin = allValues.length > 0 ? Math.min(...allValues) : 0;
    const yMax = allValues.length > 0 ? Math.max(...allValues) : 1;
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]);

    // SVG 초기화
    const root = d3.select(svg);
    root.selectAll('*').remove();
    root.attr('width', width).attr('height', TOTAL_HEIGHT);

    const g = root.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // ① 이상 밀도 배경 밴드 (연도 단위)
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
      if (variant === 'stream') {
        const sItem = seriesItem as StreamSeriesItem;
        const lineGen = d3
          .line<(typeof sItem.data)[0]>()
          .x((d) => xScale(parsePeriod(d.period)!))
          .y((d) => yScale(d.transmission_rate as number))
          .defined((d) => {
            if (d.transmission_rate === null) {
              if (!d.in_warmup_period) {
                console.warn(`[Minimap] PARSE-NUM-002: null transmission_rate at ${d.period}`);
              }
              return false;
            }
            return true;
          });
        g.append('path')
          .datum(sItem.data)
          .attr('fill', 'none')
          .attr('stroke', getSegmentColor(sItem))
          .attr('stroke-opacity', 0.3)
          .attr('stroke-width', 1)
          .attr('d', lineGen);
      } else {
        const sItem = seriesItem as RawPriceSeriesItem;
        const lineGen = d3
          .line<(typeof sItem.data)[0]>()
          .x((d) => xScale(parsePeriod(d.period)!))
          .y((d) => yScale(d.index_2020 as number))
          .defined((d) => d.index_2020 !== null);
        g.append('path')
          .datum(sItem.data)
          .attr('fill', 'none')
          .attr('stroke', getSegmentColor(sItem))
          .attr('stroke-opacity', 0.3)
          .attr('stroke-width', 1)
          .attr('d', lineGen);
      }
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
        ax.selectAll('.tick line').attr('stroke', CHART_THEME.axisLine);
        ax.selectAll('.tick text')
          .attr('fill', CHART_THEME.axisText)
          .attr('font-size', '10px')
          .attr('font-family', CHART_THEME.fontFamilyMono);
      });

    // ④ d3.brushX() 뷰포트 박스
    const brushGroup = g.append('g');
    brushGroupDomRef.current = brushGroup.node();

    const totalMs = domainEnd.getTime() - domainStart.getTime();
    const threeMonthMs = MIN_BRUSH_MONTHS * 30.44 * 24 * 60 * 60 * 1000;
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
      .attr('fill', BRUSH_FILL)
      .attr('stroke', BRUSH_STROKE)
      .attr('stroke-width', 1);
    brushGroup.selectAll<SVGElement, unknown>('.handle').attr('fill', BRUSH_STROKE);

    // store의 현재 기간으로 초기 브러시 위치 설정
    const initFrom = filterFromRef.current;
    const initTo = filterToRef.current;
    if (initFrom && initTo) {
      // filterFrom/To는 항상 YYYY-MM 형식
      const pFrom = parseYM(initFrom);
      const pTo = parseYM(initTo);
      if (pFrom && pTo) {
        isProgrammaticRef.current = true;
        brushGroup.call(brush.move, [xScale(pFrom), xScale(pTo)]);
        isProgrammaticRef.current = false;
      }
    }
  }, [data, containerWidth, setFilterFrom, setFilterTo, getSegmentColor, variant]);

  // ── 브러시 위치 동기화 (store → brush) ──────────────────────
  // 메인 차트 휠 줌 등 외부에서 filterFrom/filterTo가 바뀔 때 뷰포트 박스 위치 갱신
  useEffect(() => {
    const brush = brushBehaviorRef.current;
    const groupDom = brushGroupDomRef.current;
    const xScale = xScaleRef.current;
    if (!brush || !groupDom || !xScale) return;
    if (!filterFrom || !filterTo) return;

    const parseYM = d3.timeParse('%Y-%m');
    const pFrom = parseYM(filterFrom);
    const pTo = parseYM(filterTo);
    if (!pFrom || !pTo) return;

    isProgrammaticRef.current = true;
    d3.select(groupDom).call(brush.move, [xScale(pFrom), xScale(pTo)]);
    isProgrammaticRef.current = false;
  }, [filterFrom, filterTo]);

  // ── FE-D3-001 / API 오류 fallback ────────────────────────────
  const hasData =
    data && data.series.length > 0 && data.series.some((s) => s.data.length > 0);

  // CLAUDE.md §StreamChart 방어 패턴 (Minimap도 동일 회귀 대상):
  // 컨테이너 항상 mount. loading/empty/error는 overlay로.
  // empty-deps resize useEffect가 첫 발화 시 ref 확보되도록 보장.
  return (
    <div
      ref={containerRef}
      className="relative bg-surface border border-border-default rounded-md overflow-hidden"
      style={{ height: HEIGHT }}
    >
      <svg ref={svgRef} style={{ display: 'block' }} />

      {isLoading && (
        <div
          className="absolute inset-0 skeleton-bar rounded-md"
          style={{ animation: 'shimmer 1.6s linear infinite' }}
        />
      )}
      {!isLoading && (isError || (data && !hasData)) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-tertiary text-[12px]">전체 기간 데이터 없음</span>
        </div>
      )}
    </div>
  );
}
