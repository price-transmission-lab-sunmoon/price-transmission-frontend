// FX-5: 인라인 차트 hover overlay 공통 유틸.
// SVG 위에 mouse overlay rect + vertical guide line + dot + tooltip 추가.
// 차트별로 데이터 포인트와 값 추출만 다르므로 그 부분은 콜백으로 받음.
import * as d3 from 'd3';
import { parse } from 'date-fns';

export interface HoverPoint<T> {
  datum: T;
  date: Date;
  values: { label: string; value: number | null; color?: string }[];
}

export interface HoverOverlayOptions<T> {
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  data: T[];
  x: d3.ScaleTime<number, number>;
  y: d3.ScaleLinear<number, number>;
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  getDate: (d: T) => Date;
  buildHover: (d: T) => HoverPoint<T> | null;
  tooltipId: string;
}

export function parseMonthYM(s: string): Date {
  return parse(s, 'yyyy-MM', new Date());
}

export function attachHoverOverlay<T>(opts: HoverOverlayOptions<T>) {
  const { g, containerRef, data, x, y, width, height, margin, getDate, buildHover, tooltipId } = opts;

  if (data.length === 0) return;

  // 가이드 그룹
  const guide = g.append('g').attr('class', 'hover-guide').style('display', 'none');
  guide
    .append('line')
    .attr('class', 'hover-line')
    .attr('y1', 0)
    .attr('y2', height)
    .attr('stroke', '#64748b')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3')
    .attr('opacity', 0.7);
  const dot = guide
    .append('circle')
    .attr('class', 'hover-dot')
    .attr('r', 4)
    .attr('fill', '#f1f5f9')
    .attr('stroke', '#0f172a')
    .attr('stroke-width', 1.5);

  // bisector
  const bisect = d3.bisector<T, Date>((d) => getDate(d)).left;

  // tooltip element
  let tip = document.getElementById(tooltipId);
  if (!tip) {
    tip = document.createElement('div');
    tip.id = tooltipId;
    tip.style.cssText =
      'position:fixed;pointer-events:none;background:#1e293b;border:1px solid #475569;border-radius:6px;padding:6px 10px;font-size:11px;color:#f1f5f9;z-index:9999;white-space:nowrap;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.4);';
    document.body.appendChild(tip);
  }

  // overlay rect — capture all mouse events
  g.append('rect')
    .attr('class', 'hover-overlay')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'transparent')
    .style('cursor', 'crosshair')
    .on('mouseenter', () => {
      guide.style('display', null);
      if (tip) tip.style.display = 'block';
    })
    .on('mouseleave', () => {
      guide.style('display', 'none');
      if (tip) tip.style.display = 'none';
    })
    .on('mousemove', function (event: MouseEvent) {
      const [mx, my] = d3.pointer(event, this);
      const date = x.invert(mx);
      // 가장 가까운 datum
      const idx = bisect(data, date);
      const a = data[Math.max(0, idx - 1)];
      const b = data[Math.min(data.length - 1, idx)];
      const da = a ? Math.abs(getDate(a).getTime() - date.getTime()) : Infinity;
      const db = b ? Math.abs(getDate(b).getTime() - date.getTime()) : Infinity;
      const d = da <= db ? a : b;
      if (!d) return;

      const hp = buildHover(d);
      if (!hp) return;

      const px = x(hp.date);
      guide.select('.hover-line').attr('x1', px).attr('x2', px);

      // 첫 번째 valid 값을 dot 위치로
      const firstVal = hp.values.find((v) => v.value !== null && Number.isFinite(v.value));
      if (firstVal && firstVal.value != null) {
        const py = y(firstVal.value);
        dot.attr('cx', px).attr('cy', py).attr('fill', firstVal.color ?? '#f1f5f9').style('display', null);
      } else {
        dot.style('display', 'none');
      }

      // tooltip 위치 + 내용
      if (tip) {
        const periodLabel = `${hp.date.getFullYear()}년 ${hp.date.getMonth() + 1}월`;
        const rows = hp.values
          .map((v) => {
            const valStr =
              v.value === null || !Number.isFinite(v.value as number)
                ? '—'
                : (v.value as number).toFixed(3);
            const colorStyle = v.color ? `color:${v.color};` : '';
            return `<div style="display:flex;justify-content:space-between;gap:10px;${colorStyle}"><span>${v.label}</span><span style="font-family:monospace">${valStr}</span></div>`;
          })
          .join('');
        tip.innerHTML = `<div style="font-weight:600;margin-bottom:4px">${periodLabel}</div>${rows}`;

        // 위치: 컨테이너 기준 mouse + offset
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const absX = rect.left + margin.left + px;
          const absY = rect.top + margin.top + my;
          tip.style.left = `${absX + 14}px`;
          tip.style.top = `${absY - 8}px`;
        }
      }
    });
}

// 컴포넌트 unmount 시 tooltip cleanup
export function removeHoverTooltip(tooltipId: string) {
  const tip = document.getElementById(tooltipId);
  if (tip) tip.remove();
}
