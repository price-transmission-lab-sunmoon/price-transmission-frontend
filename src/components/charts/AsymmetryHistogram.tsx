import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PANEL_CHART_COLORS } from '@/utils/colorUtils';
import { CHART_THEME } from '@/utils/chartTheme';
import type { StatSnapshotAsymmetryResponse } from '@/types/anomaly';

interface Props {
  data: StatSnapshotAsymmetryResponse;
  height?: number;
}

const MARGIN = { top: 12, right: 12, bottom: 28, left: 36 };
const BIN_COUNT = 20;

export function AsymmetryHistogram({ data, height = 180 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    const width = container.getBoundingClientRect().width;
    if (width === 0) return;

    // PM 별건 #3: 'symmetric' 분기 — 데이터가 없으면 렌더링 생략
    if (data.up_samples.length === 0 && data.down_samples.length === 0) return;

    const w = width - MARGIN.left - MARGIN.right;
    const h = height - MARGIN.top - MARGIN.bottom;

    d3.select(svg).selectAll('*').remove();

    const g = d3
      .select(svg)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    const allSamples = [...data.up_samples, ...data.down_samples];
    const xMin = d3.min(allSamples) ?? 0;
    const xMax = d3.max(allSamples) ?? 1;

    const x = d3.scaleLinear().domain([xMin, xMax]).range([0, w]);
    const binner = d3.bin().domain([xMin, xMax]).thresholds(BIN_COUNT);

    const upBins = binner(data.up_samples);
    const downBins = binner(data.down_samples);

    const yMax = Math.max(
      d3.max(upBins, (b) => b.length) ?? 0,
      d3.max(downBins, (b) => b.length) ?? 0,
    );
    const y = d3.scaleLinear().domain([0, yMax]).range([h, 0]);

    // down bins
    g.selectAll('.down-bar')
      .data(downBins)
      .join('rect')
      .attr('class', 'down-bar')
      .attr('x', (b) => x(b.x0 ?? 0))
      .attr('width', (b) => Math.max(0, x(b.x1 ?? 0) - x(b.x0 ?? 0) - 1))
      .attr('y', (b) => y(b.length))
      .attr('height', (b) => h - y(b.length))
      .attr('fill', PANEL_CHART_COLORS.asymmetryDownBin)
      .attr('opacity', 0.6);

    // up bins
    g.selectAll('.up-bar')
      .data(upBins)
      .join('rect')
      .attr('class', 'up-bar')
      .attr('x', (b) => x(b.x0 ?? 0))
      .attr('width', (b) => Math.max(0, x(b.x1 ?? 0) - x(b.x0 ?? 0) - 1))
      .attr('y', (b) => y(b.length))
      .attr('height', (b) => h - y(b.length))
      .attr('fill', PANEL_CHART_COLORS.asymmetryUpBin)
      .attr('opacity', 0.6);

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(5)).attr('color', CHART_THEME.axisText);
    g.append('g').call(d3.axisLeft(y).ticks(4)).attr('color', CHART_THEME.axisText);
  }, [data, height]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}
