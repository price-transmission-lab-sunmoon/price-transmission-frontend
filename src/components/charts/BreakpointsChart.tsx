import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { parse } from 'date-fns';
import { PANEL_CHART_COLORS } from '@/utils/colorUtils';
import { attachHoverOverlay, removeHoverTooltip } from '@/utils/chartHover';
import type { TransmissionRateDataPoint } from '@/types/anomaly';

interface Props {
  data: TransmissionRateDataPoint[];
  bpDates?: string[];
  height?: number;
}

const MARGIN = { top: 12, right: 12, bottom: 24, left: 44 };

function parseMonth(s: string): Date {
  return parse(s, 'yyyy-MM', new Date());
}

export function BreakpointsChart({ data, bpDates = [], height = 200 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || data.length === 0) return;

    const width = container.getBoundingClientRect().width;
    if (width === 0) return;

    const w = width - MARGIN.left - MARGIN.right;
    const h = height - MARGIN.top - MARGIN.bottom;

    d3.select(svg).selectAll('*').remove();

    const g = d3
      .select(svg)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    const valid = data.filter(
      (d) => d.transmission_rate !== null && isFinite(d.transmission_rate as number),
    );
    if (valid.length === 0) return;

    const x = d3
      .scaleTime()
      .domain(d3.extent(valid, (d) => parseMonth(d.period)) as [Date, Date])
      .range([0, w]);

    const vals = valid.map((d) => d.transmission_rate as number);
    const yMin = Math.min(...vals);
    const yMax = Math.max(...vals);
    const pad = (yMax - yMin) * 0.1 || 0.1;
    const y = d3.scaleLinear().domain([yMin - pad, yMax + pad]).range([h, 0]);

    // transmission rate line
    const line = d3
      .line<TransmissionRateDataPoint>()
      .defined((d) => d.transmission_rate !== null)
      .x((d) => x(parseMonth(d.period)))
      .y((d) => y(d.transmission_rate as number));
    g.append('path')
      .datum(valid)
      .attr('fill', 'none')
      .attr('stroke', PANEL_CHART_COLORS.transmissionRateLine)
      .attr('stroke-width', 1.5)
      .attr('d', line);

    // bp_dates vertical lines
    bpDates.forEach((bp) => {
      const bx = x(parseMonth(bp));
      g.append('line')
        .attr('x1', bx).attr('x2', bx)
        .attr('y1', 0).attr('y2', h)
        .attr('stroke', PANEL_CHART_COLORS.breakpointsLine)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4 2');
    });

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(4)).attr('color', '#64748b');
    g.append('g').call(d3.axisLeft(y).ticks(4)).attr('color', '#64748b');

    // FX-5: hover overlay
    attachHoverOverlay({
      g,
      containerRef,
      data: valid,
      x,
      y,
      width: w,
      height: h,
      margin: MARGIN,
      getDate: (d) => parseMonth(d.period),
      tooltipId: 'bp-chart-tip',
      buildHover: (d) => ({
        datum: d,
        date: parseMonth(d.period),
        values: [
          { label: '전이율', value: d.transmission_rate, color: PANEL_CHART_COLORS.transmissionRateLine },
          { label: '구조변화점', value: d.is_breakpoint ? 1 : 0, color: PANEL_CHART_COLORS.breakpointsLine },
        ],
      }),
    });
  }, [data, bpDates, height]);

  useEffect(() => () => removeHoverTooltip('bp-chart-tip'), []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-xs" style={{ height }}>
        해당 기간 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}
