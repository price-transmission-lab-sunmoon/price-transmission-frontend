import type { ReactNode } from 'react';

export type SwitchSize = 'sm' | 'md';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  size?: SwitchSize;
  disabled?: boolean;
  label?: ReactNode;
  labelPosition?: 'before' | 'after';
  title?: string;
  className?: string;
  'aria-label'?: string;
}

const TRACK_CLASS: Record<SwitchSize, string> = {
  sm: 'w-7 h-4',
  md: 'w-9 h-5',
};
const KNOB_CLASS: Record<SwitchSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
};
const KNOB_TRANSLATE: Record<SwitchSize, string> = {
  sm: 'translate-x-3',
  md: 'translate-x-4',
};

export function Switch({
  checked,
  onChange,
  size = 'sm',
  disabled,
  label,
  labelPosition = 'before',
  title,
  className = '',
  'aria-label': ariaLabel,
}: SwitchProps) {
  const knobOff = 'translate-x-0.5';

  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      title={title}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        'relative inline-flex items-center rounded-pill shrink-0',
        'transition-colors duration-fast ease-out',
        'disabled:cursor-not-allowed disabled:opacity-40',
        TRACK_CLASS[size],
        checked ? 'bg-brand' : 'bg-border-strong',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className={[
          'inline-block rounded-pill bg-surface shadow-e1',
          'transition-transform duration-fast ease-out',
          KNOB_CLASS[size],
          checked ? KNOB_TRANSLATE[size] : knobOff,
        ].join(' ')}
      />
    </button>
  );

  if (!label) {
    return <span className={className}>{button}</span>;
  }
  return (
    <label
      className={[
        'inline-flex items-center gap-2 select-none',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={title}
    >
      {labelPosition === 'before' ? (
        <>
          <span>{label}</span>
          {button}
        </>
      ) : (
        <>
          {button}
          <span>{label}</span>
        </>
      )}
    </label>
  );
}
