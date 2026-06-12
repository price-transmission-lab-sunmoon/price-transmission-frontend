import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { registerGlobalErrorHandler } from '@/api/globalErrorHandler';

const title = import.meta.env.VITE_APP_TITLE ?? '가격 전달 이상 탐지';
document.title = title;

// 캡처되지 않은 예외와 미처리 Promise rejection을 전역에서 잡는다.
registerGlobalErrorHandler();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
