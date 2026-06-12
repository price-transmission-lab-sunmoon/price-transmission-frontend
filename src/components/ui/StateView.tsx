import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from '@/utils/icons';

export type StateVariant = 'loading' | 'empty' | 'error' | 'warning';
export type StateSize = 'large' | 'inline' | 'chip';

interface StateViewProps {
  variant: StateVariant;
  size?: StateSize;
  icon?: IconName;
  title?: string;
  description?: string;
  errorCode?: string;
  actions?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const VARIANT_ICON_DEFAULT: Record<StateVariant, IconName> = {
  loading: 'info',
  empty: 'chart-bar-square',
  error: 'alert',
  warning: 'clock',
};

const VARIANT_BUBBLE_CLASS: Record<StateVariant, string> = {
  loading: 'bg-subtle text-tertiary',
  empty: 'bg-subtle text-tertiary',
  error: 'bg-error-subtle text-error border border-error-border',
  warning: 'bg-warning-subtle text-warning border border-warning-border',
};

const ARIA_ROLE: Record<StateVariant, string | undefined> = {
  loading: 'status',
  empty: undefined,
  error: 'alert',
  warning: undefined,
};

export function StateView({
  variant,
  size = 'large',
  icon,
  title,
  description,
  errorCode,
  actions,
  className = '',
  style,
}: StateViewProps) {
  const iconName = icon ?? VARIANT_ICON_DEFAULT[variant];
  const role = ARIA_ROLE[variant];

  // loading은 아이콘 대신 애니메이션 SVG 스피너 사용
  if (variant === 'loading' && size !== 'chip') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        className={[
          'flex flex-col items-center justify-center gap-3 h-full text-tertiary',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={style}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          style={{ animation: 'spin 1s linear infinite' }}
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray="60 20"
            strokeLinecap="round"
          />
        </svg>
        {title && <span className="text-[14px] text-tertiary">{title}</span>}
      </div>
    );
  }

  if (size === 'inline' || size === 'chip') {
    return (
      <div
        role={role}
        className={[
          size === 'chip'
            ? 'inline-flex items-center gap-2 px-3.5 py-2 bg-surface border border-border-default rounded-md shadow-e2 text-[12px] text-secondary'
            : 'flex flex-col items-center justify-center gap-1 text-tertiary text-[11px]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={style}
      >
        <Icon name={iconName} size={size === 'chip' ? 14 : 16} />
        {title && <span>{title}</span>}
      </div>
    );
  }

  return (
    <div
      role={role}
      className={[
        'flex flex-col items-center justify-center gap-4 px-8 py-8 text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <div
        className={[
          'flex items-center justify-center w-16 h-16 rounded-pill',
          VARIANT_BUBBLE_CLASS[variant],
        ].join(' ')}
      >
        <Icon name={iconName} size={32} />
      </div>
      {title && <h3 className="text-[14px] font-semibold text-secondary m-0">{title}</h3>}
      {description && (
        <p className="text-[12px] text-tertiary leading-[1.5] m-0" style={{ maxWidth: 320 }}>
          {description}
        </p>
      )}
      {errorCode && (
        <code className="inline-block mt-1 px-1.5 py-0.5 bg-subtle rounded-sm font-mono text-[10px] text-tertiary">
          ({errorCode})
        </code>
      )}
      {actions && <div className="flex gap-2 mt-2">{actions}</div>}
    </div>
  );
}
