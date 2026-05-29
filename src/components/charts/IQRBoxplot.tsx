import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PANEL_CHART_COLORS } from '@/utils/colorUtils';
import { CHART_THEME } from '@/utils/chartTheme';
import type { StatSnapshotIqrResponse } from '@/types/anomaly';

interface Props {
  data: StatSnapshotIqrResponse;
  height?: number;
}

const MARGIN = { top: 20, right: 20, bottom: 20, left: 20 };

// @guide:CHART-11
export function IQRBoxplot({ data, height = 180 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

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

    const { q1, median, q3 } = data;
    const iqrLower = data.iqr_lower;
    const iqrUpper = data.iqr_upper;
    const currentValue = data.current_value;
    const allVals = [iqrLower, q1, median, q3, iqrUpper, currentValue];
    const yMin = Math.min(...allVals);
    const yMax = Math.max(...allVals);
    const pad = (yMax - yMin) * 0.15 || 0.1;

    const y = d3.scaleLinear().domain([yMin - pad, yMax + pad]).range([h, 0]);
    const cx = w / 2;
    const boxW = Math.min(60, w * 0.4);

    // whiskers
    [[iqrLower, q1], [q3, iqrUpper]].forEach(([lo, hi]) => {
      g.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', y(lo)).attr('y2', y(hi))
        .attr('stroke', PANEL_CHART_COLORS.iqrMedianLine)
        .attr('stroke-width', 1);
      [lo, hi].forEach((v) => {
        g.append('line')
          .attr('x1', cx - boxW / 4).attr('x2', cx + boxW / 4)
          .attr('y1', y(v)).attr('y2', y(v))
          .attr('stroke', PANEL_CHART_COLORS.iqrMedianLine)
          .attr('stroke-width', 1);
      });
    });

    // box Q1~Q3
    g.append('rect')
      .attr('x', cx - boxW / 2)
      .attr('y', y(q3))
      .attr('width', boxW)
      .attr('height', y(q1) - y(q3))
      .attr('fill', PANEL_CHART_COLORS.iqrBoxFill)
      .attr('stroke', PANEL_CHART_COLORS.iqrMedianLine)
      .attr('stroke-width', 1);

    // median line
    g.append('line')
      .attr('x1', cx - boxW / 2).attr('x2', cx + boxW / 2)
      .attr('y1', y(median)).attr('y2', y(median))
      .attr('stroke', PANEL_CHART_COLORS.iqrMedianLine)
      .attr('stroke-width', 2);

    // current value marker
    g.append('circle')
      .attr('cx', cx)
      .attr('cy', y(currentValue))
      .attr('r', 5)
      .attr('fill', PANEL_CHART_COLORS.iqrCurrentMarker);

    // y axis
    g.append('g').call(d3.axisLeft(y).ticks(5)).attr('color', CHART_THEME.axisText);

    // current value label
    g.append('text')
      .attr('x', cx + boxW / 2 + 6)
      .attr('y', y(currentValue) + 4)
      .attr('font-size', '10px')
      .attr('fill', PANEL_CHART_COLORS.iqrCurrentMarker)
      .text(currentValue.toFixed(2));
  }, [data, height]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}
