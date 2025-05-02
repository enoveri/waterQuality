/**
 * Bar Chart Adapter for Chart.js
 * 
 * This utility provides specialized configuration for bar charts with time scales.
 * It helps solve common issues with bar charts on time axes by adjusting bar positioning,
 * width, and other parameters based on data density.
 */

/**
 * Calculate the optimal bar width and configuration based on data density
 * @param {Array} data - Array of data points or timestamps
 * @param {String} timeUnit - Time unit ('hour', 'day', 'auto', etc.)
 * @returns {Object} Bar chart specific configuration
 */
export const getBarChartConfig = (data = [], timeUnit = 'auto') => {
  console.log(`[DEBUG] Getting bar chart config for ${data.length} data points with time unit: ${timeUnit}`);
  
  // Calculate configuration based on data density
  const count = data.length;
  let barPercentage = 0.9;
  let categoryPercentage = 0.8;
  
  // Adjust bar width based on number of data points
  if (count > 100) {
    barPercentage = 0.98;
    categoryPercentage = 0.98;
  } else if (count > 50) {
    barPercentage = 0.95;
    categoryPercentage = 0.95;
  } else if (count > 20) {
    barPercentage = 0.9;
    categoryPercentage = 0.9;
  } else if (count > 10) {
    barPercentage = 0.8;
    categoryPercentage = 0.9;
  } else {
    // For small datasets, make bars more prominent
    barPercentage = 0.7;
    categoryPercentage = 0.8;
  }
  
  console.log(`[DEBUG] Bar configuration: barPercentage=${barPercentage}, categoryPercentage=${categoryPercentage}`);
  
  return {
    barPercentage,
    categoryPercentage,
    borderWidth: 1,
    maxBarThickness: count > 50 ? 8 : 20,
    minBarLength: 3,
  };
};

/**
 * Optimizes time scale configuration specifically for bar charts
 * @param {Object} timeScaleConfig - Base time scale configuration
 * @param {Array} dataPoints - Data points array
 * @returns {Object} Optimized time scale configuration for bar charts
 */
export const optimizeTimeScaleForBarChart = (timeScaleConfig = {}, dataPoints = []) => {
  console.log(`[DEBUG] Optimizing time scale for bar chart with ${dataPoints.length} points`);
  
  // Start with existing config or create a new one
  const optimizedConfig = { ...timeScaleConfig };
  
  // Essential for proper bar positioning with time scale
  optimizedConfig.offset = true;
  
  // Add bar-specific optimizations
  if (dataPoints.length > 0) {
    // Calculate the average time interval between data points
    // This helps determine proper tick configuration
    if (dataPoints.length > 1 && 
        dataPoints[0]?.x instanceof Date && 
        dataPoints[dataPoints.length-1]?.x instanceof Date) {
      
      const firstDate = dataPoints[0].x.getTime();
      const lastDate = dataPoints[dataPoints.length-1].x.getTime();
      const avgInterval = (lastDate - firstDate) / (dataPoints.length - 1);
      
      console.log(`[DEBUG] Average time interval between points: ${avgInterval}ms`);
      
      // Adjust max ticks based on time interval
      if (avgInterval < 60000) { // less than a minute
        optimizedConfig.ticks = {
          ...optimizedConfig.ticks,
          maxTicksLimit: Math.min(10, Math.ceil(dataPoints.length / 10))
        };
      } else if (avgInterval < 3600000) { // less than an hour
        optimizedConfig.ticks = {
          ...optimizedConfig.ticks,
          maxTicksLimit: Math.min(12, Math.ceil(dataPoints.length / 8))
        };
      } else {
        optimizedConfig.ticks = {
          ...optimizedConfig.ticks,
          maxTicksLimit: Math.min(15, Math.ceil(dataPoints.length / 6))
        };
      }
    }
  }
  
  console.log('[DEBUG] Optimized time scale config:', optimizedConfig);
  return optimizedConfig;
};