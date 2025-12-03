import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const initials = name ? getInitials(name) : '?';

  // Generate a consistent color based on the name
  const colorIndex = name
    ? name.charCodeAt(0) % 6
    : 0;
  const colors = [
    'bg-brand-500 text-white',
    'bg-success-500 text-white',
    'bg-warning-500 text-gray-900',
    'bg-error-500 text-white',
    'bg-gray-600 text-white',
    'bg-brand-600 text-white',
  ];

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={cn(
          'rounded-full object-cover ring-2 ring-gray-800',
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-medium',
        sizes[size],
        colors[colorIndex],
        className
      )}
    >
      {initials}
    </div>
  );
}

interface AvatarGroupProps {
  avatars: Array<{ src?: string | null; name?: string }>;
  max?: number;
  size?: AvatarProps['size'];
  className?: string;
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = 'md',
  className,
}: AvatarGroupProps) {
  const displayed = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const overlapSizes = {
    xs: '-ml-2',
    sm: '-ml-2',
    md: '-ml-3',
    lg: '-ml-4',
    xl: '-ml-5',
  };

  return (
    <div className={cn('flex items-center', className)}>
      {displayed.map((avatar, i) => (
        <Avatar
          key={i}
          {...avatar}
          size={size}
          className={cn(
            'ring-2 ring-gray-900',
            i > 0 && overlapSizes[size]
          )}
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-gray-700 text-gray-200 font-medium ring-2 ring-gray-900',
            {
              xs: 'h-6 w-6 text-[10px] -ml-2',
              sm: 'h-8 w-8 text-xs -ml-2',
              md: 'h-10 w-10 text-sm -ml-3',
              lg: 'h-12 w-12 text-base -ml-4',
              xl: 'h-16 w-16 text-lg -ml-5',
            }[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
