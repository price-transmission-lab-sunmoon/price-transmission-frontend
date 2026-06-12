import type { ReactNode } from 'react';

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'violet'
  | 'teal-light';

export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  tone?: BadgeTone;
  size?: BadgeSize;
  uppercase?: boolean;
  children: ReactNode;
  className?: string;
}

const SIZE_CLASS: Record<BadgeSize, string> = {
  sm: 'h-[22px] px-2 text-[11px]',
  md: 'h-[26px] px-2.5 text-[12px]',
};

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'bg-muted text-secondary border border-border-default',
  brand: 'bg-brand-subtle text-brand-active border border-brand-border',
  success: 'bg-success-subtle text-success border border-success-border',
  warning: 'bg-warning-subtle text-warning border border-warning-border',
  error: 'bg-error-subtle text-error border border-error-border',
  info: 'bg-info-subtle text-brand-active border border-info-border',
  // Methodology pattern card chip variants
  violet: 'border bg-[#f5f3ff] text-[#6d28d9] border-[#ddd6fe]',
  'teal-light': 'border bg-[#ecfeff] text-[#155e75] border-[#a5f3fc]',
};

export function Badge({
  tone = 'neutral',
  size = 'sm',
  uppercase,
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded-sm font-semibold',
        'whitespace-nowrap leading-none',
        uppercase ? 'uppercase tracking-wider' : '',
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
