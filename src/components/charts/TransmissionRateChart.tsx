import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { parse } from 'date-fns';
import { PANEL_CHART_COLORS, ANOMALY_COLORS } from '@/utils/colorUtils';
import { attachHoverOverlay, removeHoverTooltip } from '@/utils/chartHover';
import type { TransmissionRateDataPoint } from '@/types/anomaly';

interface Props {
  data: TransmissionRateDataPoint[];
  highlightPeriod?: string;
  height?: number;
}

const MARGIN = { top: 12, right: 12, bottom: 24, left: 44 };

function parseMonth(s: string): Date {
  return parse(s, 'yyyy-MM', new Date());
}

export function TransmissionRateChart({ data, highlightPeriod, height = 200 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || data.length === 0) return;

    const width = container.getBoundingClientRect().width;
    if (width === 0) return; // FE-D3-003

    const w = width - MARGIN.left - MARGIN.right;
    const h = height - MARGIN.top - MARGIN.bottom;

    d3.select(svg).selectAll('*').remove();

    const g = d3
      .select(svg)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // filter valid points — PARSE-NUM-002
    const valid = data.filter(
      (d) => d.transmission_rate !== null && isFinite(d.transmission_rate as number),
    );
    if (valid.length === 0) return; // FE-D3-001

    const x = d3
      .scaleTime()
      .domain(d3.extent(valid, (d) => parseMonth(d.period)) as [Date, Date])
      .range([0, w]);

    const allVals = valid.flatMap((d) => [
      d.transmission_rate as number,
      d.q1 ?? Infinity,
      d.q3 ?? -Infinity,
    ]);
    const yMin = Math.min(...allVals.filter(isFinite));
    const yMax = Math.max(...allVals.filter(isFinite));
    const pad = (yMax - yMin) * 0.1 || 0.1;
    const y = d3.scaleLinear().domain([yMin - pad, yMax + pad]).range([h, 0]);

    // Q1~Q3 band
    const bandData = valid.filter((d) => d.q1 !== null && d.q3 !== null);
    if (bandData.length > 1) {
      const area = d3
        .area<TransmissionRateDataPoint>()
        .x((d) => x(parseMonth(d.period)))
        .y0((d) => y(d.q1 as number))
        .y1((d) => y(d.q3 as number));
      g.append('path')
        .datum(bandData)
        .attr('fill', PANEL_CHART_COLORS.q1q3Band)
        .attr('opacity', 0.15)
        .attr('d', area);
    }

    // rolling mean line
    const meanData = valid.filter((d) => d.rolling_mean !== null);
    if (meanData.length > 1) {
      const line = d3
        .line<TransmissionRateDataPoint>()
        .x((d) => x(parseMonth(d.period)))
        .y((d) => y(d.rolling_mean as number));
      g.append('path')
        .datum(meanData)
        .attr('fill', 'none')
        .attr('stroke', PANEL_CHART_COLORS.rollingMeanLine)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4 2')
        .attr('d', line);
    }

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

    // highlight period vertical line
    if (highlightPeriod) {
      const hx = x(parseMonth(highlightPeriod));
      g.append('line')
        .attr('x1', hx)
        .attr('x2', hx)
        .attr('y1', 0)
        .attr('y2', h)
        .attr('stroke', ANOMALY_COLORS.high)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3 2');
    }

    // axes
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
      tooltipId: 'tr-chart-tip',
      buildHover: (d) => ({
        datum: d,
        date: parseMonth(d.period),
        values: [
          { label: '전이율', value: d.transmission_rate, color: PANEL_CHART_COLORS.transmissionRateLine },
          { label: 'Rolling Mean', value: d.rolling_mean, color: PANEL_CHART_COLORS.rollingMeanLine },
          { label: 'Q1', value: d.q1 },
          { label: 'Q3', value: d.q3 },
        ],
      }),
    });
  }, [data, highlightPeriod, height]);

  useEffect(() => () => removeHoverTooltip('tr-chart-tip'), []);

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
