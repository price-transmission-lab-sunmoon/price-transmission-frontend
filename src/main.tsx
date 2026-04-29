import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';

const title = import.meta.env.VITE_APP_TITLE ?? '가격 전달 이상 탐지';
document.title = title;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
