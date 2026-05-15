import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { PipelineNode, PipelineEdge } from '@/types/meta';

const NODE_W = 140;
const NODE_H = 44;
const PHASE_GAP = 88; // 위→아래 row 간격
const NODE_GAP = 24;  // 같은 row 내 노드 간격
const PAD_TOP = 20;
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

  // phase_number 별로 그룹화
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

  // 컨테이너 크기 감지 — FE-D3-003: 크기 0이면 ResizeObserver로 재시도
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

  // D3 렌더링
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

    // 화살표 마커
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
      .attr('fill', '#475569');

    // 엣지
    const edgeG = svg.append('g');
    for (const edge of edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;

      const x1 = src.x + NODE_W / 2;
      const y1 = src.y + NODE_H;
      const x2 = tgt.x + NODE_W / 2;
      const y2 = tgt.y - 2; // 화살표 시작점

      const my = (y1 + y2) / 2;
      const d = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;

      edgeG
        .append('path')
        .attr('d', d)
        .attr('fill', 'none')
        .attr('stroke', '#475569')
        .attr('stroke-width', 1.5)
        .attr('marker-end', 'url(#arrow-pipeline)');

      // 엣지 라벨 (분기 조건)
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
          .attr('font-family', 'sans-serif')
          .attr('fill', '#64748b')
          .text(edge.label);

        // 라벨 배경
        const bbox = (text.node() as SVGTextElement).getBBox();
        bg
          .insert('rect', 'text')
          .attr('x', bbox.x - 3)
          .attr('y', bbox.y - 2)
          .attr('width', bbox.width + 6)
          .attr('height', bbox.height + 4)
          .attr('rx', 3)
          .attr('fill', '#0f172a');
      }
    }

    // 노드
    const nodeG = svg.append('g');
    for (const { node, x, y } of layout) {
      const g = nodeG
        .append('g')
        .attr('transform', `translate(${x},${y})`)
        .style('cursor', 'pointer')
        .attr('tabindex', '0')
        .attr('aria-label', `${node.label}: ${node.description}`);

      // 박스
      g.append('rect')
        .attr('width', NODE_W)
        .attr('height', NODE_H)
        .attr('rx', 6)
        .attr('fill', '#1e293b')
        .attr('stroke', '#334155')
        .attr('stroke-width', 1.5);

      // 호버 효과용 투명 오버레이
      g.append('rect')
        .attr('width', NODE_W)
        .attr('height', NODE_H)
        .attr('rx', 6)
        .attr('fill', 'transparent')
        .on('mouseover', function () {
          d3.select(this.parentNode as Element)
            .select('rect:first-child')
            .attr('stroke', '#64748b');
        })
        .on('mouseout', function () {
          d3.select(this.parentNode as Element)
            .select('rect:first-child')
            .attr('stroke', '#334155');
        })
        .on('click', () => {
          setTooltip({ x, y, label: node.label, description: node.description });
        });

      // 라벨 텍스트
      g.append('text')
        .attr('x', NODE_W / 2)
        .attr('y', NODE_H / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('font-size', '12')
        .attr('font-family', 'sans-serif')
        .attr('fill', '#e2e8f0')
        .attr('pointer-events', 'none')
        .text(node.label);
    }

    // SVG 클릭 시 툴팁 닫기
    svg.on('click', (event: MouseEvent) => {
      if ((event.target as Element).tagName === 'svg') setTooltip(null);
    });
  }, [containerWidth, nodes, edges]);

  const layout = buildLayout(nodes, containerWidth);

  return (
    <div ref={containerRef} className="relative w-full select-none">
      {/* 버전 표시 */}
      <div className="absolute top-2 right-2 text-[11px] text-slate-500 pointer-events-none z-10">
        파이프라인 버전: {version}
      </div>

      <svg ref={svgRef} className="w-full" />

      {/* 노드 클릭 툴팁 팝오버 */}
      {tooltip && (() => {
        const pos = layout.find((p) => p.node.label === tooltip.label);
        if (!pos) return null;
        const tipLeft = Math.max(8, Math.min(pos.x, containerWidth - 216));
        const tipTop = pos.y > 120 ? pos.y - 88 : pos.y + NODE_H + 8;
        return (
          <div
            className="absolute z-20 w-52 bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl pointer-events-auto"
            style={{ left: tipLeft, top: tipTop }}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-slate-200 text-xs font-semibold">{tooltip.label}</span>
              <button
                aria-label="툴팁 닫기"
                className="text-slate-500 hover:text-slate-300 text-sm leading-none shrink-0"
                onClick={() => setTooltip(null)}
              >
                ×
              </button>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">{tooltip.description}</p>
          </div>
        );
      })()}
    </div>
  );
}
