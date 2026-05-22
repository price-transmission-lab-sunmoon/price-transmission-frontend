// feature_spec_fe-api-connect_vN §5 — Toast UI + 큐·중복 방지 (I7)
// CustomEvent 버스 방식: showToast() → 'fe:toast' 이벤트 → Toast 컴포넌트 수신
// 큐 정책: max 4 FIFO drop, onRetry 없는 toast 동일 code 5초 throttle

import { useEffect, useReducer, useRef, useCallback } from 'react';
import { Z_INDEX } from '@/utils/zIndex';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import type { IconName } from '@/utils/icons';

export interface ToastPayload {
  code: string;
  variant: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  message: string;
  onRetry?: () => void;
}

interface ToastItem extends ToastPayload {
  id: number;
}

const MAX_QUEUE = 4;
const THROTTLE_MS = 5000;
const AUTO_DISMISS_MS = 8000;
const TOAST_EVENT = 'fe:toast';

let _counter = 0;

export function showToast(payload: ToastPayload): void {
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: payload }));
}

type Action = { type: 'ADD'; payload: ToastPayload } | { type: 'DISMISS'; id: number };

function reducer(state: ToastItem[], action: Action): ToastItem[] {
  if (action.type === 'ADD') {
    const item: ToastItem = { ...action.payload, id: ++_counter };
    if (state.length >= MAX_QUEUE) {
      return [...state.slice(1), item];
    }
    return [...state, item];
  }
  if (action.type === 'DISMISS') {
    return state.filter((t) => t.id !== action.id);
  }
  return state;
}

const VARIANT_ICON: Record<ToastPayload['variant'], IconName> = {
  info: 'info',
  success: 'check',
  warning: 'alert',
  error: 'alert',
};

const VARIANT_BORDER: Record<ToastPayload['variant'], string> = {
  info: 'border-border-default',
  success: 'border-success-border',
  warning: 'border-warning-border',
  error: 'border-error-border',
};

const VARIANT_ACCENT: Record<ToastPayload['variant'], string> = {
  info: 'var(--text-primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--error)',
};

const VARIANT_ROLE: Record<ToastPayload['variant'], 'alert' | 'status'> = {
  info: 'status',
  success: 'status',
  warning: 'alert',
  error: 'alert',
};

export function Toast() {
  const [toasts, dispatch] = useReducer(reducer, []);
  const lastCodeTime = useRef<Map<string, number>>(new Map());

  const handleEvent = useCallback((evt: Event) => {
    const payload = (evt as CustomEvent<ToastPayload>).detail;
    if (!payload.onRetry) {
      const now = Date.now();
      const last = lastCodeTime.current.get(payload.code) ?? 0;
      if (now - last < THROTTLE_MS) return;
      lastCodeTime.current.set(payload.code, now);
    }
    dispatch({ type: 'ADD', payload });
  }, []);

  useEffect(() => {
    window.addEventListener(TOAST_EVENT, handleEvent);
    return () => window.removeEventListener(TOAST_EVENT, handleEvent);
  }, [handleEvent]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const oldest = toasts[0];
    const timer = setTimeout(() => dispatch({ type: 'DISMISS', id: oldest.id }), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="알림"
      aria-live="polite"
      className="fixed bottom-6 right-6 flex flex-col gap-3 pointer-events-none"
      style={{ zIndex: Z_INDEX.TOAST }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={VARIANT_ROLE[toast.variant]}
          className={[
            'toast-slide-in pointer-events-auto',
            'flex items-start gap-3 px-4 py-3.5 rounded-lg shadow-e4 max-w-[400px] w-full',
            'bg-surface border',
            VARIANT_BORDER[toast.variant],
          ].join(' ')}
        >
          <Icon
            name={VARIANT_ICON[toast.variant]}
            size={20}
            className="shrink-0 mt-0.5"
            style={{ color: VARIANT_ACCENT[toast.variant] }}
          />
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p
                className="text-[13px] font-semibold leading-snug m-0"
                style={{ color: VARIANT_ACCENT[toast.variant] }}
              >
                {toast.title}
              </p>
            )}
            <p className="text-[13px] text-secondary leading-[1.5] m-0 mt-0.5">
              {toast.message}
            </p>
          </div>
          {toast.onRetry && (
            <Button variant="ghost" size="sm" onClick={toast.onRetry}>
              재시도
            </Button>
          )}
          <IconButton
            aria-label="닫기"
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: 'DISMISS', id: toast.id })}
            icon={<Icon name="x" size={14} />}
          />
        </div>
      ))}
    </div>
  );
}
