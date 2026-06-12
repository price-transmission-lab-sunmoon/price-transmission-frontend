import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
// IS-11: globalErrorHandler(err) → registerGlobalErrorHandler() (src/api/globalErrorHandler.ts)
import { registerGlobalErrorHandler } from '@/api/globalErrorHandler';

const title = import.meta.env.VITE_APP_TITLE ?? '가격 전달 이상 탐지';
document.title = title;

// 전역 에러 핸들러 등록 (exception_design_vN §2.4) — 캡처되지 않은 예외 + 미처리 Promise rejection
registerGlobalErrorHandler();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
