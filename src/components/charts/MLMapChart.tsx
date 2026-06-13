import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { PANEL_CHART_COLORS, ML_MODEL_COLORS } from '@/utils/colorUtils';
import { CHART_THEME } from '@/utils/chartTheme';
import type { MlMapPoint } from '@/types/anomaly';
import type { MlModel } from '@/types/literals';

interface Props {
  points: MlMapPoint[];
  model: MlModel;
  xLabel?: string;
  yLabel?: string;
  height?: number;
}

const MARGIN = { top: 12, right: 12, bottom: 36, left: 44 };

export function MLMapChart({ points, model, xLabel, yLabel, height = 240 }: Props) {
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

    const valid = points.filter((p) => isFinite(p.x_value) && isFinite(p.y_value));
    if (valid.length === 0) return;

    const xExt = d3.extent(valid, (p) => p.x_value) as [number, number];
    const yExt = d3.extent(valid, (p) => p.y_value) as [number, number];
    const xPad = (xExt[1] - xExt[0]) * 0.1 || 0.5;
    const yPad = (yExt[1] - yExt[0]) * 0.1 || 0.5;

    const x = d3
      .scaleLinear()
      .domain([xExt[0] - xPad, xExt[1] + xPad])
      .range([0, w]);
    const y = d3
      .scaleLinear()
      .domain([yExt[0] - yPad, yExt[1] + yPad])
      .range([h, 0]);

    const modelColor = ML_MODEL_COLORS[model];
    const anomalyScores = valid.filter((p) => p.is_anomaly).map((p) => p.anomaly_score);
    const scoreExt =
      anomalyScores.length > 0 ? (d3.extent(anomalyScores) as [number, number]) : [0, 1];
    // score가 낮을수록 이상이므로 도메인 반전해서 낮은 값이 더 진한 모델 색
    const colorScale = d3
      .scaleSequential()
      .domain([scoreExt[1], scoreExt[0]])
      .interpolator(d3.interpolateRgb(PANEL_CHART_COLORS.mlMapNormalFill, modelColor));

    g.selectAll('.normal-dot')
      .data(valid.filter((p) => !p.is_highlight))
      .join('circle')
      .attr('class', 'normal-dot')
      .attr('cx', (p) => x(p.x_value))
      .attr('cy', (p) => y(p.y_value))
      .attr('r', 3)
      .attr('fill', (p) =>
        p.is_anomaly ? colorScale(p.anomaly_score) : PANEL_CHART_COLORS.mlMapNormalFill,
      )
      .attr('opacity', 0.7);

    const highlighted = valid.filter((p) => p.is_highlight);
    g.selectAll('.highlight-dot')
      .data(highlighted)
      .join('circle')
      .attr('class', 'highlight-dot')
      .attr('cx', (p) => x(p.x_value))
      .attr('cy', (p) => y(p.y_value))
      .attr('r', 6)
      .attr('fill', modelColor)
      .attr('stroke', CHART_THEME.axisText)
      .attr('stroke-width', 2);

    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(4))
      .attr('color', CHART_THEME.axisText);
    g.append('g').call(d3.axisLeft(y).ticks(4)).attr('color', CHART_THEME.axisText);

    if (xLabel) {
      g.append('text')
        .attr('x', w / 2)
        .attr('y', h + 32)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', CHART_THEME.axisText)
        .text(xLabel);
    }
    if (yLabel) {
      g.append('text')
        .attr('transform', `rotate(-90)`)
        .attr('x', -h / 2)
        .attr('y', -36)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', CHART_THEME.axisText)
        .text(yLabel);
    }
  }, [points, model, xLabel, yLabel, height]);

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-tertiary text-[12px]"
        style={{ height }}
      >
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
