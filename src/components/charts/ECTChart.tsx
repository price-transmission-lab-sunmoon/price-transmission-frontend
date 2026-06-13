import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PANEL_CHART_COLORS } from '@/utils/colorUtils';
import { CHART_THEME } from '@/utils/chartTheme';
import { parseYearMonth } from '@/utils/dateUtils';
import { attachHoverOverlay, removeHoverTooltip } from '@/utils/chartHover';
import type { EctDataPoint } from '@/types/anomaly';

interface Props {
  data: EctDataPoint[];
  ectType?: string | null;
  height?: number;
}

// 패널 표준 margin과 left만 다름(52). ECT y축 라벨이 더 넓어 자체 유지.
const MARGIN = { top: 12, right: 12, bottom: 24, left: 52 };

export function ECTChart({ data, ectType, height = 200 }: Props) {
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
      (d) => d.ect_or_spread !== null && isFinite(d.ect_or_spread as number),
    );
    if (valid.length === 0) return;

    const x = d3
      .scaleTime()
      .domain(d3.extent(valid, (d) => parseYearMonth(d.period)) as [Date, Date])
      .range([0, w]);

    const vals = valid.map((d) => d.ect_or_spread as number);
    const yMin = Math.min(...vals);
    const yMax = Math.max(...vals);
    const pad = (yMax - yMin) * 0.15 || 0.05;
    const y = d3
      .scaleLinear()
      .domain([yMin - pad, yMax + pad])
      .range([h, 0]);

    const zero = y(0);
    if (zero >= 0 && zero <= h) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', w)
        .attr('y1', zero)
        .attr('y2', zero)
        .attr('stroke', PANEL_CHART_COLORS.ectZeroLine)
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.4);
    }

    const line = d3
      .line<EctDataPoint>()
      .defined((d) => d.ect_or_spread !== null)
      .x((d) => x(parseYearMonth(d.period)))
      .y((d) => y(d.ect_or_spread as number));
    g.append('path')
      .datum(valid)
      .attr('fill', 'none')
      .attr('stroke', PANEL_CHART_COLORS.ectLine)
      .attr('stroke-width', 1.5)
      .attr('d', line);

    if (ectType) {
      g.append('text')
        .attr('x', w)
        .attr('y', -2)
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .attr('fill', CHART_THEME.axisText)
        .text(ectType);
    }

    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(4))
      .attr('color', CHART_THEME.axisText);
    g.append('g').call(d3.axisLeft(y).ticks(4)).attr('color', CHART_THEME.axisText);

    attachHoverOverlay({
      g,
      containerRef,
      data: valid,
      x,
      y,
      width: w,
      height: h,
      margin: MARGIN,
      getDate: (d) => parseYearMonth(d.period),
      tooltipId: 'ect-chart-tip',
      buildHover: (d) => ({
        datum: d,
        date: parseYearMonth(d.period),
        values: [
          { label: ectType ?? 'ECT', value: d.ect_or_spread, color: PANEL_CHART_COLORS.ectLine },
        ],
      }),
    });
  }, [data, ectType, height]);

  useEffect(() => () => removeHoverTooltip('ect-chart-tip'), []);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-tertiary text-[12px]"
        style={{ height }}
      >
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
