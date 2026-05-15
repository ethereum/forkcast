import { Link } from 'react-router-dom';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const imgSizeClasses: Record<LogoSize, string> = {
  xs: 'h-4',
  sm: 'h-5',
  md: 'h-6',
  lg: 'h-7',
  xl: 'h-8',
  '2xl': 'h-10',
};

const symbolSizeClasses: Record<LogoSize, string> = {
  xs: 'text-base',
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
  '2xl': 'text-4xl',
};

export function Logo({ size = 'md', className = '' }: { size?: LogoSize; className?: string }) {
  return (
    <Link to="/" className={`forkcast-logo ${className}`}>
      <span className={`fork-symbol ${symbolSizeClasses[size]}`} aria-hidden="true">⎇</span>
      <img
        src="/forkcast-logo.svg"
        alt="Forkcast"
        className={`${imgSizeClasses[size]} forkcast-wordmark transition-opacity duration-200`}
      />
    </Link>
  );
}
