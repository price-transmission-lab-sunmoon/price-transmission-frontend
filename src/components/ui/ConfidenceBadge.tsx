import type { ConfidenceGrade } from '@/types/literals';
import {
  ANOMALY_BG_COLORS,
  ANOMALY_BORDER_COLORS,
  ANOMALY_COLORS,
} from '@/utils/colorUtils';

const LABEL: Record<ConfidenceGrade, string> = {
  high: '고신뢰',
  medium: '중신뢰',
  reference: '참고',
};

interface ConfidenceBadgeProps {
  grade: ConfidenceGrade;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE_CLASS = {
  sm: 'h-[22px] px-2 text-[11px]',
  md: 'h-[26px] px-2.5 text-[12px]',
};

export function ConfidenceBadge({
  grade,
  size = 'md',
  className = '',
}: ConfidenceBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-sm font-semibold',
        'whitespace-nowrap leading-none border',
        SIZE_CLASS[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        background: ANOMALY_BG_COLORS[grade],
        color: ANOMALY_COLORS[grade],
        borderColor: ANOMALY_BORDER_COLORS[grade],
        letterSpacing: '0.01em',
      }}
    >
      {LABEL[grade]}
    </span>
  );
}
