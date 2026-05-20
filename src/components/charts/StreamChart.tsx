import { useEffect, useMemo, useRef } from 'react';
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

const MARGIN = { top: 20, right: 24, bottom: 36, left: 52 };
const ANIMATION_DURATION = 800;

export function StreamChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // ZOOM-1: 외부 filter 동기화용 zoom + xScale 보존
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const xScaleRef = useRef<d3.ScaleTime<number, number> | null>(null);
  const innerWRef = useRef<number>(0);
  // push debounce + 자기 push 가드
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // P2-3: 주-보조 같은 클러스터면 보조 곡선을 dashed로 표시 → 시각적 구분 강화.
  const sameCluster = useMemo(() => {
    if (!secondaryCommodityId) return false;
    const p = commodities.find((c) => c.commodity_id === primaryCommodityId);
    const s = commodities.find((c) => c.commodity_id === secondaryCommodityId);
    return !!(p && s && p.cluster === s.cluster);
  }, [primaryCommodityId, secondaryCommodityId, commodities]);

  const { data: primaryData, isLoading: primaryLoading, isError: primaryError } = useStreamData();
  const { data: secondaryRaw } = useSecondaryStreamData();

  // Auto-selection: on first successful load, select the most recent high-confidence anomaly
  // Only runs when primaryCommodityId changes or on first load.
  // Skips if selectedAnomalyId !== null (scenario ④ — preserve user selection).
  // Scenario ⑤: primaryCommodityId change triggers re-run (overwrites selection).
  const lastAutoSelectCommodityId = useRef<string | null>(undefined as unknown as null);

  useEffect(() => {
    if (!primaryData) return;
    if (activeSegments.length === 0) return;

    const isNewCommodity = lastAutoSelectCommodityId.current !== primaryCommodityId;
    // Scenario ④: skip if already selected and same commodity
    if (!isNewCommodity && selectedAnomalyId !== null) return;

    lastAutoSelectCommodityId.current = primaryCommodityId;

    // 등급 폴백: high → medium → reference 순으로 가장 최근 노드 검색.
    // P0-2: 백엔드가 high를 반환하지 않아도 패널이 자동 오픈되도록 함.
    const segmentSet = new Set(activeSegments);
    const findLatest = (grade: 'high' | 'medium' | 'reference') =>
      primaryData.anomaly_nodes
        .filter((n) => n.confidence_grade === grade && segmentSet.has(n.segment_id as SegmentId))
        .sort((a, b) => (b.period > a.period ? 1 : -1))[0];

    const candidate = findLatest('high') ?? findLatest('medium') ?? findLatest('reference');
    if (candidate) {
      selectAnomaly(candidate.anomaly_id);
    }
  }, [primaryData, primaryCommodityId]); // eslint-disable-line react-hooks/exhaustive-deps

  const chartData = useMemo(() => {
    if (!primaryData) return null;
    return buildStreamChartData(primaryData, activeSegments, confidenceFilter);
  }, [primaryData, activeSegments, confidenceFilter]);

  const secondaryChartData = useMemo(() => {
    if (!secondaryRaw) return null;
    return buildStreamChartData(secondaryRaw, activeSegments, []);
  }, [secondaryRaw, activeSegments]);

  // Build the D3 chart whenever chartData changes
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

    const root = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Clip path for zoom
    const clipId = 'stream-chart-clip';
    svg
      .append('defs')
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('width', innerW)
      .attr('height', innerH);

    // ZOOM-1: base xScale의 domain은 전체 데이터 범위로 고정.
    // filterFrom/filterTo는 zoom transform으로 viewport 표현. 이렇게 해야 휠 줌이 누적된다.
    const parseYM = (s: string | null): Date | null => {
      if (!s) return null;
      const [y, m] = s.split('-').map(Number);
      return new Date(y, m - 1, 1);
    };
    const xScale = d3
      .scaleTime()
      .domain([chartData.domainFrom, chartData.domainTo])
      .range([0, innerW]);

    // YAXIS-1: viewport 동적 Y축.
    // 사용자 요구: 현재 viewport에 보이는 anomaly 노드 기준으로 Y축을 동적 조절.
    // 노드가 시야에 잘 잡히도록 [min - 3, max + 3] 패딩 적용.
    // 노드가 0건이면 series points로 fallback, 그것도 0건이면 [-1, 2] 기본 도메인.
    const Y_NODE_PAD = 3;
    const computeYDomain = (viewFrom: Date, viewTo: Date): [number, number] => {
      const inWindow = (d: Date) => d.getTime() >= viewFrom.getTime() && d.getTime() <= viewTo.getTime();

      // 우선순위 1: viewport 안 anomaly 노드의 transmission_rate
      const nodeRates = chartData.rawAnomalies
        .filter((an) => inWindow(an.period))
        .map((an) => an.transmission_rate);

      if (nodeRates.length > 0) {
        const lo = Math.min(...nodeRates);
        const hi = Math.max(...nodeRates);
        return [lo - Y_NODE_PAD, hi + Y_NODE_PAD];
      }

      // 우선순위 2: viewport 안 series 데이터의 transmission_rate (노드가 없을 때)
      const seriesRates = chartData.series.flatMap((s) =>
        s.data
          .filter((p) => p.transmission_rate !== null && inWindow(p.period))
          .map((p) => p.transmission_rate as number),
      );
      if (seriesRates.length > 0) {
        const lo = Math.min(...seriesRates);
        const hi = Math.max(...seriesRates);
        const pad = Math.max((hi - lo) * 0.15, 0.5);
        return [lo - pad, hi + pad];
      }

      // fallback
      return [-1, 2];
    };

    // 초기 도메인: 진입 viewport (filterFrom/filterTo) 또는 전체 데이터 범위
    const initViewFrom = parseYM(filterFrom) ?? chartData.domainFrom;
    const initViewTo = parseYM(filterTo) ?? chartData.domainTo;
    const [initYMin, initYMax] = computeYDomain(initViewFrom, initViewTo);
    const yScale = d3
      .scaleLinear()
      .domain([initYMin, initYMax])
      .range([innerH, 0]);

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat('%Y-%m') as never);
    // BE-1: transmission_rate는 dimensionless ratio. * 100 + '%' 변환 금지.
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${(+d).toFixed(2)}`);

    root
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', 11);

    root
      .append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', 11);

    // Style axis lines
    root.selectAll('.domain, .tick line').attr('stroke', '#334155');

    // Grid lines
    root
      .append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickSize(-innerW)
          .tickFormat('' as never),
      )
      .selectAll('line')
      .attr('stroke', '#1e293b')
      .attr('stroke-dasharray', '3,3');
    root.select('.grid .domain').remove();

    // Chart group (clipped, for zoom)
    const chartGroup = root.append('g').attr('clip-path', `url(#${clipId})`);

    // BE-6: 전이율 기준선 — y=0 (역전 경계), y=1 (정상/과잉 경계).
    // viewport 도메인에 따라 보이거나 안 보임 (yScale.range 밖이면 자동 안 보임).
    const drawRefLine = (yVal: number, label: string, color: string) => {
      // YAXIS-1: viewport 도메인 밖이면 안 그림. zoom에서 갱신될 때도 동일 조건은 yScale.range 안에서 자동 처리됨.
      const yPx = yScale(yVal);
      chartGroup
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
      chartGroup
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

    // Event overlays (filtered by eventFilter)
    const activeEvents = eventFilter.length > 0
      ? events.filter((e) => eventFilter.includes(e.event_key))
      : [];

    for (const ev of activeEvents) {
      // P3-1: timezone 일관성 — services/timeseries.parseYYYYMM과 동일 로컬타임 파싱.
      const x0 = xScale(parseYearMonth(ev.start_date));
      const x1 = xScale(parseYearMonth(ev.end_date));
      chartGroup
        .append('rect')
        .attr('x', x0)
        .attr('y', 0)
        .attr('width', Math.max(0, x1 - x0))
        .attr('height', innerH)
        .attr('fill', ev.color_hex)
        .attr('opacity', 0.12);

      chartGroup
        .append('line')
        .attr('x1', x0)
        .attr('x2', x0)
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', ev.color_hex)
        .attr('stroke-width', 1)
        .attr('opacity', 0.5);
    }

    // Line + area generators — in_warmup_period 구간은 표시 제어 (spec §2/§3.3)
    type ChartPt = { period: Date; transmission_rate: number | null; in_warmup_period?: boolean };
    const lineGen = (xSc: d3.ScaleTime<number, number>, ySc: d3.ScaleLinear<number, number>) =>
      d3
        .line<ChartPt>()
        .defined((p) => p.transmission_rate !== null && !p.in_warmup_period)
        .x((p) => xSc(p.period))
        .y((p) => ySc(p.transmission_rate!))
        .curve(d3.curveCatmullRom.alpha(0.5));

    const areaGen = (xSc: d3.ScaleTime<number, number>, ySc: d3.ScaleLinear<number, number>) =>
      d3
        .area<ChartPt>()
        .defined((p) => p.transmission_rate !== null && !p.in_warmup_period)
        .x((p) => xSc(p.period))
        .y0(ySc(0))
        .y1((p) => ySc(p.transmission_rate!))
        .curve(d3.curveCatmullRom.alpha(0.5));

    // Draw series (secondary commodity dimmed at 40%)
    const drawSeries = (
      segId: SegmentId,
      data: { period: Date; transmission_rate: number | null }[],
      isSecondary: boolean,
      prefix = '',
    ) => {
      const colorMap = isSecondary ? SEGMENT_COLORS_SECONDARY : SEGMENT_COLORS_PRIMARY;
      const color = colorMap[segId] ?? '#94a3b8';
      const opacity = isSecondary ? 0.4 : 1;

      chartGroup
        .append('path')
        .datum(data)
        .attr('class', `${prefix}area-${segId}`)
        .attr('fill', color)
        .attr('opacity', isSecondary ? 0.08 : 0.15)
        .attr('d', areaGen(xScale, yScale));

      const path = chartGroup
        .append('path')
        .datum(data)
        .attr('class', `${prefix}line-${segId}`)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', isSecondary ? 1.5 : 2)
        .attr('opacity', opacity);

      // Entrance animation — dasharray로 라인 reveal. 종료 후 dasharray 제거(zoom 시
      // path geometry 변화로 인한 깜빡임 방지).
      // P2-3: 보조 곡선이 주 품목과 같은 클러스터면 진짜 점선 패턴 적용 (구분 강화).
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

    // Secondary series drawn first so primary renders on top
    if (secondaryChartData) {
      for (const s of secondaryChartData.series) {
        drawSeries(s.segment_id, s.data, true, 'sec-');
      }
    }

    for (const s of chartData.series) {
      drawSeries(s.segment_id, s.data, false);
    }

    // Anomaly nodes — UX-4: 줌 레벨 따라 cluster ↔ raw 동적 전환
    const anomalyGroup = chartGroup.append('g').attr('class', 'anomaly-nodes');
    const CLUSTER_K_THRESHOLD = 1.5;

    const renderAnomalyNodes = (
      currentXScale: d3.ScaleTime<number, number>,
      useCluster: boolean,
    ) => {
      anomalyGroup.selectAll('*').remove();
      const list = useCluster ? chartData.anomalies : chartData.rawAnomalies;
      for (const an of list) {
      const cx = currentXScale(an.period);
      const cy = yScale(an.transmission_rate);
      const r = ANOMALY_RADII[an.confidence_grade];
      const color = ANOMALY_COLORS[an.confidence_grade];
      const isSelected = an.anomaly_id === selectedAnomalyId;

      // 글로우 — high/medium 공통, 펄스 — high 전용 (web_plan §4.1)
      if (an.confidence_grade === 'high' || an.confidence_grade === 'medium') {
        const glow = anomalyGroup
          .append('circle')
          .attr('data-anomaly-glow', an.anomaly_id)
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', r + 3)
          .attr('fill', color)
          .attr('opacity', 0.25)
          .style('filter', `blur(${an.confidence_grade === 'high' ? 3 : 2}px)`)
          .style('pointer-events', 'none');
        if (an.confidence_grade === 'high') {
          glow.append('animate')
            .attr('attributeName', 'r')
            .attr('values', `${r + 2};${r + 6};${r + 2}`)
            .attr('dur', '1.6s')
            .attr('repeatCount', 'indefinite');
          glow.append('animate')
            .attr('attributeName', 'opacity')
            .attr('values', '0.35;0.1;0.35')
            .attr('dur', '1.6s')
            .attr('repeatCount', 'indefinite');
        }
      }

      const circle = anomalyGroup
        .append('circle')
        .attr('data-anomaly-id', an.anomaly_id)
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 0)
        .attr('fill', color)
        .attr('stroke', isSelected ? '#ffffff' : 'transparent')
        .attr('stroke-width', isSelected ? 2 : 0)
        .attr('cursor', 'pointer')
        .style('filter', isSelected ? 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' : 'none');

      // P1-4: 클러스터 카운트 배지 — cluster_size > 1 인 경우만
      if (an.cluster_size && an.cluster_size > 1) {
        const badge = anomalyGroup
          .append('g')
          .attr('data-anomaly-cluster', an.anomaly_id)
          .attr('transform', `translate(${cx + r + 2},${cy - r - 2})`);
        badge
          .append('circle')
          .attr('r', 7)
          .attr('fill', '#0f172a')
          .attr('stroke', color)
          .attr('stroke-width', 1.2);
        badge
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.32em')
          .attr('fill', color)
          .attr('font-size', '9px')
          .attr('font-weight', '700')
          .style('pointer-events', 'none')
          .text(`+${an.cluster_size - 1}`);
      }

      // NEW 배지 — 신규 탐지 노드 (web_plan §4.1)
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

      circle
        .transition()
        .delay(ANIMATION_DURATION * 0.6)
        .duration(300)
        .ease(d3.easeBackOut.overshoot(1.5))
        .attr('r', r);

      circle.on('click', () => {
        selectAnomaly(an.anomaly_id);
      });

      // Tooltip
      circle
        .on('mouseenter', function (event: MouseEvent) {
          d3.select(this).attr('r', r * 1.4);
          showTooltip(event, an.periodStr, an.confidence_grade, an.transmission_rate, an.primary_pattern);
        })
        .on('mousemove', (event: MouseEvent) => {
          moveTooltip(event);
        })
        .on('mouseleave', function () {
          d3.select(this).attr('r', r);
          hideTooltip();
        });
      } // end for-anomaly
    }; // end renderAnomalyNodes

    // 최초 렌더: 클러스터 모드
    renderAnomalyNodes(xScale, true);
    let lastUseCluster = true;

    // Zoom behavior — ZOOM-1
    // - base xScale.domain = 전체 데이터 범위. viewport는 transform으로 표현 → 휠 줌이 누적됨.
    // - 마우스 포인터 기준 focal zoom (d3.zoom 기본 동작).
    // - 더블클릭 = 2배 확대 (d3.zoom 기본 동작, 마우스 포인터 기준).
    // - push는 debounce — 줌 멈춘 후 200ms에만 Zustand 갱신 (미니맵 동기).
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 30])
      .translateExtent([
        [0, 0],
        [innerW, innerH],
      ])
      .extent([
        [0, 0],
        [innerW, innerH],
      ])
      .wheelDelta((event) => {
        return -event.deltaY * (event.deltaMode === 1 ? 0.06 : event.deltaMode ? 1 : 0.0025);
      })
      .on('end', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        if (!event.sourceEvent) return;
        if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
        pushTimerRef.current = setTimeout(() => {
          const newXScale = event.transform.rescaleX(xScale);
          const [d0, d1] = newXScale.domain() as [Date, Date];
          const toYM = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const fromYM = toYM(d0);
          const toYMStr = toYM(d1);
          lastPushedRef.current = { from: fromYM, to: toYMStr };
          setFilterFrom(fromYM);
          setFilterTo(toYMStr);
        }, 200);
      })
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        const transform = event.transform;
        const newXScale = transform.rescaleX(xScale);
        // YAXIS-1: viewport에 보이는 노드 기준 yScale 동적 갱신.
        const [vFrom, vTo] = newXScale.domain() as [Date, Date];
        const [newYMin, newYMax] = computeYDomain(vFrom, vTo);
        yScale.domain([newYMin, newYMax]);

        // Redraw axes (X + Y)
        root
          .select<SVGGElement>('.x-axis')
          .call(d3.axisBottom(newXScale).ticks(6).tickFormat(d3.timeFormat('%Y-%m') as never));
        root.select('.x-axis').selectAll('text').attr('fill', '#94a3b8').attr('font-size', 11);
        root
          .select<SVGGElement>('.y-axis')
          .call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${(+d).toFixed(2)}`));
        root.select('.y-axis').selectAll('text').attr('fill', '#94a3b8').attr('font-size', 11);
        root.selectAll('.domain, .tick line').attr('stroke', '#334155');

        // Y 그리드 재계산
        root
          .select<SVGGElement>('.grid')
          .call(
            d3
              .axisLeft(yScale)
              .ticks(5)
              .tickSize(-innerW)
              .tickFormat('' as never),
          )
          .selectAll('line')
          .attr('stroke', '#1e293b')
          .attr('stroke-dasharray', '3,3');
        root.select('.grid .domain').remove();

        // Redraw lines and areas (yScale 도 변경되었으므로 둘 다 반영)
        if (secondaryChartData) {
          for (const s of secondaryChartData.series) {
            chartGroup
              .select(`.sec-line-${s.segment_id}`)
              .attr('d', lineGen(newXScale, yScale)(s.data) ?? '');
            chartGroup
              .select(`.sec-area-${s.segment_id}`)
              .attr('d', areaGen(newXScale, yScale)(s.data) ?? '');
          }
        }
        for (const s of chartData.series) {
          chartGroup
            .select(`.line-${s.segment_id}`)
            .attr('d', lineGen(newXScale, yScale)(s.data) ?? '');
          chartGroup
            .select(`.area-${s.segment_id}`)
            .attr('d', areaGen(newXScale, yScale)(s.data) ?? '');
        }

        // UX-4: cluster ↔ raw 모드 결정. 모드 전환 시에만 재구성 (애니메이션 재발화 최소화).
        const useCluster = transform.k <= CLUSTER_K_THRESHOLD;
        if (useCluster !== lastUseCluster) {
          renderAnomalyNodes(newXScale, useCluster);
          lastUseCluster = useCluster;
        } else {
          // YAXIS-1: yScale도 변경됐으므로 cy까지 재계산
          const list = useCluster ? chartData.anomalies : chartData.rawAnomalies;
          for (const an of list) {
            const newCx = newXScale(an.period);
            const newCy = yScale(an.transmission_rate);
            chartGroup
              .select<SVGCircleElement>(`[data-anomaly-id="${an.anomaly_id}"]`)
              .attr('cx', newCx)
              .attr('cy', newCy);
            chartGroup
              .select<SVGCircleElement>(`[data-anomaly-glow="${an.anomaly_id}"]`)
              .attr('cx', newCx)
              .attr('cy', newCy);
            chartGroup
              .select<SVGTextElement>(`[data-anomaly-new="${an.anomaly_id}"]`)
              .attr('x', newCx)
              .attr('y', newCy - ANOMALY_RADII[an.confidence_grade] - 6);
            chartGroup
              .select<SVGGElement>(`[data-anomaly-cluster="${an.anomaly_id}"]`)
              .attr('transform', `translate(${newCx + ANOMALY_RADII[an.confidence_grade] + 2},${newCy - ANOMALY_RADII[an.confidence_grade] - 2})`);
          }
        }

        // BE-6 기준선 (y=0, y=1) 위치 재계산
        chartGroup.selectAll<SVGLineElement, unknown>('.ref-line').each(function () {
          const sel = d3.select(this);
          const yVal = Number(sel.attr('data-yval'));
          if (!Number.isNaN(yVal)) {
            const yPx = yScale(yVal);
            sel.attr('y1', yPx).attr('y2', yPx);
          }
        });
        chartGroup.selectAll<SVGTextElement, unknown>('.ref-label').each(function () {
          const sel = d3.select(this);
          const yVal = Number(sel.attr('data-yval'));
          if (!Number.isNaN(yVal)) {
            sel.attr('y', yScale(yVal) - 3);
          }
        });

        // Reposition event overlays
        let i = 0;
        for (const ev of activeEvents) {
          const x0 = newXScale(parseYearMonth(ev.start_date));
          const x1 = newXScale(parseYearMonth(ev.end_date));
          chartGroup.selectAll('rect').filter((_, idx) => idx === i).attr('x', x0).attr('width', Math.max(0, x1 - x0));
          chartGroup.selectAll('line').filter((_, idx) => idx === i).attr('x1', x0).attr('x2', x0);
          i++;
        }
      });

    svg.call(zoom);

    // ZOOM-1: ref 저장 — 외부 filter 변경 시 transform 적용용
    zoomBehaviorRef.current = zoom;
    xScaleRef.current = xScale;
    innerWRef.current = innerW;

    // 초기 viewport 적용: filterFrom/filterTo가 있으면 그에 해당하는 transform 계산
    if (filterFrom && filterTo) {
      const fromDate = parseYM(filterFrom);
      const toDate = parseYM(filterTo);
      if (fromDate && toDate && toDate > fromDate) {
        const fromPx = xScale(fromDate);
        const toPx = xScale(toDate);
        const k = innerW / (toPx - fromPx);
        const tx = -fromPx * k;
        const initialTransform = d3.zoomIdentity.translate(tx, 0).scale(k);
        // 프로그래매틱 호출 → onEnd가 무시 (sourceEvent null)
        svg.call(zoom.transform, initialTransform);
        lastPushedRef.current = { from: filterFrom, to: filterTo };
      }
    }
  }, [chartData, secondaryChartData, selectedAnomalyId, events, eventFilter, sameCluster, setFilterFrom, setFilterTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ZOOM-1: 외부 filter 변경 동기화 — FilterBar 프리셋·미니맵 브러시 등 외부 트리거 반영
  useEffect(() => {
    const svgEl = svgRef.current;
    const zoomBehavior = zoomBehaviorRef.current;
    const xScale = xScaleRef.current;
    const innerW = innerWRef.current;
    if (!svgEl || !zoomBehavior || !xScale || innerW <= 0) return;
    if (!filterFrom || !filterTo) return;
    // 자기 push 가드 — 방금 zoom이 push한 값이면 다시 transform 호출 안 함
    if (lastPushedRef.current.from === filterFrom && lastPushedRef.current.to === filterTo) return;

    const fromDate = new Date(Number(filterFrom.split('-')[0]), Number(filterFrom.split('-')[1]) - 1, 1);
    const toDate = new Date(Number(filterTo.split('-')[0]), Number(filterTo.split('-')[1]) - 1, 1);
    if (!(toDate > fromDate)) return;
    const fromPx = xScale(fromDate);
    const toPx = xScale(toDate);
    if (toPx <= fromPx) return;
    const k = innerW / (toPx - fromPx);
    const tx = -fromPx * k;
    const newTransform = d3.zoomIdentity.translate(tx, 0).scale(k);
    d3.select(svgEl).transition().duration(250).call(zoomBehavior.transform, newTransform);
    lastPushedRef.current = { from: filterFrom, to: filterTo };
  }, [filterFrom, filterTo]);

  // Tooltip helpers (DOM-based)
  function showTooltip(
    event: MouseEvent,
    period: string,
    grade: string,
    rate: number,
    pattern: string,
  ) {
    let tip = document.getElementById('stream-chart-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'stream-chart-tooltip';
      tip.style.cssText =
        'position:fixed;pointer-events:none;background:#1e293b;border:1px solid #334155;border-radius:6px;padding:8px 12px;font-size:12px;color:#f1f5f9;z-index:9999;white-space:nowrap;';
      document.body.appendChild(tip);
    }
    const gradeLabel: Record<string, string> = { high: '고신뢰', medium: '중신뢰', reference: '참고' };
    // BE-1: 전이율은 비율값 그대로 표시 + 영역 라벨 (역전/정상/과잉).
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

  // Resize observer: redraw on container resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      // Force re-run by triggering chartData dependency via the useEffect above
      if (chartData && svgRef.current && containerRef.current) {
        svgRef.current.dispatchEvent(new Event('resize-redraw'));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [chartData]);

  if (!primaryCommodityId) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        품목을 선택하세요
      </div>
    );
  }

  if (primaryLoading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        로딩 중…
      </div>
    );
  }

  if (primaryError) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">
        데이터를 불러오지 못했습니다
      </div>
    );
  }

  // "이상 없음" 빈 상태 — 로딩/에러 통과 후 anomalies 0건 (web_plan §4.1)
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
