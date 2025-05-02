/**
 * Chart configuration utilities for various chart types.
 * Provides consistent styling and options across the application.
 */
import { getBarChartConfig } from './barChartAdapter';

// Chart.js default options for consistent styling
export const defaultChartOptions = (title = '', tooltipCallbacks = {}) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 600,
  },
  plugins: {
    legend: {
      position: 'top',
      align: 'end',
      labels: {
        boxWidth: 12,
        usePointStyle: true,
      }
    },
    title: {
      display: !!title,
      text: title,
      font: {
        size: 14,
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: tooltipCallbacks,
    }
  },
});

// Default colors with opacity variations for different chart types
export const CHART_COLORS = {
  blue: {
    primary: 'rgb(54, 162, 235)',
    light: 'rgba(54, 162, 235, 0.2)',
    medium: 'rgba(54, 162, 235, 0.5)',
  },
  red: {
    primary: 'rgb(255, 99, 132)',
    light: 'rgba(255, 99, 132, 0.2)',
    medium: 'rgba(255, 99, 132, 0.5)',
  },
  green: {
    primary: 'rgb(75, 192, 192)',
    light: 'rgba(75, 192, 192, 0.2)',
    medium: 'rgba(75, 192, 192, 0.5)',
  },
  purple: {
    primary: 'rgb(153, 102, 255)',
    light: 'rgba(153, 102, 255, 0.2)',
    medium: 'rgba(153, 102, 255, 0.5)',
  },
  orange: {
    primary: 'rgb(255, 159, 64)',
    light: 'rgba(255, 159, 64, 0.2)',
    medium: 'rgba(255, 159, 64, 0.5)',
  },
  grey: {
    primary: 'rgb(201, 203, 207)',
    light: 'rgba(201, 203, 207, 0.2)',
    medium: 'rgba(201, 203, 207, 0.5)',
  }
};

/**
 * Get appropriate color and styling for a specific chart type
 * @param {string} chartType - Type of chart ('line', 'bar', 'area')
 * @param {string} colorName - Key in CHART_COLORS object
 * @returns {object} - Color configurations for the specified chart type
 */
export const getChartTypeColors = (chartType, colorName = 'blue') => {
  const color = CHART_COLORS[colorName] || CHART_COLORS.blue;
  
  switch (chartType) {
    case 'bar':
      return {
        backgroundColor: color.medium,
        borderColor: color.primary,
        borderWidth: 1,
        hoverBackgroundColor: color.primary,
        hoverBorderColor: color.primary,
      };
    case 'area':
      return {
        backgroundColor: color.light,
        borderColor: color.primary,
        borderWidth: 2,
        pointRadius: 2,
        pointBackgroundColor: color.primary,
        fill: true,
      };
    case 'line':
    default:
      return {
        backgroundColor: 'transparent',
        borderColor: color.primary,
        borderWidth: 2,
        pointRadius: 2,
        pointBackgroundColor: color.primary,
        fill: false,
      };
  }
};

/**
 * Creates options for time series charts
 * @param {string} chartType - Type of chart ('line', 'bar', 'area')
 * @param {string} timeUnit - Time unit for x-axis ('hour', 'day', 'month', etc.)
 * @param {Number} dataPointCount - Number of data points
 * @returns {Object} - Chart.js options for time-series charts
 */
export const getTimeSeriesOptions = (chartType = 'line', timeUnit = 'day', dataPointCount = 0) => {
  console.log(`[DEBUG] Generating ${chartType} chart options with ${timeUnit} unit and ${dataPointCount} points`);
  
  // Base options
  const options = defaultChartOptions();
  
  // Time scale configuration
  options.scales = {
    x: {
      type: 'time',
      time: {
        unit: timeUnit,
        tooltipFormat: timeUnit === 'hour' ? 'HH:mm' : 'MMM d',
      },
      ticks: {
        source: 'auto',
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 10,
      },
      grid: {
        display: true,
        drawOnChartArea: false,
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        maxTicksLimit: 8,
      },
      grid: {
        drawBorder: false,
      },
    }
  };
  
  // Bar chart specific adjustments for time scale
  if (chartType === 'bar') {
    console.log('[DEBUG] Applying bar chart specific settings');
    
    // Essential for proper bar positioning with time scale
    options.scales.x.offset = true;
    
    // Add recommended bar chart settings from adapter
    if (dataPointCount > 0) {
      // Get bar sizing based on data density
      const barConfig = getBarChartConfig(new Array(dataPointCount), timeUnit);
      options.datasets = {
        bar: barConfig
      };
      
      console.log('[DEBUG] Applied bar chart configuration:', barConfig);
    }
  }
  
  return options;
};

/**
 * Generate chart dataset configuration
 * @param {Array} data - Chart data
 * @param {string} label - Dataset label
 * @param {string} chartType - Chart type ('line', 'bar', 'area')
 * @param {string} colorName - Color key from CHART_COLORS
 * @returns {Object} - Dataset configuration
 */
export const createChartDataset = (data, label, chartType = 'line', colorName = 'blue') => {
  console.log(`[DEBUG] Creating ${chartType} dataset with ${data?.length || 0} points`);
  
  const colors = getChartTypeColors(chartType, colorName);
  
  return {
    label,
    data,
    ...colors,
    tension: chartType === 'bar' ? 0 : 0.3,
    // Add specific bar chart optimizations
    ...(chartType === 'bar' ? getBarChartConfig(data, 'auto') : {})
  };
};