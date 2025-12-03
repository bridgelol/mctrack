'use client';

import { useEffect, useState } from 'react';

interface ChartColors {
  text: string;
  textMuted: string;
  grid: string;
  tooltipBg: string;
  tooltipBorder: string;
}

// Dark theme colors (mctrack)
const darkColors: ChartColors = {
  text: '#f3f4f6',
  textMuted: '#9ca3af',
  grid: '#374151',
  tooltipBg: '#1f2937',
  tooltipBorder: '#374151',
};

// Light theme colors
const lightColors: ChartColors = {
  text: '#1f2937',
  textMuted: '#6b7280',
  grid: '#e5e7eb',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e5e7eb',
};

export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(darkColors);

  useEffect(() => {
    const updateColors = () => {
      const html = document.documentElement;
      const theme = html.getAttribute('data-theme');
      setColors(theme === 'light' ? lightColors : darkColors);
    };

    updateColors();

    // Observe theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          updateColors();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  return colors;
}
