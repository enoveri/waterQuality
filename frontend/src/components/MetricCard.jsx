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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 sm:p-3 md:p-4 transition-colors duration-300 overflow-hidden">
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1 truncate">{title}</h3>
          <div className="flex items-center">
            <div className="text-lg sm:text-xl md:text-2xl font-semibold truncate">{value}</div>
            {unit && (
              <span className="ml-1 text-xxs sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">{unit}</span>
            )}
          </div>
        </div>
        <div className={`p-1 sm:p-1.5 md:p-2 rounded-full flex-shrink-0 ml-1 ${getStatusColorClass(status)}`}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
        </div>
      </div>
    </div>
  )
} 