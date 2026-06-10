// 커서를 따라가는 호버 정보 카드(반응형 — 화면 밖으로 안 나가게 자동 보정). Canvas 밖 HTML 오버레이.
import { useJourneyHover } from '../journeyHover';

const PANEL_W = 240;
const PANEL_H_EST = 180;

export function HoverPanel() {
  const info = useJourneyHover((s) => s.info);
  const x = useJourneyHover((s) => s.x);
  const y = useJourneyHover((s) => s.y);
  if (!info) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const left = Math.min(x + 16, vw - PANEL_W - 12);
  const top = Math.min(y + 16, vh - PANEL_H_EST - 12);

  return (
    <div
      className="fixed z-50 pointer-events-none rounded-xl border border-border-default bg-surface shadow-e2 px-3.5 py-3"
      style={{ left, top, maxWidth: PANEL_W }}
    >
      <div className="flex items-center gap-2">
        {info.color && (
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: info.color }} />
        )}
        <span className="text-[13px] font-semibold text-primary leading-tight">{info.title}</span>
      </div>
      {info.rows && info.rows.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border-default flex flex-col gap-1">
          {info.rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-4 text-[12px]">
              <span className="text-tertiary">{r.label}</span>
              <span className="text-secondary font-mono tabular-nums">{r.value}</span>
            </div>
          ))}
        </div>
      )}
      {info.viz && (
        <div className="mt-2 pt-2 border-t border-border-default">
          {info.viz.kind === 'gauge' &&
            (() => {
              const v = info.viz;
              const pct = Math.max(0, Math.min(1, v.value / (v.max || 1)));
              const over = v.threshold != null && v.value > v.threshold;
              const fill = over ? '#d97706' : v.color || 'var(--brand)';
              return (
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-tertiary">{v.label ?? '값'}</span>
                    <span className="text-secondary font-mono tabular-nums">
                      {v.value.toFixed(2)}
                      {v.threshold != null ? ` / 임계 ${v.threshold}` : ''}
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-subtle overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: fill }} />
                    {v.threshold != null && v.max > 0 && (
                      <span
                        className="absolute top-0 bottom-0 w-px opacity-50"
                        style={{ left: `${Math.min(100, (v.threshold / v.max) * 100)}%`, backgroundColor: 'var(--text-primary)' }}
                      />
                    )}
                  </div>
                </div>
              );
            })()}
          {info.viz.kind === 'bars' && (
            <div className="flex flex-col gap-1">
              {info.viz.items.map((it, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className="text-tertiary w-14 truncate">{it.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-subtle overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(1, it.value / (it.max || 1))) * 100}%`,
                        backgroundColor: it.on ? it.color || 'var(--brand)' : 'var(--border-strong)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {info.viz.kind === 'spark' && (
            <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="w-full h-5">
              <polyline
                fill="none"
                stroke={info.viz.color || 'var(--brand)'}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                points={sparkPath(info.viz.points)}
              />
            </svg>
          )}
        </div>
      )}
      {info.note && (
        <div className="mt-2 pt-2 border-t border-border-default text-[11px] leading-snug text-tertiary whitespace-pre-line">
          {info.note}
        </div>
      )}
    </div>
  );
}

function sparkPath(pts: number[]): string {
  if (!pts.length) return '';
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const n = pts.length - 1 || 1;
  return pts.map((p, i) => `${(i / n) * 100},${24 - ((p - min) / span) * 24}`).join(' ');
}
