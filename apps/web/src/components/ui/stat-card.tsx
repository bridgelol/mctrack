interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  change?: number;
  icon?: string;
}

export function StatCard({ title, value, description, change, icon }: StatCardProps) {
  return (
    <div className="stat bg-base-200 rounded-box">
      {icon && (
        <div className="stat-figure text-2xl">
          {icon}
        </div>
      )}
      <div className="stat-title">{title}</div>
      <div className="stat-value text-primary">{value}</div>
      {description && (
        <div className="stat-desc">{description}</div>
      )}
      {change !== undefined && (
        <div className={`stat-desc ${change >= 0 ? 'text-success' : 'text-error'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% from last period
        </div>
      )}
    </div>
  );
}
