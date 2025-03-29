import { useState, useMemo, useEffect, useContext } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
} from 'chart.js'
import { enUS } from 'date-fns/locale'
import 'chartjs-adapter-date-fns'
import { Line, Bar, Scatter } from 'react-chartjs-2'
import { 
  LineChart as LineIcon, 
  BarChart as BarIcon, 
  Activity, 
  Square, 
  Grid,
  Calendar,
  ArrowDownUp,
  X
} from 'lucide-react'
import regression from 'regression'
import { SettingsContext } from '../App'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
)

const CHART_TYPES = [
  { id: 'line', label: 'Line', icon: LineIcon },
  { id: 'bar', label: 'Bar', icon: BarIcon },
  { id: 'area', label: 'Area', icon: Square },
  { id: 'scatter', label: 'Scatter', icon: Grid }
]

const TIME_RANGES = [
  { id: '1m', label: 'Last Minute' },
  { id: '5m', label: 'Last 5 Minutes' },
  { id: '15m', label: 'Last 15 Minutes' },
  { id: '1h', label: 'Last Hour' },
  { id: 'day', label: 'Last 24 Hours' },
  { id: 'week', label: 'Last Week' },
  { id: 'month', label: 'Last Month' },
  { id: 'year', label: 'Last Year' },
  { id: 'custom', label: 'Custom Range' }
]

export function AdvancedCharts({ dataHistory }) {
  const { units, timeFormat, timezone } = useContext(SettingsContext)
  const [chartType, setChartType] = useState('scatter')
  const [timeRange, setTimeRange] = useState('5m')
  const [xVariable, setXVariable] = useState('temperature')
  const [yVariable, setYVariable] = useState('pH')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [error, setError] = useState(null)
  
  // Reset error when chart parameters change
  useEffect(() => {
    setError(null)
  }, [chartType, timeRange, xVariable, yVariable])
  
  // Error handler wrapper for major component functions
  const safeExecute = (fn, fallbackValue) => {
    try {
      return fn()
    } catch (err) {
      console.error("Error in AdvancedCharts:", err)
      setError(err.message || "An error occurred")
      return fallbackValue
    }
  }

  try {
    // Initialize VARIABLES with dynamic units
    const VARIABLES = useMemo(() => [
      { id: 'temperature', label: 'Temperature', unit: units.temperature === 'C' ? '°C' : '°F', color: '#ef4444' },
      { id: 'pH', label: 'pH', unit: '', color: '#3b82f6' },
      { id: 'turbidity', label: 'Turbidity', unit: units.turbidity, color: '#10b981' },
      { id: 'waterLevel', label: 'Water Level', unit: units.waterLevel, color: '#8b5cf6' }
    ], [units]);
  
    // Initialize custom date range when selected
    useEffect(() => {
      if (timeRange === 'custom') {
        setShowCustomRange(true)
        // Set defaults if not already set
        if (!customEndDate) {
          const now = new Date()
          setCustomEndDate(formatDateTime(now))
          
          // Default start date to 24 hours before
          const yesterday = new Date(now)
          yesterday.setDate(yesterday.getDate() - 1)
          setCustomStartDate(formatDateTime(yesterday))
        }
      } else {
        setShowCustomRange(false)
      }
    }, [timeRange])
    
    // Format a date using the application's timezone and time format
    const formatDate = (date) => {
      if (!date) return '';
      
      try {
        // Ensure date is a Date object
        const dateObj = date instanceof Date ? date : new Date(date);
        
        // Check if date is valid
        if (isNaN(dateObj.getTime())) {
          return 'Invalid date';
        }
        
        const options = {
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
          hour12: timeFormat === '12h',
          timeZone: timezone || 'UTC'
        };
        
        return new Intl.DateTimeFormat('en-US', options).format(dateObj);
      } catch (error) {
        console.error("Error formatting date:", error);
        // Fallback format
        try {
          const dateObj = date instanceof Date ? date : new Date(date);
          return dateObj.toLocaleTimeString();
        } catch (e) {
          return 'Date error';
        }
      }
    };
    
    // Helper to format date for datetime-local input
    const formatDateTime = (date) => {
      return date.toISOString().slice(0, 16)
    }
    
    // Handle custom range application
    const applyCustomRange = () => {
      if (customStartDate && customEndDate) {
        // Force re-render of filtered data
        const temp = timeRange
        setTimeRange('custom_applied')
        setTimeout(() => setTimeRange(temp), 10)
      }
    }
    
    // Function to convert units based on user preferences
    const convertUnits = (data) => {
      if (!data) return data;
      
      const result = { ...data };
      
      // Convert temperature if needed
      if (units.temperature === 'F' && data.temperature) {
        result.temperature = data.temperature.map(item => ({
          ...item,
          value: (item.value * 9/5) + 32
        }));
      }
      
      // Add other unit conversions here
      
      return result;
    };
    
    // Filter and convert data based on time range and units
    const filteredData = useMemo(() => {
      if (!dataHistory || !dataHistory.temperature) return { 
        temperature: [], 
        pH: [], 
        turbidity: [], 
        waterLevel: [] 
      }
      
      const now = Date.now()
      
      // Handle custom time range
      if (timeRange === 'custom' && customStartDate && customEndDate) {
        const startTime = new Date(customStartDate).getTime()
        const endTime = new Date(customEndDate).getTime()
        
        const filtered = {
          temperature: dataHistory.temperature.filter(d => {
            const timestamp = d.timestamp instanceof Date ? 
              d.timestamp.getTime() : new Date(d.timestamp).getTime()
            return timestamp >= startTime && timestamp <= endTime
          }),
          pH: dataHistory.pH.filter(d => {
            const timestamp = d.timestamp instanceof Date ? 
              d.timestamp.getTime() : new Date(d.timestamp).getTime()
            return timestamp >= startTime && timestamp <= endTime
          }),
          turbidity: dataHistory.turbidity.filter(d => {
            const timestamp = d.timestamp instanceof Date ? 
              d.timestamp.getTime() : new Date(d.timestamp).getTime()
            return timestamp >= startTime && timestamp <= endTime
          }),
          waterLevel: dataHistory.waterLevel.filter(d => {
            const timestamp = d.timestamp instanceof Date ? 
              d.timestamp.getTime() : new Date(d.timestamp).getTime()
            return timestamp >= startTime && timestamp <= endTime
          })
        }
        
        return convertUnits(filtered)
      }
      
      // Default time ranges
      const ranges = {
        '1m': 60 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        'day': 24 * 60 * 60 * 1000,
        'week': 7 * 24 * 60 * 60 * 1000,
        'month': 30 * 24 * 60 * 60 * 1000,
        'year': 365 * 24 * 60 * 60 * 1000
      }
      
      const cutoff = now - (ranges[timeRange] || ranges['day'])
      
      const filtered = {
        temperature: dataHistory.temperature.filter(d => {
          const timestamp = d.timestamp instanceof Date ? 
            d.timestamp.getTime() : new Date(d.timestamp).getTime()
          return timestamp >= cutoff
        }),
        pH: dataHistory.pH.filter(d => {
          const timestamp = d.timestamp instanceof Date ? 
            d.timestamp.getTime() : new Date(d.timestamp).getTime()
          return timestamp >= cutoff
        }),
        turbidity: dataHistory.turbidity.filter(d => {
          const timestamp = d.timestamp instanceof Date ? 
            d.timestamp.getTime() : new Date(d.timestamp).getTime()
          return timestamp >= cutoff
        }),
        waterLevel: dataHistory.waterLevel.filter(d => {
          const timestamp = d.timestamp instanceof Date ? 
            d.timestamp.getTime() : new Date(d.timestamp).getTime()
          return timestamp >= cutoff
        })
      }
      
      return convertUnits(filtered)
    }, [dataHistory, timeRange, customStartDate, customEndDate, units])
    
    // Prepare data points for charts
    const dataPoints = useMemo(() => {
      if (!filteredData || !filteredData[xVariable] || !filteredData[yVariable]) {
        return []
      }
      
      // For scatter plots, we need to match timestamps across variables
      if (chartType === 'scatter') {
        // Create a map of timestamps to values for the Y variable
        const yValuesMap = new Map(
          filteredData[yVariable].map(item => [
            item.timestamp instanceof Date ? 
              item.timestamp.getTime() : 
              (new Date(item.timestamp)).getTime(), 
            item.value
          ])
        )
        
        // Match X and Y values based on timestamp
        return filteredData[xVariable]
          .filter(xItem => {
            const timestamp = xItem.timestamp instanceof Date ? 
              xItem.timestamp.getTime() : 
              (new Date(xItem.timestamp)).getTime()
            return yValuesMap.has(timestamp)
          })
          .map(xItem => {
            const timestamp = xItem.timestamp instanceof Date ? 
              xItem.timestamp.getTime() : 
              (new Date(xItem.timestamp)).getTime()
            return {
              x: xItem.value,
              y: yValuesMap.get(timestamp),
              timestamp: xItem.timestamp instanceof Date ? xItem.timestamp : new Date(xItem.timestamp)
            }
          })
      } 
      
      // For time series charts, we just need the values from the selected variable
      return filteredData[yVariable].map(item => ({
        x: item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp),
        y: item.value
      }))
    }, [filteredData, xVariable, yVariable, chartType])

    // Calculate statistics
    const stats = useMemo(() => {
      if (dataPoints.length === 0) return null

      let xValues, yValues
      
      if (chartType === 'scatter') {
        xValues = dataPoints.map(d => d.x)
        yValues = dataPoints.map(d => d.y)
      } else {
        xValues = filteredData[xVariable]?.map(d => d.value) || []
        yValues = filteredData[yVariable]?.map(d => d.value) || []
      }
      
      if (xValues.length === 0 || yValues.length === 0) return null

      // Filter out NaN values
      xValues = xValues.filter(v => !isNaN(v) && v !== null)
      yValues = yValues.filter(v => !isNaN(v) && v !== null)
      
      if (xValues.length === 0 || yValues.length === 0) return null

      const xMean = xValues.reduce((a, b) => a + b, 0) / xValues.length
      const yMean = yValues.reduce((a, b) => a + b, 0) / yValues.length

      const xVariance = xValues.reduce((a, b) => a + Math.pow(b - xMean, 2), 0) / xValues.length
      const yVariance = yValues.reduce((a, b) => a + Math.pow(b - yMean, 2), 0) / yValues.length
      
      const xStd = Math.sqrt(xVariance)
      const yStd = Math.sqrt(yVariance)

      // Calculate correlation coefficient with protection against division by zero
      let correlation = 0
      if (xValues.length === yValues.length && xStd > 0 && yStd > 0) {
        correlation = xValues.reduce((acc, _, i) => {
          return acc + ((xValues[i] - xMean) * (yValues[i] - yMean))
        }, 0) / (xValues.length * xStd * yStd)
      }

      return {
        xMean: xMean.toFixed(2),
        yMean: yMean.toFixed(2),
        xStd: xStd.toFixed(2),
        yStd: yStd.toFixed(2),
        correlation: correlation.toFixed(2)
      }
    }, [dataPoints, filteredData, xVariable, yVariable, chartType])

    // Calculate regression line for scatter plot
    const regressionLine = useMemo(() => {
      if (chartType !== 'scatter' || dataPoints.length < 2) return null

      try {
        const points = dataPoints.map(d => [d.x, d.y])
        const result = regression.linear(points)
        
        const xValues = points.map(p => p[0])
        const xMin = Math.min(...xValues)
        const xMax = Math.max(...xValues)
        
        return {
          points: [
            { x: xMin, y: result.predict(xMin)[1] },
            { x: xMax, y: result.predict(xMax)[1] }
          ],
          r2: result.r2
        }
      } catch (error) {
        console.error('Regression calculation error:', error)
        return null
      }
    }, [dataPoints, chartType])

    // Prepare chart data
    const chartData = useMemo(() => {
      if (dataPoints.length === 0) return {
        datasets: []
      }

      if (chartType === 'scatter') {
        return {
          datasets: [
            {
              label: 'Data Points',
              data: dataPoints.map(d => ({ x: d.x, y: d.y })),
              backgroundColor: VARIABLES.find(v => v.id === yVariable).color,
              pointRadius: 4
            },
            regressionLine && {
              label: `Regression Line${regressionLine.r2 ? ` (R² = ${regressionLine.r2.toFixed(3)})` : ''}`,
              data: regressionLine.points,
              type: 'line',
              borderColor: 'rgba(0, 0, 0, 0.5)',
              borderWidth: 1,
              pointRadius: 0,
              fill: false
            }
          ].filter(Boolean)
        }
      }

      // For time series charts
      return {
        labels: dataPoints.map(d => new Date(d.x).toLocaleTimeString()),
        datasets: [{
          label: VARIABLES.find(v => v.id === yVariable).label,
          data: dataPoints.map(d => d.y),
          borderColor: VARIABLES.find(v => v.id === yVariable).color,
          backgroundColor: chartType === 'area' 
            ? `${VARIABLES.find(v => v.id === yVariable).color}33`
            : VARIABLES.find(v => v.id === yVariable).color,
          fill: chartType === 'area',
          tension: 0.4
        }]
      }
    }, [dataPoints, chartType, xVariable, yVariable, regressionLine])

    // Function to determine appropriate time units based on time range
    const getTimeConfig = (range, chartType, timeFormat) => {
      // Default config for scatter plots (not time-based)
      if (chartType === 'scatter') return {}
      
      // For time-based charts, determine units based on selected range
      let unit = 'minute'
      let tooltipFormat = timeFormat === '12h' ? 'MMM d, h:mm a' : 'MMM d, HH:mm'
      let displayFormats = {
        minute: timeFormat === '12h' ? 'h:mm a' : 'HH:mm',
        hour: timeFormat === '12h' ? 'h:mm a' : 'HH:mm',
        day: 'MMM d',
        second: 'HH:mm:ss',
        millisecond: 'HH:mm:ss.SSS'
      }
      
      // Adjust units based on time range
      if (range === '1m' || range === '5m') {
        unit = 'second'
        tooltipFormat = 'HH:mm:ss'
      } else if (range === '15m' || range === '1h') {
        unit = 'minute'
        tooltipFormat = timeFormat === '12h' ? 'h:mm:ss a' : 'HH:mm:ss'
      } else if (range === 'day') {
        unit = 'hour'
      } else if (range === 'week' || range === 'month') {
        unit = 'day'
      } else if (range === 'year') {
        unit = 'month'
        displayFormats.month = 'MMM yyyy'
        tooltipFormat = 'MMM yyyy'
      }
      
      return {
        unit,
        tooltipFormat,
        displayFormats
      }
    }

    // Chart options with timezone support
    const options = useMemo(() => {
      const timeConfig = getTimeConfig(timeRange, chartType, timeFormat)
      
      const baseOptions = {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.2, // Optimized aspect ratio for more height
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'start',
            labels: {
              boxWidth: 12,
              padding: 6,
              usePointStyle: true,
              font: {
                size: 10
              }
            },
            margin: 4
          },
          title: {
            display: true,
            text: chartType === 'scatter'
              ? `${VARIABLES.find(v => v.id === yVariable).label} vs ${VARIABLES.find(v => v.id === xVariable).label}`
              : VARIABLES.find(v => v.id === yVariable).label,
            font: {
              size: 12
            },
            padding: {
              top: 8,
              bottom: 8
            }
          },
          tooltip: {
            callbacks: {
              title: (tooltipItems) => {
                if (chartType === 'scatter') {
                  return '';
                }
                
                try {
                  const item = tooltipItems[0];
                  const dataPoint = dataPoints[item.dataIndex];
                  return dataPoint && dataPoint.x ? formatDate(dataPoint.x) : '';
                } catch (error) {
                  console.error("Error formatting tooltip title:", error);
                  return '';
                }
              }
            }
          }
        },
        layout: {
          padding: 0 // Remove padding to maximize chart area
        },
      }

      if (chartType === 'scatter') {
        return {
          ...baseOptions,
          scales: {
            x: {
              type: 'linear',
              position: 'bottom',
              title: {
                display: true,
                text: `${VARIABLES.find(v => v.id === xVariable).label} ${VARIABLES.find(v => v.id === xVariable).unit}`,
                font: {
                  size: 10
                },
                padding: 4
              },
              ticks: {
                maxTicksLimit: 8,
                padding: 3,
                font: {
                  size: 9
                }
              }
            },
            y: {
              title: {
                display: true,
                text: `${VARIABLES.find(v => v.id === yVariable).label} ${VARIABLES.find(v => v.id === yVariable).unit}`,
                font: {
                  size: 10
                },
                padding: 4
              },
              ticks: {
                maxTicksLimit: 8,
                padding: 3,
                font: {
                  size: 9
                }
              }
            },
          },
        }
      }

      return {
        ...baseOptions,
        scales: {
          x: {
            type: 'time',
            time: {
              unit: timeConfig.unit || 'minute',
              displayFormats: timeConfig.displayFormats || {
                minute: timeFormat === '12h' ? 'h:mm a' : 'HH:mm',
                hour: timeFormat === '12h' ? 'h:mm a' : 'HH:mm',
                day: 'MMM d',
                second: 'HH:mm:ss',
                millisecond: 'HH:mm:ss.SSS'
              },
              tooltipFormat: timeConfig.tooltipFormat,
            },
            adapters: {
              date: {
                locale: enUS
              }
            },
            title: {
              display: true,
              text: 'Time',
              font: {
                size: 10
              },
              padding: 4
            },
            ticks: {
              maxTicksLimit: 6,
              autoSkip: true,
              padding: 3,
              font: {
                size: 9
              }
            }
          },
          y: {
            title: {
              display: true,
              text: `${VARIABLES.find(v => v.id === yVariable).label} ${VARIABLES.find(v => v.id === yVariable).unit}`,
              font: {
                size: 10
              },
              padding: 4
            },
            ticks: {
              maxTicksLimit: 8,
              padding: 3,
              font: {
                size: 9
              }
            }
          },
        }
      }
    }, [chartType, xVariable, yVariable, VARIABLES, timeFormat, dataPoints, timeRange])

    // Effect to update chart with appropriate time unit when time range changes
    useEffect(() => {
      if (chartType !== 'scatter') {
        try {
          // Use a safer way to access the chart instance
          const chartElements = document.querySelectorAll('canvas');
          for (const canvas of chartElements) {
            if (canvas.__chartjs__?.chart) {
              const chart = canvas.__chartjs__.chart;
              const timeConfig = getTimeConfig(timeRange, chartType, timeFormat);
              
              // Update chart time settings if applicable
              if (chart.options?.scales?.x?.time) {
                chart.options.scales.x.time.unit = timeConfig.unit || 'minute';
                chart.options.scales.x.time.tooltipFormat = timeConfig.tooltipFormat;
                
                if (timeConfig.displayFormats) {
                  Object.assign(chart.options.scales.x.time.displayFormats || {}, timeConfig.displayFormats);
                }
                
                // Force update
                chart.update('none');
              }
            }
          }
        } catch (error) {
          console.error("Error updating chart time unit:", error);
          // Don't let errors crash the component
        }
      }
    }, [timeRange, chartType, timeFormat])

    return (
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <h3 className="font-medium mb-2">Error</h3>
            <p>{error}</p>
            <button 
              onClick={() => setError(null)}
              className="mt-2 px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-md text-sm"
            >
              Dismiss
            </button>
          </div>
        )}
        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 transition-colors duration-300">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
            {/* Left side - Chart Type */}
            <div>
              <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Chart Type</h3>
              <div className="flex space-x-1">
                {CHART_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setChartType(type.id)}
                    className={`p-1 rounded-md flex items-center justify-center ${
                      chartType === type.id
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                    title={type.label}
                  >
                    <type.icon size={16} />
                  </button>
                ))}
              </div>
            </div>

            {/* Right side - Selectors in a row */}
            <div className="flex flex-wrap items-end gap-3">
              {/* Time Range Selector */}
              <div className="w-full sm:w-40">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm py-1"
                >
                  {TIME_RANGES.map(range => (
                    <option key={range.id} value={range.id}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* X Variable Selector */}
              <div className="w-full sm:w-40">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {chartType === 'scatter' ? 'X Variable' : 'Variable'}
                </label>
                <select
                  value={xVariable}
                  onChange={(e) => setXVariable(e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm py-1"
                >
                  {VARIABLES.map(variable => (
                    <option key={variable.id} value={variable.id}>
                      {variable.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Y Variable Selector (only for scatter) */}
              {chartType === 'scatter' && (
                <div className="w-full sm:w-40">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Y Variable
                  </label>
                  <select
                    value={yVariable}
                    onChange={(e) => setYVariable(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm py-1"
                  >
                    {VARIABLES.map(variable => (
                      <option key={variable.id} value={variable.id}>
                        {variable.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          
          {/* Custom Date Range */}
          {showCustomRange && (
            <div className="mt-4 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Time Range</h3>
                <button 
                  onClick={() => {
                    setTimeRange('day')
                    setShowCustomRange(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm py-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm py-1"
                  />
                </div>
              </div>
              
              <div className="mt-3 flex justify-end">
                <button
                  onClick={applyCustomRange}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Apply Range
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 transition-colors duration-300 overflow-hidden">
          <div className="h-[320px] sm:h-[370px] md:h-[420px]">
            {dataPoints.length > 0 ? (
              <>
                {(() => {
                  try {
                    if (chartType === 'scatter') {
                      return <Scatter options={options} data={chartData} />
                    } else if (chartType === 'bar') {
                      return <Bar options={options} data={chartData} />
                    } else {
                      return <Line options={options} data={chartData} />
                    }
                  } catch (error) {
                    console.error("Error rendering chart:", error);
                    return (
                      <div className="h-full flex flex-col items-center justify-center text-red-500 dark:text-red-400 p-5">
                        <p className="font-medium mb-2">Error rendering chart</p>
                        <p className="text-sm text-center">There was a problem displaying this chart. Please try changing the parameters or refreshing the page.</p>
                      </div>
                    );
                  }
                })()}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                No data available for the selected time range and variables
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors duration-300">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Statistical Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Mean Values</div>
                <div className="mt-2 dark:text-white">
                  <p><span className="font-medium">{VARIABLES.find(v => v.id === xVariable).label}:</span> {stats.xMean} {VARIABLES.find(v => v.id === xVariable).unit}</p>
                  <p><span className="font-medium">{VARIABLES.find(v => v.id === yVariable).label}:</span> {stats.yMean} {VARIABLES.find(v => v.id === yVariable).unit}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Standard Deviation</div>
                <div className="mt-2 dark:text-white">
                  <p><span className="font-medium">{VARIABLES.find(v => v.id === xVariable).label}:</span> {stats.xStd}</p>
                  <p><span className="font-medium">{VARIABLES.find(v => v.id === yVariable).label}:</span> {stats.yStd}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Correlation Coefficient</div>
                <div className="mt-2 dark:text-white">
                  <p className="font-medium">{stats.correlation}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {stats.correlation > 0.7 
                      ? 'Strong positive correlation' 
                      : stats.correlation < -0.7 
                        ? 'Strong negative correlation'
                        : stats.correlation > 0.3
                          ? 'Moderate positive correlation'
                          : stats.correlation < -0.3
                            ? 'Moderate negative correlation'
                            : 'Weak or no correlation'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  } catch (err) {
    console.error("Fatal error in AdvancedCharts:", err)
    return (
      <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-6 rounded-lg border border-red-200 dark:border-red-800">
        <h3 className="text-lg font-medium mb-2">Chart Error</h3>
        <p>There was a problem loading the chart component. This might be due to invalid data or a configuration issue.</p>
        <p className="mt-2 font-mono text-sm">{err.message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-md"
        >
          Reload Page
        </button>
      </div>
    )
  }
} 