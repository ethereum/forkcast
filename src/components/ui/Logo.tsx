import { Link } from 'react-router-dom';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<LogoSize, string> = {
  xs: 'h-4',   // 16px
  sm: 'h-5',   // 20px
  md: 'h-6',   // 24px
  lg: 'h-7',   // 28px
  xl: 'h-8',   // 32px
};

export function Logo({ size = 'md', className = '' }: { size?: LogoSize; className?: string }) {
  return (
    <Link to="/" className={`inline-block ${className}`}>
      <img 
        src="/forkcast-logo.svg" 
        alt="Forkcast" 
        className={`${sizeClasses[size]} hover:opacity-80 transition-opacity duration-200`} 
      />
    </Link>
  );
}
