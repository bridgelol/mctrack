'use client';

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useChartColors } from '@/hooks/use-chart-colors';

interface DataPoint {
  name: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: DataPoint[];
  colors?: string[];
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  className?: string;
  showLabels?: boolean;
}

const DEFAULT_COLORS = [
  '#6366f1', // primary
  '#8b5cf6', // secondary
  '#22c55e', // success
  '#3b82f6', // info
  '#f59e0b', // warning
  '#ef4444', // error
  '#06b6d4', // accent
];

export function PieChart({
  data,
  colors: customColors = DEFAULT_COLORS,
  height = 300,
  showLegend = true,
  showTooltip = true,
  innerRadius = 60,
  outerRadius = 100,
  className,
  showLabels = false,
}: PieChartProps) {
  const themeColors = useChartColors();
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            label={
              showLabels
                ? ({ percent }) => `${(percent * 100).toFixed(0)}%`
                : false
            }
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || customColors[index % customColors.length]}
                strokeWidth={0}
              />
            ))}
          </Pie>
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: themeColors.tooltipBg,
                border: `1px solid ${themeColors.tooltipBorder}`,
                borderRadius: '0.5rem',
                fontSize: 12,
                color: themeColors.text,
              }}
              formatter={(value: number, name: string) => [
                `${value.toLocaleString()} (${((value / total) * 100).toFixed(1)}%)`,
                name,
              ]}
            />
          )}
          {showLegend && (
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ fontSize: 12, paddingLeft: 20, color: themeColors.text }}
              formatter={(value) => (
                <span style={{ color: themeColors.textMuted }}>{value}</span>
              )}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Donut chart variant with center text
interface DonutChartProps extends PieChartProps {
  centerLabel?: string;
  centerValue?: string | number;
}

export function DonutChart({
  centerLabel,
  centerValue,
  innerRadius = 70,
  outerRadius = 100,
  ...props
}: DonutChartProps) {
  return (
    <div className="relative">
      <PieChart {...props} innerRadius={innerRadius} outerRadius={outerRadius} />
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue !== undefined && (
            <span className="text-2xl font-bold text-base-content">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-sm text-base-content/60">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
