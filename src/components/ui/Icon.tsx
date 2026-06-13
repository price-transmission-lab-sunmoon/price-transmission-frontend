import { ICON_PATHS, ICON_STROKE_WIDTH, type IconName } from '@/utils/icons';

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean;
  'aria-label'?: string;
  filled?: boolean; // for solid icons (sparkles, play)
}

const FILLED_DEFAULT: IconName[] = ['sparkles', 'play', 'pause', 'dot', 'bolt'];

export function Icon({
  name,
  size = 16,
  strokeWidth = ICON_STROKE_WIDTH,
  className,
  style,
  filled,
  'aria-hidden': ariaHidden = true,
  'aria-label': ariaLabel,
}: IconProps) {
  const path = ICON_PATHS[name];
  const isFilled = filled ?? FILLED_DEFAULT.includes(name);
  const role = ariaLabel ? 'img' : undefined;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isFilled ? 'currentColor' : 'none'}
      stroke={isFilled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      role={role}
    >
      <path d={path} />
    </svg>
  );
}
