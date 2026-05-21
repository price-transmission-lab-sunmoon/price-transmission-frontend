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
import type { SegmentId } from '@/types/literals';
import {
  bucketBadgeSize,
  bucketOffsetPx,
  computeNodeBuckets,
  computeYDomain,
  dateToYM,
  parseFilterYM,
} from './streamChartHelpers';

const MARGIN = { top: 20, right: 24, bottom: 36, left: 52 };
const ANIMATION_DURATION = 800;
const ZOOM_END_DEBOUNCE_MS = 200;
const CLIP_ID = 'stream-chart-clip';

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

  // RAF throttle for zoom redraw
  const rafRef = useRef<number | null>(null);
  const pendingTransformRef = useRef<d3.ZoomTransform | null>(null);

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

  // Auto-select latest anomaly on commodity change
  const lastAutoSelectCommodityId = useRef<string | null>(undefined as unknown as null);
  useEffect(() => {
    if (!primaryData) return;
    if (activeSegments.length === 0) return;
    const isNewCommodity = lastAutoSelectCommodityId.current !== primaryCommodityId;
    if (!isNewCommodity && selectedAnomalyId !== null) return;
    lastAutoSelectCommodityId.current = primaryCommodityId;
    const segmentSet = new Set(activeSegments);
    const findLatest = (grade: 'high' | 'medium' | 'reference') =>
      primaryData.anomaly_nodes
        .filter((n) => n.confidence_grade === grade && segmentSet.has(n.segment_id as SegmentId))
        .sort((a, b) => (b.period > a.period ? 1 : -1))[0];
    const candidate = findLatest('high') ?? findLatest('medium') ?? findLatest('reference');
    if (candidate) selectAnomaly(candidate.anomaly_id);
  }, [primaryData, primaryCommodityId]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const svg = d3.select(svgRef.current);
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

    // 초기 Y 도메인: filterFrom/To viewport 기준
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
      g.selectAll('text').attr('fill', '#94a3b8').attr('font-size', 11);

    const drawXAxis = (scale: d3.ScaleTime<number, number>) => {
      xAxisG.call(d3.axisBottom(scale).ticks(6).tickFormat(d3.timeFormat('%Y-%m') as never));
      styleAxisText(xAxisG);
    };
    const drawYAxis = (scale: d3.ScaleLinear<number, number>) => {
      yAxisG.call(d3.axisLeft(scale).ticks(5).tickFormat((d) => `${(+d).toFixed(2)}`));
      styleAxisText(yAxisG);
    };
    const drawGrid = (scale: d3.ScaleLinear<number, number>) => {
      gridG
        .call(d3.axisLeft(scale).ticks(5).tickSize(-innerW).tickFormat('' as never))
        .selectAll('line')
        .attr('stroke', '#1e293b')
        .attr('stroke-dasharray', '3,3');
      gridG.select('.domain').remove();
    };

    drawXAxis(xScale);
    drawYAxis(yScale);
    drawGrid(yScale);
    root.selectAll('.domain, .tick line').attr('stroke', '#334155');

    // ─── 클립된 차트 영역 ────────────────────────────
    const chartGroup = root.append('g').attr('clip-path', `url(#${CLIP_ID})`);

    // 기준선 y=0 / y=1
    const refLineGroup = chartGroup.append('g').attr('class', 'ref-lines');
    const drawRefLine = (yVal: number, label: string, color: string) => {
      const yPx = yScale(yVal);
      refLineGroup
        .append('line')
        .attr('class', 'ref-line')
        .attr('data-yval', yVal)
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', yPx)
        .attr('y2', yPx)
        .attr('stroke', color)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.5);
      refLineGroup
        .append('text')
        .attr('class', 'ref-label')
        .attr('data-yval', yVal)
        .attr('x', innerW - 4)
        .attr('y', yPx - 3)
        .attr('text-anchor', 'end')
        .attr('font-size', '9px')
        .attr('fill', color)
        .attr('opacity', 0.7)
        .text(label);
    };
    drawRefLine(0, '역전 경계 (0)', '#94a3b8');
    drawRefLine(1, '정상/과잉 (1)', '#94a3b8');

    // ─── 이벤트 오버레이 (data-event-key로 selectable) ─
    const eventGroup = chartGroup.append('g').attr('class', 'events');
    const activeEvents = eventFilter.length > 0 ? events.filter((e) => eventFilter.includes(e.event_key)) : [];
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
        .attr('opacity', 0.12);
      g.append('line')
        .attr('class', 'ev-line')
        .attr('x1', x0)
        .attr('x2', x0)
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', ev.color_hex)
        .attr('stroke-width', 1)
        .attr('opacity', 0.5);
    }

    // ─── line/area generators ─────────────────────────
    type ChartPt = { period: Date; transmission_rate: number | null; in_warmup_period?: boolean };
    const lineGen = (xSc: d3.ScaleTime<number, number>, ySc: d3.ScaleLinear<number, number>) =>
      d3
        .line<ChartPt>()
        .defined((p) => p.transmission_rate !== null && !p.in_warmup_period)
        .x((p) => xSc(p.period))
        .y((p) => ySc(p.transmission_rate!))
        .curve(d3.curveMonotoneX);

    const areaGen = (xSc: d3.ScaleTime<number, number>, ySc: d3.ScaleLinear<number, number>) =>
      d3
        .area<ChartPt>()
        .defined((p) => p.transmission_rate !== null && !p.in_warmup_period)
        .x((p) => xSc(p.period))
        .y0(ySc(0))
        .y1((p) => ySc(p.transmission_rate!))
        .curve(d3.curveMonotoneX);

    const seriesGroup = chartGroup.append('g').attr('class', 'series');

    const drawSeries = (
      segId: SegmentId,
      data: { period: Date; transmission_rate: number | null }[],
      isSecondary: boolean,
      prefix = '',
    ) => {
      const colorMap = isSecondary ? SEGMENT_COLORS_SECONDARY : SEGMENT_COLORS_PRIMARY;
      const color = colorMap[segId] ?? '#94a3b8';
      const opacity = isSecondary ? 0.4 : 1;

      seriesGroup
        .append('path')
        .datum(data)
        .attr('class', `${prefix}area-${segId}`)
        .attr('fill', color)
        .attr('opacity', isSecondary ? 0.08 : 0.15)
        .attr('d', areaGen(xScale, yScale));

      const path = seriesGroup
        .append('path')
        .datum(data)
        .attr('class', `${prefix}line-${segId}`)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', isSecondary ? 1.5 : 2)
        .attr('opacity', opacity);

      const finalDash = isSecondary && sameCluster ? '5,4' : null;
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

    // ─── 노드 렌더 ─────────────────────────────────────
    const anomalyGroup = chartGroup.append('g').attr('class', 'anomaly-nodes');

    const renderNodes = (xSc: d3.ScaleTime<number, number>, ySc: d3.ScaleLinear<number, number>) => {
      anomalyGroup.selectAll('*').remove();
      const list = chartData.anomalies;
      const buckets = computeNodeBuckets(list, xSc);

      for (const an of list) {
        const info = buckets.get(an.anomaly_id) ?? { idx: 0, size: 1 };
        const cx = xSc(an.period) + bucketOffsetPx(info);
        const cy = ySc(an.transmission_rate);
        const r = ANOMALY_RADII[an.confidence_grade];
        const color = ANOMALY_COLORS[an.confidence_grade];
        const isSelected = an.anomaly_id === selectedAnomalyId;

        // glow (high/medium 공통). CSS class로 펄스 — SVG <animate> 폐기.
        if (an.confidence_grade === 'high' || an.confidence_grade === 'medium') {
          anomalyGroup
            .append('circle')
            .attr('data-anomaly-glow', an.anomaly_id)
            .attr('class', an.confidence_grade === 'high' ? 'anomaly-pulse-high' : 'anomaly-glow-medium')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', r + 3)
            .attr('fill', color)
            .attr('opacity', 0.25)
            .style('filter', `blur(${an.confidence_grade === 'high' ? 3 : 2}px)`)
            .style('pointer-events', 'none');
        }

        const circle = anomalyGroup
          .append('circle')
          .attr('data-anomaly-id', an.anomaly_id)
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', r)
          .attr('fill', color)
          .attr('stroke', isSelected ? '#ffffff' : 'transparent')
          .attr('stroke-width', isSelected ? 2 : 0)
          .attr('cursor', 'pointer')
          .style('filter', isSelected ? 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' : 'none');

        // 클러스터 배지 — bucket 대표 노드(idx===0)이고 size>1
        const badge = bucketBadgeSize(info);
        if (badge > 0) {
          const bg = anomalyGroup
            .append('g')
            .attr('data-anomaly-cluster', an.anomaly_id)
            .attr('transform', `translate(${cx + r + 2},${cy - r - 2})`);
          bg.append('circle').attr('r', 7).attr('fill', '#0f172a').attr('stroke', color).attr('stroke-width', 1.2);
          bg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.32em')
            .attr('fill', color)
            .attr('font-size', '9px')
            .attr('font-weight', '700')
            .style('pointer-events', 'none')
            .text(`+${badge - 1}`);
        }

        if (an.is_new) {
          anomalyGroup
            .append('text')
            .attr('data-anomaly-new', an.anomaly_id)
            .attr('x', cx)
            .attr('y', cy - r - 6)
            .attr('text-anchor', 'middle')
            .attr('fill', color)
            .attr('font-size', '9px')
            .attr('font-weight', '700')
            .style('pointer-events', 'none')
            .text('NEW');
        }

        circle.on('click', () => selectAnomaly(an.anomaly_id));
        circle
          .on('mouseenter', function (event: MouseEvent) {
            d3.select(this).attr('r', r * 1.4);
            showTooltip(event, an.periodStr, an.confidence_grade, an.transmission_rate, an.primary_pattern);
          })
          .on('mousemove', (event: MouseEvent) => moveTooltip(event))
          .on('mouseleave', function () {
            d3.select(this).attr('r', r);
            hideTooltip();
          });
      }
    };

    renderNodes(xScale, yScale);

    // ─── 줌 redraw (RAF throttled) ────────────────────
    const applyTransform = (transform: d3.ZoomTransform) => {
      const newX = transform.rescaleX(xScale);
      const ySc = yScaleRef.current!;

      drawXAxis(newX);
      root.selectAll('.domain, .tick line').attr('stroke', '#334155');

      // path 갱신 — Y는 fixed
      if (secondaryChartData) {
        for (const s of secondaryChartData.series) {
          seriesGroup.select(`.sec-line-${s.segment_id}`).attr('d', lineGen(newX, ySc)(s.data) ?? '');
          seriesGroup.select(`.sec-area-${s.segment_id}`).attr('d', areaGen(newX, ySc)(s.data) ?? '');
        }
      }
      for (const s of chartData.series) {
        seriesGroup.select(`.line-${s.segment_id}`).attr('d', lineGen(newX, ySc)(s.data) ?? '');
        seriesGroup.select(`.area-${s.segment_id}`).attr('d', areaGen(newX, ySc)(s.data) ?? '');
      }

      // 노드 — bucket 재계산 + cx/cy 갱신
      const list = chartData.anomalies;
      const buckets = computeNodeBuckets(list, newX);
      for (const an of list) {
        const info = buckets.get(an.anomaly_id) ?? { idx: 0, size: 1 };
        const cx = newX(an.period) + bucketOffsetPx(info);
        const cy = ySc(an.transmission_rate);
        const r = ANOMALY_RADII[an.confidence_grade];
        anomalyGroup.select(`[data-anomaly-id="${an.anomaly_id}"]`).attr('cx', cx).attr('cy', cy);
        anomalyGroup.select(`[data-anomaly-glow="${an.anomaly_id}"]`).attr('cx', cx).attr('cy', cy);
        anomalyGroup
          .select(`[data-anomaly-new="${an.anomaly_id}"]`)
          .attr('x', cx)
          .attr('y', cy - r - 6);

        // 배지 표시/위치 — bucket size 변화 따라 동적으로 등장·소멸
        const badge = bucketBadgeSize(info);
        const badgeNode = anomalyGroup.select(`[data-anomaly-cluster="${an.anomaly_id}"]`);
        if (badge > 0) {
          if (badgeNode.empty()) {
            const color = ANOMALY_COLORS[an.confidence_grade];
            const bg = anomalyGroup
              .append('g')
              .attr('data-anomaly-cluster', an.anomaly_id)
              .attr('transform', `translate(${cx + r + 2},${cy - r - 2})`);
            bg.append('circle').attr('r', 7).attr('fill', '#0f172a').attr('stroke', color).attr('stroke-width', 1.2);
            bg.append('text')
              .attr('text-anchor', 'middle')
              .attr('dy', '0.32em')
              .attr('fill', color)
              .attr('font-size', '9px')
              .attr('font-weight', '700')
              .style('pointer-events', 'none')
              .text(`+${badge - 1}`);
          } else {
            badgeNode.attr('transform', `translate(${cx + r + 2},${cy - r - 2})`);
            badgeNode.select('text').text(`+${badge - 1}`);
          }
        } else if (!badgeNode.empty()) {
          badgeNode.remove();
        }
      }

      // 기준선 X 갱신 (Y는 yScale 변화 없음)
      refLineGroup
        .selectAll<SVGLineElement, unknown>('.ref-line')
        .attr('x2', innerW);

      // 이벤트 오버레이 — data-event-key로 정확 매칭
      for (const ev of activeEvents) {
        const x0 = newX(parseYearMonth(ev.start_date));
        const x1 = newX(parseYearMonth(ev.end_date));
        const g = eventGroup.select(`[data-event-key="${ev.event_key}"]`);
        g.select('.ev-rect').attr('x', x0).attr('width', Math.max(0, x1 - x0));
        g.select('.ev-line').attr('x1', x0).attr('x2', x0);
      }
    };

    const scheduleRedraw = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const t = pendingTransformRef.current;
        if (t) applyTransform(t);
      });
    };

    // ─── 줌 동작 ─────────────────────────────────────
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 30])
      .translateExtent([[0, 0], [innerW, innerH]])
      .extent([[0, 0], [innerW, innerH]])
      .wheelDelta((event) => -event.deltaY * (event.deltaMode === 1 ? 0.06 : event.deltaMode ? 1 : 0.0025))
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        pendingTransformRef.current = event.transform;
        scheduleRedraw();
      })
      .on('end', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        if (!event.sourceEvent) return;
        if (zoomEndTimerRef.current) clearTimeout(zoomEndTimerRef.current);
        zoomEndTimerRef.current = setTimeout(() => {
          const newX = event.transform.rescaleX(xScale);
          const [d0, d1] = newX.domain() as [Date, Date];

          // Y축 새 viewport 기준 transition으로 갱신
          const [newYMin, newYMax] = computeYDomain(chartData, secondaryChartData, d0, d1);
          const ySc = yScaleRef.current!;
          const oldDomain = ySc.domain() as [number, number];
          if (Math.abs(oldDomain[0] - newYMin) > 0.01 || Math.abs(oldDomain[1] - newYMax) > 0.01) {
            const interp = d3.interpolate(oldDomain, [newYMin, newYMax]);
            d3.transition('y-axis')
              .duration(300)
              .ease(d3.easeCubicOut)
              .tween('y-domain', () => (t: number) => {
                ySc.domain(interp(t));
                drawYAxis(ySc);
                drawGrid(ySc);
                root.selectAll('.domain, .tick line').attr('stroke', '#334155');
                // path + node Y 갱신 (X는 현재 transform 기준)
                applyTransform(event.transform);
              });
          }

          // filter push
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
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (zoomEndTimerRef.current) {
        clearTimeout(zoomEndTimerRef.current);
        zoomEndTimerRef.current = null;
      }
    };
  }, [chartData, secondaryChartData, events, eventFilter, sameCluster, setFilterFrom, setFilterTo, containerSize]); // eslint-disable-line react-hooks/exhaustive-deps

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
          .attr('stroke', isSelected ? '#ffffff' : 'transparent')
          .attr('stroke-width', isSelected ? 2 : 0)
          .style('filter', isSelected ? 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' : 'none');
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

  // ─── tooltip DOM helpers ────────────────────────
  function showTooltip(event: MouseEvent, period: string, grade: string, rate: number, pattern: string) {
    let tip = document.getElementById('stream-chart-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'stream-chart-tooltip';
      tip.style.cssText =
        'position:fixed;pointer-events:none;background:#1e293b;border:1px solid #334155;border-radius:6px;padding:8px 12px;font-size:12px;color:#f1f5f9;z-index:9999;white-space:nowrap;';
      document.body.appendChild(tip);
    }
    const gradeLabel: Record<string, string> = { high: '고신뢰', medium: '중신뢰', reference: '참고' };
    const regime = rate < 0 ? ' (역전)' : rate > 1 ? ' (과잉)' : '';
    tip.innerHTML = `<div style="font-weight:600;margin-bottom:4px">${period}</div><div>등급: ${gradeLabel[grade] ?? grade}</div><div>전이율: ${rate.toFixed(2)}${regime}</div><div>패턴: ${pattern}</div>`;
    tip.style.display = 'block';
    moveTooltip(event);
  }
  function moveTooltip(event: MouseEvent) {
    const tip = document.getElementById('stream-chart-tooltip');
    if (!tip) return;
    tip.style.left = `${event.clientX + 12}px`;
    tip.style.top = `${event.clientY - 8}px`;
  }
  function hideTooltip() {
    const tip = document.getElementById('stream-chart-tooltip');
    if (tip) tip.style.display = 'none';
  }

  // ─── resize ────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      const w = Math.round(e.contentRect.width);
      const h = Math.round(e.contentRect.height);
      setContainerSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!primaryCommodityId) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm">품목을 선택하세요</div>;
  }
  if (primaryLoading) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">로딩 중…</div>;
  }
  if (primaryError) {
    return <div className="flex items-center justify-center h-full text-red-400 text-sm">데이터를 불러오지 못했습니다</div>;
  }

  const noAnomalies = chartData != null && chartData.anomalies.length === 0;

  return (
    <div ref={containerRef} data-testid="stream-chart" className="w-full h-full min-h-[320px] relative">
      <svg ref={svgRef} className="w-full h-full overflow-visible" />
      {noAnomalies && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <div className="text-slate-300 text-sm">이 기간에는 탐지된 이상이 없습니다.</div>
          <div className="text-slate-500 text-xs">필터 기간을 넓히거나 다른 품목을 살펴보세요.</div>
        </div>
      )}
    </div>
  );
}
