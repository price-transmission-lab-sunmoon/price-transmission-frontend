import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { globalErrorHandler } from '@/api/error';

const title = import.meta.env.VITE_APP_TITLE ?? '가격 전달 이상 탐지';
document.title = title;

// 전역 에러 핸들러 등록 (exception_design_vN §2.4) — 캡처되지 않은 예외 + 미처리 Promise rejection
window.addEventListener('error', (event) => {
  globalErrorHandler(event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  globalErrorHandler(event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
