import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from './button';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface ActionConfig {
  label: string;
  onClick: () => void;
  variant?: ButtonProps['variant'];
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ActionConfig | ReactNode;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

function isActionConfig(action: ActionConfig | ReactNode): action is ActionConfig {
  return (
    typeof action === 'object' &&
    action !== null &&
    'label' in action &&
    'onClick' in action
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 p-4 rounded-full bg-gray-800">
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-50">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-400 max-w-sm">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex items-center gap-3">
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            isActionConfig(action) ? (
              <Button
                variant={action.variant || 'primary'}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ) : (
              action
            )
          )}
        </div>
      )}
    </div>
  );
}
