// feature_spec_fe-api-connect_vN §5 — Toast UI + 큐·중복 방지 (I7)
// CustomEvent 버스 방식: showToast() → 'fe:toast' 이벤트 → Toast 컴포넌트 수신
// 큐 정책: max 4 FIFO drop, onRetry 없는 toast 동일 code 5초 throttle

import { useEffect, useReducer, useRef, useCallback } from 'react';
import { Z_INDEX } from '@/utils/zIndex';

export interface ToastPayload {
  code: string;
  variant: 'error' | 'warning' | 'info';
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
    // max 4 FIFO drop: 4개 초과 시 가장 오래된 항목 제거
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

export function Toast() {
  const [toasts, dispatch] = useReducer(reducer, []);
  // code → 마지막 발화 시각 (onRetry 없는 toast에만 적용)
  const lastCodeTime = useRef<Map<string, number>>(new Map());

  const handleEvent = useCallback((evt: Event) => {
    const payload = (evt as CustomEvent<ToastPayload>).detail;

    // onRetry 없는 toast: 동일 code 5초 이내 중복 억제
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

  // 자동 소멸: 가장 오래된 항목 기준 타이머
  useEffect(() => {
    if (toasts.length === 0) return;
    const oldest = toasts[0];
    const timer = setTimeout(() => dispatch({ type: 'DISMISS', id: oldest.id }), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 flex flex-col gap-2 pointer-events-none"
      style={{ zIndex: Z_INDEX.TOAST }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg max-w-sm w-full pointer-events-auto ${
            toast.variant === 'error'
              ? 'bg-red-700 text-white'
              : toast.variant === 'warning'
                ? 'bg-yellow-600 text-white'
                : 'bg-slate-700 text-white'
          }`}
        >
          <p className="flex-1 text-sm leading-snug">{toast.message}</p>
          {toast.onRetry && (
            <button
              onClick={toast.onRetry}
              className="shrink-0 text-sm font-semibold underline whitespace-nowrap"
              aria-label="재시도"
            >
              재시도
            </button>
          )}
          <button
            onClick={() => dispatch({ type: 'DISMISS', id: toast.id })}
            className="shrink-0 text-sm opacity-70 hover:opacity-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
