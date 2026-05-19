import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PANEL_CHART_COLORS, ANOMALY_COLORS } from '@/utils/colorUtils';
import type { MlMapPoint } from '@/types/anomaly';

interface Props {
  points: MlMapPoint[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
}

const MARGIN = { top: 12, right: 12, bottom: 36, left: 44 };

export function MLMapChart({ points, xLabel, yLabel, height = 240 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || points.length === 0) return;

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

    // filter valid — PARSE-NUM-002
    const valid = points.filter(
      (p) => isFinite(p.x_value) && isFinite(p.y_value),
    );
    if (valid.length === 0) return;

    const xExt = d3.extent(valid, (p) => p.x_value) as [number, number];
    const yExt = d3.extent(valid, (p) => p.y_value) as [number, number];
    const xPad = (xExt[1] - xExt[0]) * 0.1 || 0.5;
    const yPad = (yExt[1] - yExt[0]) * 0.1 || 0.5;

    const x = d3.scaleLinear().domain([xExt[0] - xPad, xExt[1] + xPad]).range([0, w]);
    const y = d3.scaleLinear().domain([yExt[0] - yPad, yExt[1] + yPad]).range([h, 0]);

    // anomaly score color gradient — low to high
    const scoreExt = d3.extent(valid, (p) => p.anomaly_score) as [number, number];
    const colorScale = d3
      .scaleSequential()
      .domain(scoreExt)
      .interpolator(d3.interpolateRgb('#4a5568', ANOMALY_COLORS.high));

    // normal points
    g.selectAll('.normal-dot')
      .data(valid.filter((p) => !p.is_highlight))
      .join('circle')
      .attr('class', 'normal-dot')
      .attr('cx', (p) => x(p.x_value))
      .attr('cy', (p) => y(p.y_value))
      .attr('r', 3)
      .attr('fill', (p) => p.is_anomaly ? colorScale(p.anomaly_score) : PANEL_CHART_COLORS.mlMapNormalFill)
      .attr('opacity', 0.7);

    // highlight point (current anomaly)
    const highlighted = valid.filter((p) => p.is_highlight);
    g.selectAll('.highlight-dot')
      .data(highlighted)
      .join('circle')
      .attr('class', 'highlight-dot')
      .attr('cx', (p) => x(p.x_value))
      .attr('cy', (p) => y(p.y_value))
      .attr('r', 6)
      .attr('fill', ANOMALY_COLORS.high)
      .attr('stroke', PANEL_CHART_COLORS.mlMapHighlight)
      .attr('stroke-width', 2);

    // axes
    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(4)).attr('color', '#64748b');
    g.append('g').call(d3.axisLeft(y).ticks(4)).attr('color', '#64748b');

    // axis labels from API response
    if (xLabel) {
      g.append('text')
        .attr('x', w / 2).attr('y', h + 32)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px').attr('fill', '#94a3b8')
        .text(xLabel);
    }
    if (yLabel) {
      g.append('text')
        .attr('transform', `rotate(-90)`)
        .attr('x', -h / 2).attr('y', -36)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px').attr('fill', '#94a3b8')
        .text(yLabel);
    }
  }, [points, xLabel, yLabel, height]);

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-xs" style={{ height }}>
        ML 결과맵 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}
