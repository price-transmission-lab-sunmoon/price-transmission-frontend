import { useState } from 'react';
import { HelpModal } from './HelpModal';

export function HelpFloatingButton() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      {/* 우하단 고정 floating "?" 버튼 (web_plan_vN §9.2, feature_spec_fe-onboarding_vN §3.2 ⑤) */}
      <button
        onClick={() => setIsHelpOpen(true)}
        aria-label="도움말 열기"
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: 7000,
          width: 48,
          height: 48,
          borderRadius: '50%',
        }}
        className="bg-slate-800 text-white shadow-lg border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-colors flex items-center justify-center text-base font-medium"
      >
        ?
      </button>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}
