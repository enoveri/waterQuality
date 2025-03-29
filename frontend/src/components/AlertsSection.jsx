import { AlertTriangle, Bell, Check } from 'lucide-react'

export function AlertsSection({ data, thresholds }) {
  const getAlerts = () => {
    const alerts = []
    
    if (data.temperature > thresholds.temperature.high) {
      alerts.push({
        type: 'temperature',
        message: `High temperature: ${data.temperature.toFixed(1)}°C`,
        threshold: `>${thresholds.temperature.high}°C`,
        timestamp: new Date(),
        severity: 'high'
      })
    }
    
    if (data.pH > thresholds.pH.high || data.pH < thresholds.pH.low) {
      alerts.push({
        type: 'pH',
        message: `pH out of range: ${data.pH.toFixed(1)}`,
        threshold: `${thresholds.pH.low}-${thresholds.pH.high}`,
        timestamp: new Date(),
        severity: 'high'
      })
    }
    
    if (data.turbidity > thresholds.turbidity.high) {
      alerts.push({
        type: 'turbidity',
        message: `High turbidity: ${data.turbidity.toFixed(2)} NTU`,
        threshold: `>${thresholds.turbidity.high} NTU`,
        timestamp: new Date(),
        severity: 'medium'
      })
    }

    return alerts
  }

  const alerts = getAlerts()
  const hasAlerts = alerts.length > 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-5 mb-4 sm:mb-6 transition-colors duration-300">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1 sm:gap-2">
          <Bell size={18} className="flex-shrink-0" />
          Active Alerts
        </h2>
        <div className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1 flex-shrink-0 ${
          hasAlerts ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        }`}>
          {hasAlerts ? (
            <>
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>{alerts.length} Active</span>
            </>
          ) : (
            <>
              <Check size={14} className="flex-shrink-0" />
              <span>All Clear</span>
            </>
          )}
        </div>
      </div>

      {hasAlerts ? (
        <div className="space-y-2 sm:space-y-3">
          {alerts.map((alert, index) => (
            <div 
              key={index}
              className={`p-2 sm:p-3 rounded-lg border ${
                alert.severity === 'high' 
                  ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <div className="font-medium text-sm sm:text-base">{alert.message}</div>
                <div className="text-xs sm:text-sm opacity-75 flex-shrink-0">
                  Threshold: {alert.threshold}
                </div>
              </div>
              <div className="text-xs sm:text-sm mt-1 opacity-75">
                Triggered {alert.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400">No active alerts at this time.</p>
      )}
    </div>
  )
} 