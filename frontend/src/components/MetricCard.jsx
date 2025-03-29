import React from 'react'

export function MetricCard({ title, value, icon: Icon, status, unit }) {
  const getStatusColorClass = (status) => {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'poor':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 transition-colors duration-300 overflow-hidden">
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 truncate">{title}</h3>
          <div className="flex items-center">
            <div className="text-xl sm:text-2xl font-semibold truncate">{value}</div>
            {unit && (
              <span className="ml-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">{unit}</span>
            )}
          </div>
        </div>
        <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ml-1 ${getStatusColorClass(status)}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  )
} 