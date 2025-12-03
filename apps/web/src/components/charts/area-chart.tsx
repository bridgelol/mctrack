'use client';

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useChartColors } from '@/hooks/use-chart-colors';

interface DataPoint {
  name: string;
  [key: string]: string | number;
}

interface AreaChartProps {
  data: DataPoint[];
  dataKeys: Array<{
    key: string;
    name: string;
    color: string;
    gradientId?: string;
  }>;
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  stacked?: boolean;
  className?: string;
}

export function AreaChart({
  data,
  dataKeys,
  xAxisKey = 'name',
  height = 300,
  showGrid = true,
  showLegend = false,
  showTooltip = true,
  stacked = false,
  className,
}: AreaChartProps) {
  const colors = useChartColors();

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            {dataKeys.map((dk) => (
              <linearGradient
                key={dk.key}
                id={dk.gradientId || `gradient-${dk.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={dk.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={dk.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.grid}
              vertical={false}
            />
          )}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: colors.textMuted, fontSize: 12 }}
            axisLine={{ stroke: colors.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: colors.textMuted, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
            }
          />
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: '0.5rem',
                fontSize: 12,
                color: colors.text,
              }}
              labelStyle={{ color: colors.text }}
              itemStyle={{ color: colors.textMuted }}
            />
          )}
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 16, color: colors.text }}
            />
          )}
          {dataKeys.map((dk) => (
            <Area
              key={dk.key}
              type="monotone"
              dataKey={dk.key}
              name={dk.name}
              stroke={dk.color}
              strokeWidth={2}
              fill={`url(#${dk.gradientId || `gradient-${dk.key}`})`}
              stackId={stacked ? 'stack' : undefined}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
