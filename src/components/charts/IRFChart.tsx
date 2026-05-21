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

    // FX-5: hover overlay (horizon 기반)
    if (fullCurve) {
      const guide = g.append('g').attr('class', 'hover-guide').style('display', 'none');
      guide
        .append('line')
        .attr('y1', 0).attr('y2', h)
        .attr('stroke', '#64748b').attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3').attr('opacity', 0.7);
      const dot = guide.append('circle').attr('r', 4)
        .attr('fill', '#f1f5f9').attr('stroke', '#0f172a').attr('stroke-width', 1.5);

      let tip = document.getElementById('irf-chart-tip');
      if (!tip) {
        tip = document.createElement('div');
        tip.id = 'irf-chart-tip';
        tip.style.cssText =
          'position:fixed;pointer-events:none;background:#1e293b;border:1px solid #475569;border-radius:6px;padding:6px 10px;font-size:11px;color:#f1f5f9;z-index:9999;white-space:nowrap;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.4);';
        document.body.appendChild(tip);
      }

      g.append('rect')
        .attr('width', w).attr('height', h)
        .attr('fill', 'transparent').style('cursor', 'crosshair')
        .on('mouseenter', () => { guide.style('display', null); if (tip) tip.style.display = 'block'; })
        .on('mouseleave', () => { guide.style('display', 'none'); if (tip) tip.style.display = 'none'; })
        .on('mousemove', function (event: MouseEvent) {
          const [mx, my] = d3.pointer(event, this);
          const hz = Math.round(x.invert(mx));
          const pt = fullCurve.data.find((d) => d.horizon === hz);
          if (!pt) return;
          const px = x(pt.horizon);
          const py = y(pt.irf_downstream);
          guide.select('line').attr('x1', px).attr('x2', px);
          dot.attr('cx', px).attr('cy', py);
          if (tip) {
            tip.innerHTML = `<div style="font-weight:600;margin-bottom:4px">h = ${hz}개월</div>
              <div style="display:flex;justify-content:space-between;gap:10px"><span>IRF</span><span style="font-family:monospace">${pt.irf_downstream.toFixed(4)}</span></div>
              <div style="display:flex;justify-content:space-between;gap:10px;color:#94a3b8"><span>95% CI</span><span style="font-family:monospace">[${pt.irf_lower_ci.toFixed(3)}, ${pt.irf_upper_ci.toFixed(3)}]</span></div>`;
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              tip.style.left = `${rect.left + MARGIN.left + px + 14}px`;
              tip.style.top = `${rect.top + MARGIN.top + my - 8}px`;
            }
          }
        });
    }
  }, [irfs, height]);

  useEffect(() => () => { const t = document.getElementById('irf-chart-tip'); if (t) t.remove(); }, []);

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
