import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type IconButtonVariant = 'primary' | 'outline' | 'ghost';
export type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  'aria-label': string; // required for a11y
}

const SIZE_CLASS: Record<IconButtonSize, string> = {
  sm: 'w-7 h-7 rounded-sm',
  md: 'w-8 h-8 rounded-md',
  lg: 'w-10 h-10 rounded-md',
};

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
  primary:
    'bg-brand text-on-brand shadow-e2 hover:bg-brand-hover active:bg-brand-active active:scale-[0.96]',
  outline:
    'bg-surface text-secondary border border-border-default hover:bg-subtle hover:border-border-strong hover:text-primary active:bg-muted',
  ghost:
    'bg-transparent text-tertiary hover:bg-subtle hover:text-primary active:bg-muted',
};

const BASE =
  'inline-flex items-center justify-center ' +
  'transition-[background-color,border-color,color,transform] ' +
  'duration-fast ease-out ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none';

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      icon,
      variant = 'ghost',
      size = 'md',
      className = '',
      type = 'button',
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={[BASE, SIZE_CLASS[size], VARIANT_CLASS[variant], className]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {icon}
      </button>
    );
  },
);
