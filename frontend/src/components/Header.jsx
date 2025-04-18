import { Download, Wifi, WifiOff } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useContext } from 'react'
import { ThemeContext } from '../App'

export function Header({ isConnected, error }) {
  const location = useLocation()
  const { theme } = useContext(ThemeContext)
  const isSettingsPage = location.pathname === '/settings'

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 h-14 sm:h-16 fixed top-0 right-0 left-0 md:left-20 z-10 shadow-sm transition-colors duration-300">
      <div className="h-full flex items-center justify-between px-4 sm:px-6 md:px-8 overflow-hidden">
        <h1 className="text-base sm:text-lg md:text-xl font-semibold text-blue-600 dark:text-blue-400 truncate ml-8 md:ml-0">
          Water Quality Monitor
        </h1>
        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 flex-shrink-0">
          <div 
            className={`flex items-center gap-1 px-1.5 sm:px-2 md:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors duration-200 flex-shrink-0 ${
              isConnected 
                ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300' 
                : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:text-red-300'
            }`}
            title={error || (isConnected ? 'Connected to ESP32' : 'Disconnected from ESP32')}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Disconnected</span>
              </>
            )}
          </div>
          <button className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-200 flex-shrink-0">
            <Download size={16} className="text-slate-600 dark:text-slate-300 sm:w-[18px] sm:h-[18px]" />
          </button>
          <div className={`
            w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-slate-200 dark:bg-slate-600 rounded-full cursor-pointer
            hover:ring-2 hover:ring-blue-400 transition-all duration-200 flex-shrink-0
            ${isSettingsPage ? 'ring-2 ring-blue-500' : ''}
          `}></div>
        </div>
      </div>
    </header>
  )
} 