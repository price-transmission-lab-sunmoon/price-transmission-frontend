import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { useAppStore } from '@/stores/useAppStore';
import { useStreamData } from '@/hooks/useStreamData';
import { buildStreamChartData } from '@/services/timeseries';
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

  const primaryCommodityId = useAppStore((s) => s.primaryCommodityId);
  const secondaryCommodityId = useAppStore((s) => s.secondaryCommodityId);
  const activeSegments = useAppStore((s) => s.activeSegments);
  const confidenceFilter = useAppStore((s) => s.confidenceFilter);
  const eventFilter = useAppStore((s) => s.eventFilter);
  const events = useAppStore((s) => s.events);
  const selectedAnomalyId = useAppStore((s) => s.selectedAnomalyId);
  const selectAnomaly = useAppStore((s) => s.selectAnomaly);

  const { data: primaryData, isLoading: primaryLoading, isError: primaryError } = useStreamData();

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

    const segmentSet = new Set(activeSegments);
    const candidates = primaryData.anomaly_nodes
      .filter((n) => n.confidence_grade === 'high' && segmentSet.has(n.segment_id as SegmentId))
      .sort((a, b) => (b.period > a.period ? 1 : -1));

    if (candidates.length > 0) {
      selectAnomaly(candidates[0].anomaly_id);
    }
  }, [primaryData, primaryCommodityId]); // eslint-disable-line react-hooks/exhaustive-deps

  const chartData = useMemo(() => {
    if (!primaryData) return null;
    return buildStreamChartData(primaryData, activeSegments, confidenceFilter);
  }, [primaryData, activeSegments, confidenceFilter]);

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

    // Scales
    const xScale = d3
      .scaleTime()
      .domain([chartData.domainFrom, chartData.domainTo])
      .range([0, innerW]);

    const allRates = chartData.series.flatMap((s) =>
      s.data.map((p) => p.transmission_rate).filter((v): v is number => v !== null),
    );
    const [yMin, yMax] = d3.extent(allRates) as [number, number];
    const yPad = (yMax - yMin) * 0.1 || 0.05;
    const yScale = d3
      .scaleLinear()
      .domain([Math.max(0, yMin - yPad), yMax + yPad])
      .range([innerH, 0])
      .nice();

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat('%Y-%m') as never);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${(+d * 100).toFixed(0)}%`);

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

    // Event overlays (filtered by eventFilter)
    const activeEvents = eventFilter.length > 0
      ? events.filter((e) => eventFilter.includes(e.event_key))
      : [];

    for (const ev of activeEvents) {
      const x0 = xScale(new Date(ev.start_date + '-01'));
      const x1 = xScale(new Date(ev.end_date + '-01'));
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
    type ChartPt = { period: Date; transmission_rate: number | null; in_warmup_period: boolean };
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
    ) => {
      const colorMap = isSecondary ? SEGMENT_COLORS_SECONDARY : SEGMENT_COLORS_PRIMARY;
      const color = colorMap[segId] ?? '#94a3b8';
      const opacity = isSecondary ? 0.4 : 1;

      chartGroup
        .append('path')
        .datum(data)
        .attr('class', `area-${segId}`)
        .attr('fill', color)
        .attr('opacity', isSecondary ? 0.08 : 0.15)
        .attr('d', areaGen(xScale, yScale));

      const path = chartGroup
        .append('path')
        .datum(data)
        .attr('class', `line-${segId}`)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', isSecondary ? 1.5 : 2)
        .attr('opacity', opacity);

      // Entrance animation
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
          .attr('stroke-dashoffset', 0);
      }
    };

    for (const s of chartData.series) {
      drawSeries(s.segment_id, s.data, false);
    }

    // Secondary commodity series if available (uses same activeSegments)
    // Secondary data is loaded by a separate hook in a future branch; skip here.

    // Anomaly nodes
    const anomalyGroup = chartGroup.append('g').attr('class', 'anomaly-nodes');

    for (const an of chartData.anomalies) {
      const cx = xScale(an.period);
      const cy = yScale(an.transmission_rate);
      const r = ANOMALY_RADII[an.confidence_grade];
      const color = ANOMALY_COLORS[an.confidence_grade];
      const isSelected = an.anomaly_id === selectedAnomalyId;

      // 글로우 — high/medium 공통, 펄스 — high 전용 (web_plan §4.1)
      if (an.confidence_grade === 'high' || an.confidence_grade === 'medium') {
        const glow = anomalyGroup
          .append('circle')
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

      // NEW 배지 — 신규 탐지 노드 (web_plan §4.1)
      if (an.is_new) {
        anomalyGroup
          .append('text')
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
    }

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 10])
      .translateExtent([
        [0, 0],
        [innerW, innerH],
      ])
      .extent([
        [0, 0],
        [innerW, innerH],
      ])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        const transform = event.transform;
        const newXScale = transform.rescaleX(xScale);

        // Redraw axes
        root
          .select<SVGGElement>('.x-axis')
          .call(d3.axisBottom(newXScale).ticks(6).tickFormat(d3.timeFormat('%Y-%m') as never));
        root.select('.x-axis').selectAll('text').attr('fill', '#94a3b8').attr('font-size', 11);
        root.selectAll('.domain, .tick line').attr('stroke', '#334155');

        // Redraw lines and areas
        for (const s of chartData.series) {
          chartGroup
            .select(`.line-${s.segment_id}`)
            .attr('d', lineGen(newXScale, yScale)(s.data) ?? '');
          chartGroup
            .select(`.area-${s.segment_id}`)
            .attr('d', areaGen(newXScale, yScale)(s.data) ?? '');
        }

        // Reposition anomaly nodes
        for (const an of chartData.anomalies) {
          chartGroup
            .select<SVGCircleElement>(`[data-anomaly-id="${an.anomaly_id}"]`)
            .attr('cx', newXScale(an.period));
        }

        // Reposition event overlays
        let i = 0;
        for (const ev of activeEvents) {
          const x0 = newXScale(new Date(ev.start_date + '-01'));
          const x1 = newXScale(new Date(ev.end_date + '-01'));
          chartGroup.selectAll('rect').filter((_, idx) => idx === i).attr('x', x0).attr('width', Math.max(0, x1 - x0));
          chartGroup.selectAll('line').filter((_, idx) => idx === i).attr('x1', x0).attr('x2', x0);
          i++;
        }
      });

    svg.call(zoom);
  }, [chartData, selectedAnomalyId, events, eventFilter]); // eslint-disable-line react-hooks/exhaustive-deps

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
    tip.innerHTML = `<div style="font-weight:600;margin-bottom:4px">${period}</div><div>등급: ${gradeLabel[grade] ?? grade}</div><div>전달률: ${(rate * 100).toFixed(1)}%</div><div>패턴: ${pattern}</div>`;
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
