import { Activity, CheckCircle2, XCircle } from 'lucide-react'

export function SensorHealth({ sensors }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-5 mb-4 sm:mb-6 transition-colors duration-300">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4">
        <Activity size={18} className="flex-shrink-0" />
        Sensor Health
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {sensors.map((sensor) => (
          <div 
            key={sensor.id}
            className="p-3 rounded-lg border border-slate-200 dark:border-gray-700 flex items-center justify-between overflow-hidden"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{sensor.name}</div>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Last update: {sensor.lastUpdate}</div>
            </div>
            <div className={`flex items-center gap-1 ml-2 flex-shrink-0 ${
              sensor.isOnline 
                ? 'text-green-600 dark:text-green-500' 
                : 'text-red-600 dark:text-red-500'
            }`}>
              {sensor.isOnline ? (
                <>
                  <CheckCircle2 size={16} className="flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium hidden xs:inline">Online</span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium hidden xs:inline">Offline</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 