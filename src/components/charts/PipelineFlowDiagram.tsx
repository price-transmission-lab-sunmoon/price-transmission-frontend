import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { CHART_THEME } from '@/utils/chartTheme';
import { Z_INDEX } from '@/utils/zIndex';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icon';
import type { PipelineNode, PipelineEdge } from '@/types/meta';

const NODE_W = 160;
const NODE_H = 48;
const PHASE_GAP = 96;
const NODE_GAP = 28;
const PAD_TOP = 24;
const PAD_BOTTOM = 32;

interface NodePos {
  node: PipelineNode;
  x: number;
  y: number;
}

interface TooltipState {
  x: number;
  y: number;
  label: string;
  description: string;
}

interface Props {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  version: string;
}

function buildLayout(nodes: PipelineNode[], containerWidth: number): NodePos[] {
  if (!containerWidth || nodes.length === 0) return [];

  const phaseMap = new Map<number, PipelineNode[]>();
  for (const node of nodes) {
    const g = phaseMap.get(node.phase_number) ?? [];
    g.push(node);
    phaseMap.set(node.phase_number, g);
  }

  const sortedPhases = [...phaseMap.keys()].sort((a, b) => a - b);
  const positions: NodePos[] = [];

  sortedPhases.forEach((phase, rowIdx) => {
    const rowNodes = phaseMap.get(phase)!;
    const y = PAD_TOP + rowIdx * PHASE_GAP;
    const rowWidth = rowNodes.length * NODE_W + (rowNodes.length - 1) * NODE_GAP;
    const startX = Math.max(8, (containerWidth - rowWidth) / 2);

    rowNodes.forEach((node, colIdx) => {
      positions.push({
        node,
        x: startX + colIdx * (NODE_W + NODE_GAP),
        y,
      });
    });
  });

  return positions;
}

export function PipelineFlowDiagram({ nodes, edges, version }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) setContainerWidth(w);
    });
    ro.observe(el);
    const initial = el.getBoundingClientRect().width;
    if (initial > 0) setContainerWidth(initial);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || containerWidth === 0 || nodes.length === 0) return;

    const layout = buildLayout(nodes, containerWidth);
    const nodeMap = new Map(layout.map((p) => [p.node.id, p]));
    const uniquePhases = [...new Set(nodes.map((n) => n.phase_number))].sort((a, b) => a - b);
    const svgHeight = PAD_TOP + (uniquePhases.length - 1) * PHASE_GAP + NODE_H + PAD_BOTTOM;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', containerWidth).attr('height', svgHeight);
    setTooltip(null);

    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow-pipeline')
      .attr('markerWidth', 7)
      .attr('markerHeight', 6)
      .attr('refX', 7)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 7 3, 0 6')
      .attr('fill', 'var(--border-strong)');

    const edgeG = svg.append('g');
    for (const edge of edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) {
        console.warn(
          `[PipelineFlowDiagram] PARSE-ARR-002: edge node not found — source="${edge.source}" target="${edge.target}"`,
        );
        continue;
      }

      const x1 = src.x + NODE_W / 2;
      const y1 = src.y + NODE_H;
      const x2 = tgt.x + NODE_W / 2;
      const y2 = tgt.y - 2;

      const my = (y1 + y2) / 2;
      const d = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;

      edgeG
        .append('path')
        .attr('d', d)
        .attr('fill', 'none')
        .attr('stroke', 'var(--border-strong)')
        .attr('stroke-width', 1.5)
        .attr('stroke-linecap', 'round')
        .attr('marker-end', 'url(#arrow-pipeline)');

      if (edge.label) {
        const lx = (x1 + x2) / 2;
        const ly = my;
        const bg = edgeG.append('g');
        const text = bg
          .append('text')
          .attr('x', lx)
          .attr('y', ly)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '10')
          .attr('font-family', CHART_THEME.fontFamilyMono)
          .attr('fill', CHART_THEME.axisText)
          .text(edge.label);

        const bbox = (text.node() as SVGTextElement).getBBox();
        bg.insert('rect', 'text')
          .attr('x', bbox.x - 5)
          .attr('y', bbox.y - 2)
          .attr('width', bbox.width + 10)
          .attr('height', bbox.height + 4)
          .attr('rx', 10)
          .attr('fill', 'var(--bg-canvas)')
          .attr('stroke', 'var(--border-default)')
          .attr('stroke-width', 1);
      }
    }

    const nodeG = svg.append('g');
    for (const { node, x, y } of layout) {
      const g = nodeG
        .append('g')
        .attr('transform', `translate(${x},${y})`)
        .style('cursor', 'pointer')
        .attr('tabindex', '0')
        .attr('aria-label', `${node.label}: ${node.description}`);

      g.append('rect')
        .attr('width', NODE_W)
        .attr('height', NODE_H)
        .attr('rx', 10)
        .attr('fill', 'var(--bg-surface)')
        .attr('stroke', 'var(--border-default)')
        .attr('stroke-width', 1);

      g.append('rect')
        .attr('width', NODE_W)
        .attr('height', NODE_H)
        .attr('rx', 10)
        .attr('fill', 'transparent')
        .on('mouseover', function () {
          const box = d3.select(this.parentNode as Element).select('rect:first-child');
          box
            .attr('fill', 'var(--brand-subtle)')
            .attr('stroke', 'var(--brand)')
            .attr('stroke-width', 1.5);
        })
        .on('mouseout', function () {
          const box = d3.select(this.parentNode as Element).select('rect:first-child');
          box
            .attr('fill', 'var(--bg-surface)')
            .attr('stroke', 'var(--border-default)')
            .attr('stroke-width', 1);
        })
        .on('click', () => {
          setTooltip({ x, y, label: node.label, description: node.description });
        });

      g.append('text')
        .attr('x', NODE_W / 2)
        .attr('y', NODE_H / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('font-size', '13')
        .attr('font-family', 'var(--font-sans)')
        .attr('font-weight', '500')
        .attr('fill', 'var(--text-primary)')
        .attr('pointer-events', 'none')
        .text(node.label);
    }

    svg.on('click', (event: MouseEvent) => {
      if ((event.target as Element).tagName === 'svg') setTooltip(null);
    });
  }, [containerWidth, nodes, edges]);

  const layout = buildLayout(nodes, containerWidth);

  return (
    <div ref={containerRef} className="relative w-full select-none">
      {/* 버전 표시(pill) */}
      <div
        className="absolute top-3 right-3 px-2.5 py-1 bg-canvas border border-border-default rounded-sm text-[10px] font-semibold uppercase tracking-widest font-mono text-tertiary pointer-events-none"
        style={{ zIndex: 10 }}
      >
        v{version}
      </div>

      <svg ref={svgRef} className="w-full" />

      {/* 노드 클릭 툴팁 팝오버 */}
      {tooltip &&
        (() => {
          const pos = layout.find((p) => p.node.label === tooltip.label);
          if (!pos) return null;
          const tipLeft = Math.max(8, Math.min(pos.x, containerWidth - 268));
          const tipTop = pos.y > 120 ? pos.y - 104 : pos.y + NODE_H + 12;
          return (
            <div
              className="absolute w-[260px] bg-surface border border-border-default rounded-lg p-4 shadow-e4 pointer-events-auto"
              style={{ left: tipLeft, top: tipTop, zIndex: Z_INDEX.DROPDOWN }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-primary text-[14px] font-semibold">{tooltip.label}</span>
                <IconButton
                  aria-label="툴팁 닫기"
                  onClick={() => setTooltip(null)}
                  variant="ghost"
                  size="sm"
                  icon={<Icon name="x" size={14} />}
                />
              </div>
              <p className="text-secondary text-[13px] leading-[1.625] m-0">
                {tooltip.description}
              </p>
            </div>
          );
        })()}
    </div>
  );
}
