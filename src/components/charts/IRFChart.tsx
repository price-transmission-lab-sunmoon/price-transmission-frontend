import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PANEL_CHART_COLORS } from '@/utils/colorUtils';
import type { IrfCurve } from '@/types/anomaly';

interface Props {
  irfs: IrfCurve[];
  height?: number;
}

const MARGIN = { top: 12, right: 12, bottom: 28, left: 44 };

export function IRFChart({ irfs, height = 240 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || irfs.length === 0) return;

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

    const fullCurve = irfs.find((c) => c.scope === 'full');
    const subCurves = irfs.filter((c) => c.scope === 'subperiod');

    const allData = irfs.flatMap((c) => c.data);
    const maxHorizon = d3.max(allData, (d) => d.horizon) ?? 6;
    const x = d3.scaleLinear().domain([0, maxHorizon]).range([0, w]);

    const allVals = allData.flatMap((d) => [d.irf_downstream, d.irf_lower_ci, d.irf_upper_ci]);
    const yMin = Math.min(...allVals);
    const yMax = Math.max(...allVals);
    const pad = (yMax - yMin) * 0.1 || 0.1;
    const y = d3.scaleLinear().domain([yMin - pad, yMax + pad]).range([h, 0]);

    // subperiod curves (thin, gray)
    subCurves.forEach((curve) => {
      const line = d3
        .line<(typeof curve.data)[0]>()
        .x((d) => x(d.horizon))
        .y((d) => y(d.irf_downstream));
      g.append('path')
        .datum(curve.data)
        .attr('fill', 'none')
        .attr('stroke', PANEL_CHART_COLORS.irfSubperiodLine)
        .attr('stroke-width', 1)
        .attr('d', line);
    });

    // full curve CI band + line
    if (fullCurve) {
      const area = d3
        .area<(typeof fullCurve.data)[0]>()
        .x((d) => x(d.horizon))
        .y0((d) => y(d.irf_lower_ci))
        .y1((d) => y(d.irf_upper_ci));
      g.append('path')
        .datum(fullCurve.data)
        .attr('fill', PANEL_CHART_COLORS.irfConfidenceBand)
        .attr('opacity', 0.2)
        .attr('d', area);

      const line = d3
        .line<(typeof fullCurve.data)[0]>()
        .x((d) => x(d.horizon))
        .y((d) => y(d.irf_downstream));
      g.append('path')
        .datum(fullCurve.data)
        .attr('fill', 'none')
        .attr('stroke', PANEL_CHART_COLORS.irfFullLine)
        .attr('stroke-width', 2)
        .attr('d', line);

      // peak horizon dot
      const peakPoint = fullCurve.data.find((d) => d.horizon === fullCurve.peak_horizon);
      if (peakPoint) {
        g.append('circle')
          .attr('cx', x(peakPoint.horizon))
          .attr('cy', y(peakPoint.irf_downstream))
          .attr('r', 4)
          .attr('fill', PANEL_CHART_COLORS.irfPeakMarker);
        g.append('text')
          .attr('x', x(peakPoint.horizon) + 6)
          .attr('y', y(peakPoint.irf_downstream) - 4)
          .attr('font-size', '9px')
          .attr('fill', PANEL_CHART_COLORS.irfPeakMarker)
          .text(`peak h=${fullCurve.peak_horizon}`);
      }
    }

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(maxHorizon)).attr('color', '#64748b');
    g.append('g').call(d3.axisLeft(y).ticks(4)).attr('color', '#64748b');
  }, [irfs, height]);

  if (irfs.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-xs" style={{ height }}>
        IRF 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}
