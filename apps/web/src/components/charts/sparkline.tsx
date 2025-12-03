'use client';

import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  className?: string;
  positive?: boolean;
}

export function Sparkline({
  data,
  color,
  height = 40,
  width = 100,
  className,
  positive,
}: SparklineProps) {
  // Transform data array to chart format
  const chartData = data.map((value, index) => ({
    value,
    index,
  }));

  // Determine color based on trend if not provided
  const lineColor = color || (positive !== undefined
    ? (positive ? '#22c55e' : '#ef4444')
    : '#6366f1');

  return (
    <div className={cn('', className)} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sparkline-gradient-${lineColor}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={1.5}
            fill={`url(#sparkline-gradient-${lineColor})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
