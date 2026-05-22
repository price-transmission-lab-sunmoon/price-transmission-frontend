import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { parse } from 'date-fns';
import { PANEL_CHART_COLORS } from '@/utils/colorUtils';
import { CHART_THEME } from '@/utils/chartTheme';
import { attachHoverOverlay, removeHoverTooltip } from '@/utils/chartHover';
import type { ZscoreDataPoint } from '@/types/anomaly';

interface Props {
  data: ZscoreDataPoint[];
  warningThreshold?: number;
  alertThreshold?: number;
  height?: number;
}

const MARGIN = { top: 12, right: 12, bottom: 24, left: 44 };

function parseMonth(s: string): Date {
  return parse(s, 'yyyy-MM', new Date());
}

export function ZScoreChart({
  data,
  warningThreshold = 2.0,
  alertThreshold = 2.5,
  height = 200,
}: Props) {
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

    const valid = data.filter((d) => d.zscore !== null && isFinite(d.zscore as number));
    if (valid.length === 0) return;

    const x = d3
      .scaleTime()
      .domain(d3.extent(valid, (d) => parseMonth(d.period)) as [Date, Date])
      .range([0, w]);

    const vals = valid.map((d) => d.zscore as number);
    const yMax = Math.max(...vals, alertThreshold + 0.5);
    const yMin = Math.min(...vals, -0.5);
    const y = d3.scaleLinear().domain([yMin, yMax]).range([h, 0]);

    // threshold lines
    [
      { val: warningThreshold, color: PANEL_CHART_COLORS.zscoreWarningLine },
      { val: alertThreshold, color: PANEL_CHART_COLORS.zscoreAlertLine },
    ].forEach(({ val, color }) => {
      const yv = y(val);
      g.append('line')
        .attr('x1', 0).attr('x2', w)
        .attr('y1', yv).attr('y2', yv)
        .attr('stroke', color)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2 2');
    });

    // zscore line
    const line = d3
      .line<ZscoreDataPoint>()
      .defined((d) => d.zscore !== null)
      .x((d) => x(parseMonth(d.period)))
      .y((d) => y(d.zscore as number));
    g.append('path')
      .datum(valid)
      .attr('fill', 'none')
      .attr('stroke', PANEL_CHART_COLORS.zscoreLine)
      .attr('stroke-width', 1.5)
      .attr('d', line);

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(4)).attr('color', CHART_THEME.axisText);
    g.append('g').call(d3.axisLeft(y).ticks(4)).attr('color', CHART_THEME.axisText);

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
      tooltipId: 'zscore-chart-tip',
      buildHover: (d) => ({
        datum: d,
        date: parseMonth(d.period),
        values: [
          { label: 'Z-Score', value: d.zscore, color: PANEL_CHART_COLORS.zscoreLine },
          { label: '경보 임계', value: alertThreshold, color: PANEL_CHART_COLORS.zscoreAlertLine },
          { label: '주의 임계', value: warningThreshold, color: PANEL_CHART_COLORS.zscoreWarningLine },
        ],
      }),
    });
  }, [data, warningThreshold, alertThreshold, height]);

  useEffect(() => () => removeHoverTooltip('zscore-chart-tip'), []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-tertiary text-[12px]" style={{ height }}>
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
