import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-7 px-3 text-[12px]',
  md: 'h-8 px-4 text-[13px]',
  lg: 'h-10 px-5 text-[14px]',
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-on-brand shadow-e2 hover:bg-brand-hover hover:shadow-brand-cta active:bg-brand-active active:scale-[0.98]',
  secondary:
    'bg-surface text-secondary border border-border-default hover:bg-subtle hover:border-border-strong hover:text-primary active:bg-muted active:scale-[0.98]',
  ghost:
    'bg-transparent text-secondary hover:bg-subtle hover:text-primary active:bg-muted',
  danger:
    'bg-error text-on-brand hover:bg-error/90 active:scale-[0.98]',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium ' +
  'transition-[background-color,border-color,color,box-shadow,transform] ' +
  'duration-fast ease-out ' +
  'disabled:bg-muted disabled:text-disabled disabled:border-border-default ' +
  'disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'secondary',
      size = 'md',
      leadingIcon,
      trailingIcon,
      fullWidth,
      className = '',
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={[
          BASE,
          SIZE_CLASS[size],
          VARIANT_CLASS[variant],
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {leadingIcon}
        {children}
        {trailingIcon}
      </button>
    );
  },
);
