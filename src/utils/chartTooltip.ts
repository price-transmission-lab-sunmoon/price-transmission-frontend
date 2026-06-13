import { Z_INDEX } from './zIndex';

// D3 차트용 공통 툴팁 요소 팩토리. id 기준으로 재사용(idempotent).
export function createChartTooltip(id: string): HTMLDivElement {
  let tip = document.getElementById(id) as HTMLDivElement | null;
  if (tip) return tip;

  tip = document.createElement('div');
  tip.id = id;
  tip.style.cssText = `
    position: fixed;
    pointer-events: none;
    background: #ffffff;
    border: 1px solid #e7e2d8;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px;
    font-family: inherit;
    color: #1a1814;
    z-index: ${Z_INDEX.CHART_TOOLTIP};
    white-space: nowrap;
    display: none;
    box-shadow:
      0 4px 12px rgba(28, 24, 18, 0.06),
      0 1px 3px rgba(28, 24, 18, 0.04);
    transition: opacity 100ms ease-out;
  `;
  document.body.appendChild(tip);
  return tip;
}
