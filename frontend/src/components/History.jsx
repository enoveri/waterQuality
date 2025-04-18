import { useState, useEffect, useContext, useMemo } from 'react'
import { 
  Calendar, 
  Clock, 
  Download, 
  FileText, 
  Bell, 
  AlertTriangle, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  X
} from 'lucide-react'
import { Line } from 'react-chartjs-2'
import { SettingsContext, ThemeContext } from '../App'
import { waterQualityService } from '../services/apiService'

// Helper to format date for datetime inputs
const formatDateForInput = (date) => {
  return date.toISOString().split('T')[0]
}

// Get nicely formatted date
const formatDate = (date, timeFormat = '24h') => {
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: timeFormat === '12h'
  }
  return new Date(date).toLocaleDateString('en-US', options)
}

export function History({ dataHistory: localDataHistory, thresholds, windowWidth: propWindowWidth }) {
  const { timeFormat, units } = useContext(SettingsContext)
  const { theme } = useContext(ThemeContext)
  
  // State for loading database data
  const [isLoading, setIsLoading] = useState(false);
  const [dbDataHistory, setDbDataHistory] = useState(null);
  const [useDbData, setUseDbData] = useState(true);
  
  // Combine local data history with database data if available
  const dataHistory = useDbData && dbDataHistory ? dbDataHistory : localDataHistory;

  // Fallback to local state if prop is not provided
  const [localWindowWidth, setLocalWindowWidth] = useState(window.innerWidth)
  
  // Use prop value if available, otherwise use local state
  const windowWidth = propWindowWidth || localWindowWidth
  
  // Track window size for responsiveness (only if no prop is provided)
  useEffect(() => {
    if (propWindowWidth) return; // Skip if prop is provided
    
    const handleResize = () => setLocalWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [propWindowWidth])
  
  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7) // Default to last 7 days
    return formatDateForInput(date)
  })
  const [endDate, setEndDate] = useState(() => formatDateForInput(new Date()))
  
  // Active tab state
  const [activeTab, setActiveTab] = useState('data')
  
  // Alerts history state (would be fetched from API in real app)
  const [alertsHistory, setAlertsHistory] = useState([])
  
  // Export format state
  const [exportFormat, setExportFormat] = useState('csv')
  const [showExportOptions, setShowExportOptions] = useState(false)
  
  // Filter state for alerts
  const [alertFilters, setAlertFilters] = useState({
    temperature: true,
    pH: true,
    turbidity: true,
    waterLevel: true,
    high: true,
    medium: true,
    low: true
  })
  const [showFilters, setShowFilters] = useState(false)
  
  // Generate mock alerts history data
  useEffect(() => {
    // This would be replaced with an API call in a real app
    const generateMockAlerts = () => {
      const mockAlerts = []
      // Go back 30 days and generate some random alerts
      for (let i = 0; i < 40; i++) {
        const date = new Date()
        date.setDate(date.getDate() - Math.floor(Math.random() * 30))
        date.setHours(Math.floor(Math.random() * 24))
        
        const types = ['temperature', 'pH', 'turbidity', 'waterLevel']
        const type = types[Math.floor(Math.random() * types.length)]
        const severities = ['low', 'medium', 'high']
        const severity = severities[Math.floor(Math.random() * severities.length)]
        
        let message = ''
        let threshold = ''
        
        switch (type) {
          case 'temperature':
            const temp = (20 + Math.random() * 10).toFixed(1)
            message = `High temperature: ${temp}°C`
            threshold = `>${thresholds.temperature.high}°C`
            break
          case 'pH':
            const ph = (6 + Math.random() * 3).toFixed(1)
            message = `pH out of range: ${ph}`
            threshold = `${thresholds.pH.low}-${thresholds.pH.high}`
            break
          case 'turbidity':
            const turbidity = (Math.random() * 5).toFixed(2)
            message = `High turbidity: ${turbidity} NTU`
            threshold = `>${thresholds.turbidity.high} NTU`
            break
          case 'waterLevel':
            const level = (Math.random() * 100).toFixed(0)
            message = `Water level critical: ${level}cm`
            threshold = `>90cm`
            break
          default:
            break
        }
        
        mockAlerts.push({
          id: i,
          type,
          message,
          threshold,
          timestamp: date,
          severity,
          acknowledged: Math.random() > 0.3
        })
      }
      
      // Sort by timestamp descending
      return mockAlerts.sort((a, b) => b.timestamp - a.timestamp)
    }
    
    setAlertsHistory(generateMockAlerts())
  }, [thresholds])
  
  // Filter alerts based on selected filters
  const filteredAlerts = useMemo(() => {
    return alertsHistory.filter(alert => {
      // Filter by type
      if (!alertFilters[alert.type]) return false
      
      // Filter by severity
      if (!alertFilters[alert.severity]) return false
      
      // Filter by date range
      const alertDate = new Date(alert.timestamp)
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999) // End of the day
      
      return alertDate >= start && alertDate <= end
    })
  }, [alertsHistory, alertFilters, startDate, endDate])
  
  // Process data for chart
  const chartData = useMemo(() => {
    if (!dataHistory) return null
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    
    // Filter data by date range
    const filtered = {
      temperature: dataHistory.temperature.filter(d => {
        const timestamp = new Date(d.timestamp)
        return timestamp >= start && timestamp <= end
      }),
      pH: dataHistory.pH.filter(d => {
        const timestamp = new Date(d.timestamp)
        return timestamp >= start && timestamp <= end
      }),
      turbidity: dataHistory.turbidity.filter(d => {
        const timestamp = new Date(d.timestamp)
        return timestamp >= start && timestamp <= end
      }),
      waterLevel: dataHistory.waterLevel.filter(d => {
        const timestamp = new Date(d.timestamp)
        return timestamp >= start && timestamp <= end
      })
    }
    
    // Return prepared chart data
    return {
      labels: filtered.temperature.map(d => new Date(d.timestamp)),
      datasets: [
        {
          label: 'Temperature',
          data: filtered.temperature.map(d => d.value),
          borderColor: '#ef4444',
          backgroundColor: '#ef444420',
          yAxisID: 'y',
          tension: 0.2
        },
        {
          label: 'pH',
          data: filtered.pH.map(d => d.value),
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f620',
          yAxisID: 'y1',
          tension: 0.2
        },
        {
          label: 'Turbidity',
          data: filtered.turbidity.map(d => d.value),
          borderColor: '#10b981',
          backgroundColor: '#10b98120',
          yAxisID: 'y',
          tension: 0.2
        },
        {
          label: 'Water Level',
          data: filtered.waterLevel.map(d => d.value),
          borderColor: '#8b5cf6',
          backgroundColor: '#8b5cf620',
          yAxisID: 'y',
          tension: 0.2
        }
      ]
    }
  }, [dataHistory, startDate, endDate])
  
  // Update chart options for better mobile view
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: windowWidth < 640 ? 1.5 : 2.5, // More square aspect for mobile
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'start',
        labels: {
          boxWidth: windowWidth < 640 ? 8 : 12,
          padding: 4,
          usePointStyle: true,
          font: {
            size: windowWidth < 640 ? 9 : 11
          }
        }
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            if (!context.length) return ''
            const date = new Date(context[0].parsed.x)
            const options = {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              second: 'numeric',
              hour12: timeFormat === '12h'
            }
            return date.toLocaleString('en-US', options)
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM d'
          }
        },
        title: {
          display: windowWidth >= 640, // Hide title on small screens
          text: 'Date',
          font: {
            size: 12
          }
        },
        ticks: {
          maxTicksLimit: windowWidth < 640 ? 5 : 8,
          font: {
            size: windowWidth < 640 ? 8 : 10
          }
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: windowWidth >= 640, // Hide title on small screens
          text: 'Value',
          font: {
            size: 12
          }
        },
        ticks: {
          maxTicksLimit: windowWidth < 640 ? 5 : 8,
          font: {
            size: windowWidth < 640 ? 8 : 10
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        min: 0,
        max: 14,
        title: {
          display: windowWidth >= 640, // Hide title on small screens
          text: 'pH',
          font: {
            size: 12
          }
        },
        ticks: {
          maxTicksLimit: windowWidth < 640 ? 5 : 8,
          font: {
            size: windowWidth < 640 ? 8 : 10
          }
        },
        grid: {
          drawOnChartArea: false,
        }
      }
    }
  }
  
  // Handle export function
  const handleExport = () => {
    if (!dataHistory) return
    
    const format = exportFormat
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    
    // Filter data by date range
    const filtered = {
      temperature: dataHistory.temperature.filter(d => {
        const timestamp = new Date(d.timestamp)
        return timestamp >= start && timestamp <= end
      }),
      pH: dataHistory.pH.filter(d => {
        const timestamp = new Date(d.timestamp)
        return timestamp >= start && timestamp <= end
      }),
      turbidity: dataHistory.turbidity.filter(d => {
        const timestamp = new Date(d.timestamp)
        return timestamp >= start && timestamp <= end
      }),
      waterLevel: dataHistory.waterLevel.filter(d => {
        const timestamp = new Date(d.timestamp)
        return timestamp >= start && timestamp <= end
      })
    }
    
    // Create data for export
    const exportData = []
    filtered.temperature.forEach((temp, i) => {
      if (filtered.pH[i] && filtered.turbidity[i] && filtered.waterLevel[i]) {
        exportData.push({
          timestamp: new Date(temp.timestamp).toISOString(),
          temperature: temp.value,
          pH: filtered.pH[i].value,
          turbidity: filtered.turbidity[i].value,
          waterLevel: filtered.waterLevel[i].value
        })
      }
    })
    
    // Export as CSV
    if (format === 'csv') {
      const headers = ['Timestamp', 'Temperature', 'pH', 'Turbidity', 'Water Level']
      const csvContent = exportData.map(row => {
        return `${row.timestamp},${row.temperature},${row.pH},${row.turbidity},${row.waterLevel}`
      })
      
      const csv = [
        headers.join(','),
        ...csvContent
      ].join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `water-quality-data-${startDate}-to-${endDate}.csv`
      link.click()
    } 
    // Export as JSON
    else if (format === 'json') {
      const jsonContent = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `water-quality-data-${startDate}-to-${endDate}.json`
      link.click()
    }
    
    // Close export options after export
    setShowExportOptions(false)
  }
  
  // Load historical data from database when date range changes
  useEffect(() => {
    // Only attempt to load if useDbData is true
    if (!useDbData) return;
    
    const loadHistoricalData = async () => {
      setIsLoading(true);
      try {
        // Parse date strings to ensure correct format
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999); // End of the day
        
        const response = await waterQualityService.getHistoricalData({
          startDate: startDateObj.toISOString(),
          endDate: endDateObj.toISOString(),
          limit: 5000 // Higher limit for historical view
        });
        
        if (response.success && response.data.length > 0) {
          // Format data for the application
          const formattedData = {
            temperature: [],
            pH: [],
            turbidity: [],
            waterLevel: []
          };
          
          response.data.forEach(item => {
            formattedData.temperature.push({ timestamp: new Date(item.timestamp), value: item.temperature });
            formattedData.pH.push({ timestamp: new Date(item.timestamp), value: item.pH });
            formattedData.turbidity.push({ timestamp: new Date(item.timestamp), value: item.turbidity });
            formattedData.waterLevel.push({ timestamp: new Date(item.timestamp), value: item.waterLevel });
          });
          
          setDbDataHistory(formattedData);
        } else {
          // If no data found, clear previous data
          setDbDataHistory(null);
        }
      } catch (error) {
        console.error('Error loading historical data:', error);
        // If error, fall back to local data
        setUseDbData(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadHistoricalData();
  }, [startDate, endDate, useDbData]);
  
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-1 sm:gap-2">
          <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
          Historical Data
        </h1>
        
        {/* Export Button - Simplified for mobile */}
        <div className="relative">
          <button 
            onClick={() => setShowExportOptions(!showExportOptions)}
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 rounded-lg flex items-center gap-1 transition-colors text-sm"
          >
            <Download size={windowWidth < 640 ? 14 : 16} />
            <span className="hidden sm:inline">Export</span>
          </button>
          
          {showExportOptions && (
            <div className="absolute right-0 mt-1 w-40 sm:w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
              <div className="p-2">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Export Format</div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="exportFormat" 
                      value="csv" 
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">CSV</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="exportFormat" 
                      value="json" 
                      checked={exportFormat === 'json'}
                      onChange={() => setExportFormat('json')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">JSON</span>
                  </label>
                </div>
                
                <button
                  onClick={handleExport}
                  className="mt-3 w-full px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Download
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Date Range Selector - More compact for mobile */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 transition-colors duration-300">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-medium dark:text-white flex items-center gap-1 sm:gap-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            Date Range
          </h2>
          
          {/* Add a toggle for data source */}
          <div className="flex items-center">
            <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
              <input
                type="checkbox"
                checked={useDbData}
                onChange={() => setUseDbData(!useDbData)}
                className="mr-1.5 text-blue-600"
              />
              Use Database
            </label>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start
            </label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-1.5 sm:p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End
            </label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-1.5 sm:p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
        </div>
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="mt-3 flex justify-center text-blue-600 dark:text-blue-400">
            <div className="animate-pulse flex space-x-1 items-center">
              <div className="h-2 w-2 bg-current rounded-full"></div>
              <div className="h-2 w-2 bg-current rounded-full"></div>
              <div className="h-2 w-2 bg-current rounded-full"></div>
              <span className="text-xs ml-2">Loading data...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Tabs - More compact for mobile */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <ul className="flex flex-wrap -mb-px text-xs sm:text-sm font-medium text-center">
          <li className="mr-1 sm:mr-2">
            <button
              onClick={() => setActiveTab('data')}
              className={`inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-t-lg ${
                activeTab === 'data'
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                  : 'hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
              }`}
            >
              <FileText className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Data
            </button>
          </li>
          <li className="mr-1 sm:mr-2">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-t-lg ${
                activeTab === 'alerts'
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                  : 'hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
              }`}
            >
              <Bell className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Alerts
            </button>
          </li>
        </ul>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'data' ? (
        // Historical Data Tab
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 transition-colors duration-300">
          <h2 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 dark:text-white">Data Visualization</h2>
          <div className="h-[250px] sm:h-[350px] md:h-[400px]">
            {chartData ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                No data available for the selected time range
              </div>
            )}
          </div>
        </div>
      ) : (
        // Alerts History Tab - Keep existing implementation with minor mobile tweaks
        <div className="space-y-3 sm:space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 transition-colors duration-300">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-medium dark:text-white flex items-center gap-1 sm:gap-2">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                Alerts History
              </h2>
              
              {/* Filter button */}
              <div className="relative">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1 p-1.5 rounded-md bg-gray-100 dark:bg-gray-700 transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <Filter size={windowWidth < 640 ? 14 : 16} className="text-gray-600 dark:text-gray-300" />
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">Filters</span>
                </button>
                
                {showFilters && (
                  <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 p-3">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter Alerts</h3>
                      <button 
                        onClick={() => setShowFilters(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Parameter</h4>
                      <div className="space-y-1 mb-3">
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={alertFilters.temperature}
                            onChange={() => setAlertFilters({...alertFilters, temperature: !alertFilters.temperature})}
                            className="mr-2 text-blue-600"
                          />
                          Temperature
                        </label>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={alertFilters.pH}
                            onChange={() => setAlertFilters({...alertFilters, pH: !alertFilters.pH})}
                            className="mr-2 text-blue-600"
                          />
                          pH
                        </label>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={alertFilters.turbidity}
                            onChange={() => setAlertFilters({...alertFilters, turbidity: !alertFilters.turbidity})}
                            className="mr-2 text-blue-600"
                          />
                          Turbidity
                        </label>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={alertFilters.waterLevel}
                            onChange={() => setAlertFilters({...alertFilters, waterLevel: !alertFilters.waterLevel})}
                            className="mr-2 text-blue-600"
                          />
                          Water Level
                        </label>
                      </div>
                      
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Severity</h4>
                      <div className="space-y-1">
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={alertFilters.high}
                            onChange={() => setAlertFilters({...alertFilters, high: !alertFilters.high})}
                            className="mr-2 text-blue-600"
                          />
                          High
                        </label>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={alertFilters.medium}
                            onChange={() => setAlertFilters({...alertFilters, medium: !alertFilters.medium})}
                            className="mr-2 text-blue-600"
                          />
                          Medium
                        </label>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={alertFilters.low}
                            onChange={() => setAlertFilters({...alertFilters, low: !alertFilters.low})}
                            className="mr-2 text-blue-600"
                          />
                          Low
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {filteredAlerts.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {filteredAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-2 sm:p-3 rounded-lg border text-xs sm:text-sm ${
                      alert.severity === 'high' 
                        ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
                        : alert.severity === 'medium'
                          ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300'
                          : 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-xs opacity-75 flex-shrink-0">
                        Threshold: {alert.threshold}
                      </div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs">
                      <div className="opacity-75">
                        {formatDate(alert.timestamp, timeFormat)}
                      </div>
                      <div className="opacity-75">
                        {alert.acknowledged ? 'Acknowledged' : 'Unacknowledged'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 sm:p-6 text-gray-500 dark:text-gray-400 text-sm">
                No alerts found for the selected time range and filters.
              </div>
            )}
          </div>
          
          {/* Alert Statistics - Improved grid for mobile */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 transition-colors duration-300">
            <h2 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 dark:text-white">Alert Statistics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <div className="p-2 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Alerts</h3>
                <div className="text-xl sm:text-2xl font-bold">{filteredAlerts.length}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  In selected period
                </div>
              </div>
              
              <div className="p-2 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">High Severity</h3>
                <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                  {filteredAlerts.filter(a => a.severity === 'high').length}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Critical issues
                </div>
              </div>
              
              <div className="p-2 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medium Severity</h3>
                <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {filteredAlerts.filter(a => a.severity === 'medium').length}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Warning issues
                </div>
              </div>
              
              <div className="p-2 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unacknowledged</h3>
                <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {filteredAlerts.filter(a => !a.acknowledged).length}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Require attention
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 