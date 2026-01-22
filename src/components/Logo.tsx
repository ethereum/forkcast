import { Link } from 'react-router-dom';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<LogoSize, string> = {
  xs: 'h-2',   // 32px
  sm: 'h-4',  // 40px
  md: 'h-6',  // 48px
  lg: 'h-8',  // 56px
  xl: 'h-10',  // 64px
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
