'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useChartColors } from '@/hooks/use-chart-colors';

interface DataPoint {
  name: string;
  [key: string]: string | number;
}

interface BarChartProps {
  data: DataPoint[];
  dataKeys: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  stacked?: boolean;
  layout?: 'vertical' | 'horizontal';
  barSize?: number;
  className?: string;
}

export function BarChart({
  data,
  dataKeys,
  xAxisKey = 'name',
  height = 300,
  showGrid = true,
  showLegend = false,
  showTooltip = true,
  stacked = false,
  layout = 'horizontal',
  barSize,
  className,
}: BarChartProps) {
  const colors = useChartColors();
  const isVertical = layout === 'vertical';

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          layout={layout}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.grid}
              horizontal={!isVertical}
              vertical={isVertical}
            />
          )}
          {isVertical ? (
            <>
              <XAxis
                type="number"
                tick={{ fill: colors.textMuted, fontSize: 12 }}
                axisLine={{ stroke: colors.grid }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey={xAxisKey}
                tick={{ fill: colors.textMuted, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
            </>
          ) : (
            <>
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
            </>
          )}
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
              cursor={{ fill: `${colors.grid}50` }}
            />
          )}
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 16, color: colors.text }}
            />
          )}
          {dataKeys.map((dk) => (
            <Bar
              key={dk.key}
              dataKey={dk.key}
              name={dk.name}
              fill={dk.color}
              stackId={stacked ? 'stack' : undefined}
              barSize={barSize}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
