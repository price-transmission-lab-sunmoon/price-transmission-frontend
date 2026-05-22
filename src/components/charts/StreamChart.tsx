import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAppStore } from '@/stores/useAppStore';
import { useStreamData } from '@/hooks/useStreamData';
import { useSecondaryStreamData } from '@/hooks/useSecondaryStreamData';
import { buildStreamChartData } from '@/services/timeseries';
import { parseYearMonth } from '@/utils/dateUtils';
import {
  ANOMALY_COLORS,
  ANOMALY_RADII,
  SEGMENT_COLORS_PRIMARY,
  SEGMENT_COLORS_SECONDARY,
} from '@/utils/colorUtils';
import { CHART_THEME } from '@/utils/chartTheme';
import { createChartTooltip } from '@/utils/chartTooltip';
import { StateView } from '@/components/ui/StateView';
import type { SegmentId } from '@/types/literals';
import {
  computeWarmupBands,
  computeYDomain,
  dateToYM,
  parseFilterYM,
  pickXTickFormat,
  pickXTickInterval,
} from './streamChartHelpers';

// rev.6 spec margins — top/right/bottom/left bumped for breathing room
// (warmup label, event labels, y-axis title).
const MARGIN = { top: 28, right: 32, bottom: 36, left: 56 };
const ANIMATION_DURATION = 800;
const ZOOM_END_DEBOUNCE_MS = 200;
const CLIP_ID = 'stream-chart-clip';
const TOOLTIP_ID = 'stream-chart-tooltip';

export function StreamChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ZOOM-1: 외부 filter 동기화용 보존
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const xScaleRef = useRef<d3.ScaleTime<number, number> | null>(null);
  const yScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const innerWRef = useRef<number>(0);
  const innerHRef = useRef<number>(0);

  // zoom 종료 debounce + 자기 push 가드
  const zoomEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushedRef = useRef<{ from: string | null; to: string | null }>({ from: null, to: null });

  const primaryCommodityId = useAppStore((s) => s.primaryCommodityId);
  const secondaryCommodityId = useAppStore((s) => s.secondaryCommodityId);
  const commodities = useAppStore((s) => s.commodities);
  const activeSegments = useAppStore((s) => s.activeSegments);
  const confidenceFilter = useAppStore((s) => s.confidenceFilter);
  const eventFilter = useAppStore((s) => s.eventFilter);
  const events = useAppStore((s) => s.events);
  const selectedAnomalyId = useAppStore((s) => s.selectedAnomalyId);
  const selectAnomaly = useAppStore((s) => s.selectAnomaly);
  const filterFrom = useAppStore((s) => s.filterFrom);
  const filterTo = useAppStore((s) => s.filterTo);
  const setFilterFrom = useAppStore((s) => s.setFilterFrom);
  const setFilterTo = useAppStore((s) => s.setFilterTo);

  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const sameCluster = useMemo(() => {
    if (!secondaryCommodityId) return false;
    const p = commodities.find((c) => c.commodity_id === primaryCommodityId);
    const s = commodities.find((c) => c.commodity_id === secondaryCommodityId);
    return !!(p && s && p.cluster === s.cluster);
  }, [primaryCommodityId, secondaryCommodityId, commodities]);

  const { data: primaryData, isLoading: primaryLoading, isError: primaryError } = useStreamData();
  const { data: secondaryRaw } = useSecondaryStreamData();

  // 자동 anomaly 선택 + 패널 자동 열림 폐기 (2026-05-21).
  // 사용자 클릭 없이 패널이 열리면 차트 가림 + 매번 같은 노드 강제 강조.

  const chartData = useMemo(() => {
    if (!primaryData) return null;
    return buildStreamChartData(primaryData, activeSegments, confidenceFilter);
  }, [primaryData, activeSegments, confidenceFilter]);

  const secondaryChartData = useMemo(() => {
    if (!secondaryRaw) return null;
    return buildStreamChartData(secondaryRaw, activeSegments, []);
  }, [secondaryRaw, activeSegments]);

  // ─── 메인 셋업 useEffect ──────────────────────────────
  useEffect(() => {
    if (!chartData || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const innerW = width - MARGIN.left - MARGIN.right;
    const innerH = height - MARGIN.top - MARGIN.bottom;
    if (innerW <= 0 || innerH <= 0) return;
    // ResizeObserver 첫 fire 전 0크기 진입 차단 — 2회 setup 방지.
    if (containerSize.w === 0 || containerSize.h === 0) return;

    const svg = d3.select(svgRef.current);
    svg.interrupt();
    svg.selectAll('*').interrupt();
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const root = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    svg
      .append('defs')
      .append('clipPath')
      .attr('id', CLIP_ID)
      .append('rect')
      .attr('width', innerW)
      .attr('height', innerH);

    // xScale: 전체 도메인 고정 (viewport는 zoom transform으로)
    const xScale = d3.scaleTime().domain([chartData.domainFrom, chartData.domainTo]).range([0, innerW]);

    // 초기 Y 도메인: filterFrom/To viewport 기준 (rev.6 viewport dynamic sync)
    const initViewFrom = parseFilterYM(filterFrom) ?? chartData.domainFrom;
    const initViewTo = parseFilterYM(filterTo) ?? chartData.domainTo;
    const [initYMin, initYMax] = computeYDomain(chartData, secondaryChartData, initViewFrom, initViewTo);
    const yScale = d3.scaleLinear().domain([initYMin, initYMax]).range([innerH, 0]);

    xScaleRef.current = xScale;
    yScaleRef.current = yScale;
    innerWRef.current = innerW;
    innerHRef.current = innerH;

    // ─── 축 + 그리드 ───────────────────────────────────
    const xAxisG = root
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerH})`);
    const yAxisG = root.append('g').attr('class', 'y-axis');
    const gridG = root.append('g').attr('class', 'grid');

    const styleAxisText = (g: d3.Selection<SVGGElement, unknown, null, undefined>) =>
      g
        .selectAll('text')
        .attr('fill', CHART_THEME.axisText)
        .attr('font-size', CHART_THEME.fontSize)
        .attr('font-family', CHART_THEME.fontFamilyMono);

    const drawXAxis = (scale: d3.ScaleTime<number, number>) => {
      const domain = scale.domain() as [Date, Date];
      const interval = pickXTickInterval(domain);
      const fmt = pickXTickFormat(domain);
      xAxisG.call(
        d3
          .axisBottom(scale)
          .ticks(interval)
          .tickSize(0)
          .tickPadding(10)
          .tickFormat(((d: Date) => fmt(d)) as never),
      );
      styleAxisText(xAxisG);
    };
    const drawYAxis = (scale: d3.ScaleLinear<number, number>) => {
      yAxisG.call(
        d3
          .axisLeft(scale)
          .ticks(5)
          .tickSize(0)
          .tickPadding(10)
          .tickFormat((d) => `${(+d).toFixed(2)}`),
      );
      styleAxisText(yAxisG);
      yAxisG.select('.domain').remove();
    };
    const drawGrid = (scale: d3.ScaleLinear<number, number>) => {
      gridG
        .call(d3.axisLeft(scale).ticks(5).tickSize(-innerW).tickFormat('' as never))
        .selectAll('line')
        .attr('stroke', CHART_THEME.gridLine)
        .attr('stroke-dasharray', CHART_THEME.gridDasharray);
      gridG.select('.domain').remove();
    };

    drawXAxis(xScale);
    drawYAxis(yScale);
    drawGrid(yScale);
    root.selectAll('.domain, .tick line').attr('stroke', CHART_THEME.axisLine);

    // Y-axis title — uppercase, tracking-wider
    root
      .append('text')
      .attr('class', 'y-title')
      .attr('transform', `translate(${-44},${innerH / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('letter-spacing', '0.08em')
      .attr('fill', CHART_THEME.axisText)
      .attr('font-family', CHART_THEME.fontFamilyMono)
      .text('TRANSMISSION');

    // ─── 클립된 차트 영역 ────────────────────────────
    const chartGroup = root.append('g').attr('clip-path', `url(#${CLIP_ID})`);

    // 기준선 y=1 (완전 전달) + y=0 (역전 경계) — brand teal at low opacity
    const refLineGroup = chartGroup.append('g').attr('class', 'ref-lines');
    const drawRefLine = (yVal: number, label: string) => {
      const yPx = yScale(yVal);
      refLineGroup
        .append('line')
        .attr('class', 'ref-line')
        .attr('data-yval', yVal)
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', yPx)
        .attr('y2', yPx)
        .attr('stroke', CHART_THEME.baselineRef)
        .attr('stroke-width', 1.25)
        .attr('stroke-dasharray', CHART_THEME.baselineRefDash)
        .attr('opacity', 0.5);
      refLineGroup
        .append('text')
        .attr('class', 'ref-label')
        .attr('data-yval', yVal)
        .attr('x', innerW - 4)
        .attr('y', yPx - 4)
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .attr('font-weight', 600)
        .attr('fill', CHART_THEME.baselineRef)
        .attr('opacity', 0.85)
        .attr('font-family', CHART_THEME.fontFamilyMono)
        .text(label);
    };
    drawRefLine(0, '역전 경계 (0)');
    drawRefLine(1, '완전 전달 (1.0)');

    // ─── warmup 배경 band ─────────────────────────────
    // 라인은 끊지 않음. 회색 vertical band. events 보다 먼저 그려서 events가 위에.
    const warmupGroup = chartGroup.append('g').attr('class', 'warmup-bands');
    const warmupBands = computeWarmupBands(chartData.series);
    for (let i = 0; i < warmupBands.length; i++) {
      const [b0, b1] = warmupBands[i];
      const x0 = xScale(b0);
      const x1 = xScale(b1);
      const g = warmupGroup.append('g').attr('data-warmup-idx', i);
      g.append('rect')
        .attr('class', 'warmup-rect')
        .attr('x', x0)
        .attr('y', 0)
        .attr('width', Math.max(0, x1 - x0))
        .attr('height', innerH)
        .attr('fill', CHART_THEME.warmupBand);
      if (i === 0) {
        g.append('text')
          .attr('class', 'warmup-label')
          .attr('x', x0 + 6)
          .attr('y', 14)
          .attr('font-size', '10px')
          .attr('font-weight', 600)
          .attr('letter-spacing', '0.08em')
          .attr('fill', CHART_THEME.warmupLabel)
          .text('WARMUP');
      }
    }

    // ─── 이벤트 오버레이 (data-event-key) ─────────────
    const eventGroup = chartGroup.append('g').attr('class', 'events');
    const activeEvents =
      eventFilter.length > 0 ? events.filter((e) => eventFilter.includes(e.event_key)) : [];
    for (const ev of activeEvents) {
      const x0 = xScale(parseYearMonth(ev.start_date));
      const x1 = xScale(parseYearMonth(ev.end_date));
      const g = eventGroup.append('g').attr('data-event-key', ev.event_key);
      g.append('rect')
        .attr('class', 'ev-rect')
        .attr('x', x0)
        .attr('y', 0)
        .attr('width', Math.max(0, x1 - x0))
        .attr('height', innerH)
        .attr('fill', ev.color_hex)
        .attr('opacity', 0.1);
      g.append('line')
        .attr('class', 'ev-line')
        .attr('x1', x0)
        .attr('x2', x0)
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', CHART_THEME.eventLine)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', CHART_THEME.eventLineDash)
        .attr('opacity', 0.5);
    }

    // ─── line generators (single path per segment — rev.6) ─
    type ChartPt = { period: Date; transmission_rate: number | null; in_warmup_period?: boolean };
    const lineGen = (xSc: d3.ScaleTime<number, number>, ySc: d3.ScaleLinear<number, number>) =>
      d3
        .line<ChartPt>()
        .defined((p) => p.transmission_rate !== null)
        .x((p) => xSc(p.period))
        .y((p) => ySc(p.transmission_rate!))
        .curve(d3.curveMonotoneX);
    // area fill 폐기 — y=0~rate 면적은 물리적 의미 없음 (rev.6 contract).

    const seriesGroup = chartGroup.append('g').attr('class', 'series');

    const drawSeries = (
      segId: SegmentId,
      data: ChartPt[],
      isSecondary: boolean,
      prefix = '',
    ) => {
      const colorMap = isSecondary ? SEGMENT_COLORS_SECONDARY : SEGMENT_COLORS_PRIMARY;
      const color = colorMap[segId] ?? CHART_THEME.axisText;
      const opacity = isSecondary ? 0.7 : 1;

      // null 사전 필터 — 라인이 완전 연속.
      const clean = data.filter((p) => p.transmission_rate !== null);

      const path = seriesGroup
        .append('path')
        .datum(clean)
        .attr('class', `${prefix}line-${segId}`)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', isSecondary ? 1.5 : 2.25)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('opacity', opacity);

      const finalDash = isSecondary ? '4,3' : null;
      const pathNode = path.node();
      if (pathNode) {
        path.attr('d', lineGen(xScale, yScale));
        const totalLength = pathNode.getTotalLength();
        path
          .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
          .attr('stroke-dashoffset', totalLength)
          .transition()
          .duration(ANIMATION_DURATION)
          .ease(d3.easeCubicOut)
          .attr('stroke-dashoffset', 0)
          .on('end', function () {
            d3.select(this).attr('stroke-dasharray', finalDash).attr('stroke-dashoffset', null);
          });
      }
    };

    if (secondaryChartData) {
      for (const s of secondaryChartData.series) drawSeries(s.segment_id, s.data, true, 'sec-');
    }
    for (const s of chartData.series) drawSeries(s.segment_id, s.data, false);

    // ─── 노드 렌더 (3-layer: pulse → white ring → dot) ───
    const anomalyGroup = chartGroup.append('g').attr('class', 'anomaly-nodes');

    const renderNodes = (xSc: d3.ScaleTime<number, number>, ySc: d3.ScaleLinear<number, number>) => {
      anomalyGroup.selectAll('*').remove();
      // 정렬: reference → medium → high (낮은 등급 먼저, 높은 등급 위로).
      // X spread 폐기: 자기 시점에 정직하게 위치. 겹치면 stack.
      const gradeOrder = { reference: 0, medium: 1, high: 2 } as const;
      const list = [...chartData.anomalies].sort(
        (a, b) => gradeOrder[a.confidence_grade] - gradeOrder[b.confidence_grade],
      );

      for (const an of list) {
        const cx = xSc(an.period);
        const cy = ySc(an.transmission_rate);
        const r = ANOMALY_RADII[an.confidence_grade];
        const color = ANOMALY_COLORS[an.confidence_grade];
        const isSelected = an.anomaly_id === selectedAnomalyId;
        const isReference = an.confidence_grade === 'reference';

        // Layer 1: pulse halo (high only — CSS @keyframes, never SVG <animate>)
        if (an.confidence_grade === 'high') {
          anomalyGroup
            .append('circle')
            .attr('data-anomaly-glow', an.anomaly_id)
            .attr('class', 'anomaly-pulse-high')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', r + 3)
            .attr('fill', color)
            .style('pointer-events', 'none');
        }

        // Layer 2: white ring (separator from line)
        if (!isReference) {
          anomalyGroup
            .append('circle')
            .attr('data-anomaly-ring', an.anomaly_id)
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', r + 2.5)
            .attr('fill', 'var(--bg-surface)')
            .style('pointer-events', 'none');
        }

        // Layer 3: main dot — reference = outline-only ring
        const circle = anomalyGroup
          .append('circle')
          .attr('data-anomaly-id', an.anomaly_id)
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', r)
          .attr('fill', isReference ? 'var(--bg-surface)' : color)
          .attr(
            'stroke',
            isSelected ? 'var(--brand)' : isReference ? color : 'transparent',
          )
          .attr('stroke-width', isSelected ? 3 : isReference ? 2 : 0)
          .attr('cursor', 'pointer')
          .style(
            'filter',
            isSelected ? 'drop-shadow(0 0 8px rgba(13, 148, 136, 0.5))' : 'none',
          );

        // NEW dot top-right
        if (an.is_new) {
          anomalyGroup
            .append('circle')
            .attr('data-anomaly-new', an.anomaly_id)
            .attr('cx', cx + r + 1)
            .attr('cy', cy - r - 1)
            .attr('r', 2.5)
            .attr('fill', 'var(--warning)')
            .attr('stroke', 'var(--bg-surface)')
            .attr('stroke-width', 1)
            .style('pointer-events', 'none');
        }

        circle.on('click', () => selectAnomaly(an.anomaly_id));
        circle
          .on('mouseenter', function (event: MouseEvent) {
            d3.select(this)
              .transition()
              .duration(120)
              .attr('r', r * 1.35);
            showTooltip(
              event,
              an.periodStr,
              an.confidence_grade,
              an.transmission_rate,
              an.primary_pattern,
              an.is_new,
            );
          })
          .on('mousemove', (event: MouseEvent) => moveTooltip(event))
          .on('mouseleave', function () {
            d3.select(this)
              .transition()
              .duration(120)
              .attr('r', r);
            hideTooltip();
          });
      }
    };

    renderNodes(xScale, yScale);

    // ─── 줌 redraw (rev.6: viewport Y dynamic sync) ────
    const applyTransform = (transform: d3.ZoomTransform) => {
      const newX = transform.rescaleX(xScale);
      const [viewFrom, viewTo] = newX.domain() as [Date, Date];
      const [yMin, yMax] = computeYDomain(chartData, secondaryChartData, viewFrom, viewTo);
      const newY = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);
      yScaleRef.current = newY;

      drawXAxis(newX);
      drawYAxis(newY);
      drawGrid(newY);
      root.selectAll('.domain, .tick line').attr('stroke', CHART_THEME.axisLine);

      // path 갱신 — null 사전 필터로 연속성 유지.
      if (secondaryChartData) {
        for (const s of secondaryChartData.series) {
          const clean = s.data.filter((p) => p.transmission_rate !== null);
          seriesGroup.select(`.sec-line-${s.segment_id}`).attr('d', lineGen(newX, newY)(clean) ?? '');
        }
      }
      for (const s of chartData.series) {
        const clean = s.data.filter((p) => p.transmission_rate !== null);
        seriesGroup.select(`.line-${s.segment_id}`).attr('d', lineGen(newX, newY)(clean) ?? '');
      }

      // 노드 위치 — X spread 폐기, cx = 정확 시점, cy = newY.
      const list = chartData.anomalies;
      for (const an of list) {
        const cx = newX(an.period);
        const cy = newY(an.transmission_rate);
        const r = ANOMALY_RADII[an.confidence_grade];
        anomalyGroup.select(`[data-anomaly-id="${an.anomaly_id}"]`).attr('cx', cx).attr('cy', cy);
        anomalyGroup.select(`[data-anomaly-glow="${an.anomaly_id}"]`).attr('cx', cx).attr('cy', cy);
        anomalyGroup.select(`[data-anomaly-ring="${an.anomaly_id}"]`).attr('cx', cx).attr('cy', cy);
        anomalyGroup
          .select(`[data-anomaly-new="${an.anomaly_id}"]`)
          .attr('cx', cx + r + 1)
          .attr('cy', cy - r - 1);
      }

      // 기준선
      refLineGroup.selectAll<SVGLineElement, unknown>('.ref-line').each(function () {
        const sel = d3.select(this);
        const yVal = +sel.attr('data-yval');
        const yPx = newY(yVal);
        sel.attr('x2', innerW).attr('y1', yPx).attr('y2', yPx);
      });
      refLineGroup.selectAll<SVGTextElement, unknown>('.ref-label').each(function () {
        const sel = d3.select(this);
        const yVal = +sel.attr('data-yval');
        sel.attr('x', innerW - 4).attr('y', newY(yVal) - 4);
      });

      // warmup band
      for (let i = 0; i < warmupBands.length; i++) {
        const [b0, b1] = warmupBands[i];
        const x0 = newX(b0);
        const x1 = newX(b1);
        const g = warmupGroup.select(`[data-warmup-idx="${i}"]`);
        g.select('.warmup-rect').attr('x', x0).attr('width', Math.max(0, x1 - x0));
        if (i === 0) g.select('.warmup-label').attr('x', x0 + 6);
      }

      // 이벤트
      for (const ev of activeEvents) {
        const x0 = newX(parseYearMonth(ev.start_date));
        const x1 = newX(parseYearMonth(ev.end_date));
        const g = eventGroup.select(`[data-event-key="${ev.event_key}"]`);
        g.select('.ev-rect').attr('x', x0).attr('width', Math.max(0, x1 - x0));
        g.select('.ev-line').attr('x1', x0).attr('x2', x0);
      }
    };

    // ─── 줌 동작 (rev.6 contract — 변경 금지) ──────────
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 30])
      .translateExtent([[0, 0], [innerW, innerH]])
      .extent([[0, 0], [innerW, innerH]])
      .wheelDelta((event) => -event.deltaY * (event.deltaMode === 1 ? 0.06 : event.deltaMode ? 1 : 0.0025))
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        applyTransform(event.transform);
      })
      .on('end', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        if (!event.sourceEvent) return;
        if (zoomEndTimerRef.current) clearTimeout(zoomEndTimerRef.current);
        zoomEndTimerRef.current = setTimeout(() => {
          const newX = event.transform.rescaleX(xScale);
          const [d0, d1] = newX.domain() as [Date, Date];
          const fromYM = dateToYM(d0);
          const toYM = dateToYM(d1);
          lastPushedRef.current = { from: fromYM, to: toYM };
          setFilterFrom(fromYM);
          setFilterTo(toYM);
        }, ZOOM_END_DEBOUNCE_MS);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // 초기 viewport transform
    if (filterFrom && filterTo) {
      const fromDate = parseFilterYM(filterFrom);
      const toDate = parseFilterYM(filterTo);
      if (fromDate && toDate && toDate > fromDate) {
        const fromPx = xScale(fromDate);
        const toPx = xScale(toDate);
        const k = innerW / (toPx - fromPx);
        const tx = -fromPx * k;
        svg.call(zoom.transform, d3.zoomIdentity.translate(tx, 0).scale(k));
        lastPushedRef.current = { from: filterFrom, to: filterTo };
      }
    }

    return () => {
      if (zoomEndTimerRef.current) {
        clearTimeout(zoomEndTimerRef.current);
        zoomEndTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData, secondaryChartData, events, eventFilter, sameCluster, setFilterFrom, setFilterTo, containerSize]);

  // ─── 선택 상태 토글 (재구성 회피) ─────────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    d3.select(svg)
      .selectAll<SVGCircleElement, unknown>('[data-anomaly-id]')
      .each(function () {
        const sel = d3.select(this);
        const id = Number(sel.attr('data-anomaly-id'));
        const isSelected = id === selectedAnomalyId;
        sel
          .attr('stroke', isSelected ? 'var(--brand)' : 'transparent')
          .attr('stroke-width', isSelected ? 3 : 0)
          .style(
            'filter',
            isSelected ? 'drop-shadow(0 0 8px rgba(13, 148, 136, 0.5))' : 'none',
          );
      });
  }, [selectedAnomalyId]);

  // ─── 외부 filter 동기화 ─────────────────────────
  useEffect(() => {
    const svgEl = svgRef.current;
    const zoomBehavior = zoomBehaviorRef.current;
    const xScale = xScaleRef.current;
    const innerW = innerWRef.current;
    if (!svgEl || !zoomBehavior || !xScale || innerW <= 0) return;
    if (!filterFrom || !filterTo) return;
    if (lastPushedRef.current.from === filterFrom && lastPushedRef.current.to === filterTo) return;

    const fromDate = parseFilterYM(filterFrom);
    const toDate = parseFilterYM(filterTo);
    if (!fromDate || !toDate || !(toDate > fromDate)) return;
    const fromPx = xScale(fromDate);
    const toPx = xScale(toDate);
    if (toPx <= fromPx) return;
    const k = innerW / (toPx - fromPx);
    const tx = -fromPx * k;
    d3.select(svgEl)
      .transition()
      .duration(250)
      .call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, 0).scale(k));
    lastPushedRef.current = { from: filterFrom, to: filterTo };
  }, [filterFrom, filterTo]);

  // ─── tooltip DOM helpers (light theme — createChartTooltip) ─
  function showTooltip(
    event: MouseEvent,
    period: string,
    grade: string,
    rate: number,
    pattern: string,
    isNew: boolean,
  ) {
    const tip = createChartTooltip(TOOLTIP_ID);
    const gradeLabel: Record<string, string> = {
      high: '고신뢰',
      medium: '중신뢰',
      reference: '참고',
    };
    const gradeColor: Record<string, string> = {
      high: ANOMALY_COLORS.high,
      medium: ANOMALY_COLORS.medium,
      reference: ANOMALY_COLORS.reference,
    };
    const regime = rate < 0 ? ' (역전)' : rate > 1 ? ' (과잉)' : '';
    tip.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${gradeColor[grade]}"></span>
        <span style="font-weight:600;color:${gradeColor[grade]};font-size:11px;letter-spacing:0.08em;text-transform:uppercase">${gradeLabel[grade] ?? grade}</span>
        ${isNew ? '<span style="margin-left:auto;font-size:9px;font-weight:700;color:var(--warning);background:var(--warning-subtle);border:1px solid var(--warning-border);padding:1px 4px;border-radius:3px">NEW</span>' : ''}
      </div>
      <div style="font-weight:600;font-size:13px;color:var(--text-primary);margin-bottom:3px">${period}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-tertiary)">
        전이율 ${rate.toFixed(2)}${regime} · ${pattern}
      </div>
    `;
    tip.style.display = 'block';
    moveTooltip(event);
  }
  function moveTooltip(event: MouseEvent) {
    const tip = document.getElementById(TOOLTIP_ID);
    if (!tip) return;
    tip.style.left = `${event.clientX + 14}px`;
    tip.style.top = `${event.clientY - 8}px`;
  }
  function hideTooltip() {
    const tip = document.getElementById(TOOLTIP_ID);
    if (tip) tip.style.display = 'none';
  }

  // ─── resize ────────────────────────────────────
  // 첫 fire가 0×0 가능 (mount 직후 layout 미완). 0 무시 + 즉시 sync.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      const rw = Math.round(w);
      const rh = Math.round(h);
      setContainerSize((prev) => (prev.w === rw && prev.h === rh ? prev : { w: rw, h: rh }));
    };
    const rect = el.getBoundingClientRect();
    sync(rect.width, rect.height);

    const observer = new ResizeObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      sync(e.contentRect.width, e.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!primaryCommodityId) {
    return (
      <div className="flex items-center justify-center h-full">
        <StateView variant="empty" size="inline" icon="list" title="품목을 선택하세요" />
      </div>
    );
  }
  if (primaryLoading) {
    return <StateView variant="loading" size="large" title="데이터를 불러오는 중…" />;
  }
  if (primaryError) {
    return (
      <StateView
        variant="error"
        size="large"
        title="데이터를 불러오지 못했습니다"
        description="잠시 후 다시 시도해주세요."
      />
    );
  }

  const noAnomalies = chartData != null && chartData.anomalies.length === 0;

  return (
    <div
      ref={containerRef}
      data-testid="stream-chart"
      className="w-full h-full min-h-[360px] relative bg-surface border border-border-default rounded-xl shadow-e2 overflow-hidden"
    >
      <svg ref={svgRef} className="w-full h-full overflow-visible" />
      {noAnomalies && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <StateView
            variant="empty"
            size="large"
            icon="chart-bar-square"
            title="이 기간에는 탐지된 이상이 없습니다"
            description="필터 기간을 넓히거나 다른 품목을 살펴보세요."
          />
        </div>
      )}
    </div>
  );
}
