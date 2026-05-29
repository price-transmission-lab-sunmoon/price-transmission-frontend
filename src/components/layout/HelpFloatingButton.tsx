import { useState } from 'react';
import { HelpModal } from './HelpModal';
import { Icon } from '@/components/ui/Icon';
import { Z_INDEX } from '@/utils/zIndex';

// @guide:LAYOUT-08
export function HelpFloatingButton() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      {/* 우하단 고정 floating help 버튼 (web_plan_vN §9.2) */}
      <button
        onClick={() => setIsHelpOpen(true)}
        aria-label="도움말 열기"
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: Z_INDEX.OVERLAY,
        }}
        className={[
          'w-12 h-12 rounded-full bg-brand text-on-brand shadow-brand-fab',
          'flex items-center justify-center',
          'transition-[transform,background-color,box-shadow] duration-default ease-out',
          'hover:scale-[1.06] hover:bg-brand-hover hover:shadow-brand-fab-hover',
          'active:scale-[0.96]',
        ].join(' ')}
      >
        <Icon name="help" size={22} strokeWidth={2.25} />
      </button>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}
