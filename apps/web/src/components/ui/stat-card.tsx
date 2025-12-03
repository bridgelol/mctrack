import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: 'brand' | 'success' | 'warning' | 'error' | 'gray' | 'primary' | 'secondary' | 'info';
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  change,
  changeLabel = 'from last period',
  icon: Icon,
  iconColor = 'brand',
  className,
}: StatCardProps) {
  const iconColors = {
    brand: 'bg-brand-500/15 text-brand-400',
    primary: 'bg-brand-500/15 text-brand-400',
    success: 'bg-success-500/15 text-success-400',
    warning: 'bg-warning-500/15 text-warning-400',
    error: 'bg-error-500/15 text-error-400',
    gray: 'bg-gray-700 text-gray-300',
    secondary: 'bg-indigo-500/15 text-indigo-400',
    info: 'bg-blue-500/15 text-blue-400',
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-800 bg-gray-900 p-6',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-50">{value}</p>
        </div>
        {Icon && (
          <div
            className={cn(
              'p-3 rounded-xl',
              iconColors[iconColor]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {(change !== undefined || description) && (
        <div className="mt-4 flex items-center gap-2">
          {change !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-sm font-medium',
                change >= 0 ? 'text-success-400' : 'text-error-400'
              )}
            >
              {change >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
          <span className="text-sm text-gray-500">
            {description || changeLabel}
          </span>
        </div>
      )}
    </div>
  );
}
