'use client';

import { useState, useRef, useEffect } from 'react';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Calendar, ChevronDown, Check } from 'lucide-react';

export interface DateRange {
  from: Date;
  to: Date;
}

interface Preset {
  label: string;
  id: string;
  getValue: () => DateRange;
}

const presets: Preset[] = [
  {
    id: 'today',
    label: 'Today',
    getValue: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    id: 'yesterday',
    label: 'Yesterday',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 1)),
      to: endOfDay(subDays(new Date(), 1)),
    }),
  },
  {
    id: 'last7days',
    label: 'Last 7 days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    id: 'last14days',
    label: 'Last 14 days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 13)),
      to: endOfDay(new Date()),
    }),
  },
  {
    id: 'last30days',
    label: 'Last 30 days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date()),
    }),
  },
  {
    id: 'thisMonth',
    label: 'This month',
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    id: 'lastMonth',
    label: 'Last month',
    getValue: () => ({
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(subMonths(new Date(), 1)),
    }),
  },
  {
    id: 'last90days',
    label: 'Last 90 days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 89)),
      to: endOfDay(new Date()),
    }),
  },
];

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

function getPresetIdFromRange(range: DateRange): string | null {
  const rangeStr = `${format(range.from, 'yyyy-MM-dd')}-${format(range.to, 'yyyy-MM-dd')}`;

  for (const preset of presets) {
    const presetRange = preset.getValue();
    const presetStr = `${format(presetRange.from, 'yyyy-MM-dd')}-${format(presetRange.to, 'yyyy-MM-dd')}`;
    if (rangeStr === presetStr) {
      return preset.id;
    }
  }
  return null;
}

function getDisplayLabel(range: DateRange): string {
  const presetId = getPresetIdFromRange(range);
  if (presetId) {
    const preset = presets.find(p => p.id === presetId);
    if (preset) return preset.label;
  }

  // Custom range - show dates
  if (format(range.from, 'yyyy-MM-dd') === format(range.to, 'yyyy-MM-dd')) {
    return format(range.from, 'MMM d, yyyy');
  }
  return `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d, yyyy')}`;
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Default to today if no value
  const displayRange = value || presets[0].getValue();
  const selectedPresetId = getPresetIdFromRange(displayRange);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = (preset: Preset) => {
    const range = preset.getValue();
    onChange(range);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="justify-between gap-2 min-w-[180px]"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-gray-100">
            {getDisplayLabel(displayRange)}
          </span>
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 text-gray-500 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </Button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-gray-900 border border-gray-800 rounded-xl shadow-xl py-2 min-w-[200px]">
          {presets.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                  isSelected
                    ? 'bg-brand-500/10 text-brand-400 font-medium'
                    : 'text-gray-300 hover:bg-gray-800'
                )}
              >
                <span>{preset.label}</span>
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
