import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive' | 'link' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        'bg-brand-500 text-white hover:bg-brand-600 shadow-xs',
      secondary:
        'bg-gray-800 text-gray-100 hover:bg-gray-700 border border-gray-700 shadow-xs',
      tertiary:
        'bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-gray-100',
      ghost:
        'hover:bg-gray-800 text-gray-300 hover:text-gray-100',
      outline:
        'border border-gray-700 bg-transparent hover:bg-gray-800 text-gray-300',
      destructive:
        'bg-error-500 text-white hover:bg-error-600 shadow-xs',
      link: 'text-brand-400 underline-offset-4 hover:underline p-0 h-auto',
    };

    const sizes = {
      sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
      md: 'h-10 px-4 text-sm gap-2 rounded-lg',
      lg: 'h-11 px-4 text-base gap-2 rounded-lg',
      xl: 'h-12 px-5 text-base gap-2.5 rounded-xl',
      '2xl': 'h-14 px-6 text-lg gap-3 rounded-xl',
      icon: 'h-10 w-10 rounded-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950',
          'disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
