import { cn } from '@/lib/utils';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'error' | 'gray' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className,
}: BadgeProps) {
  const variants = {
    default: 'bg-gray-800 text-gray-300',
    brand: 'bg-brand-500/15 text-brand-400',
    success: 'bg-success-500/15 text-success-400',
    warning: 'bg-warning-500/15 text-warning-400',
    error: 'bg-error-500/15 text-error-400',
    gray: 'bg-gray-700 text-gray-200',
    outline: 'border border-gray-700 bg-transparent text-gray-300',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  const dotColors = {
    default: 'bg-gray-400',
    brand: 'bg-brand-400',
    success: 'bg-success-400',
    warning: 'bg-warning-400',
    error: 'bg-error-400',
    gray: 'bg-gray-300',
    outline: 'bg-gray-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
}
