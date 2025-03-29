import { Download, Wifi, WifiOff } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useContext } from 'react'
import { ThemeContext } from '../App'

export function Header({ isConnected, error }) {
  const location = useLocation()
  const { theme } = useContext(ThemeContext)
  const isSettingsPage = location.pathname === '/settings'

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 h-16 fixed top-0 right-0 left-16 md:left-20 z-10 shadow-sm transition-colors duration-300">
      <div className="h-full flex items-center justify-between px-2 sm:px-4 md:px-6 overflow-hidden">
        <h1 className="text-lg sm:text-xl font-semibold text-blue-600 dark:text-blue-400 truncate">Water Quality Monitor</h1>
        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
          <div 
            className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 flex-shrink-0 ${
              isConnected 
                ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300' 
                : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:text-red-300'
            }`}
            title={error || (isConnected ? 'Connected to ESP32' : 'Disconnected from ESP32')}
          >
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4" />
                <span className="hidden sm:inline">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span className="hidden sm:inline">Disconnected</span>
              </>
            )}
          </div>
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-200 flex-shrink-0">
            <Download size={18} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div className={`
            w-8 h-8 sm:w-9 sm:h-9 bg-slate-200 dark:bg-slate-600 rounded-full cursor-pointer
            hover:ring-2 hover:ring-blue-400 transition-all duration-200 flex-shrink-0
            ${isSettingsPage ? 'ring-2 ring-blue-500' : ''}
          `}></div>
        </div>
      </div>
    </header>
  )
} 