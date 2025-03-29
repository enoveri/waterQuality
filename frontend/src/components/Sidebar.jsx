import { 
  LayoutDashboard, 
  History, 
  LineChart, 
  Settings,
  Droplets,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { ThemeContext } from '../App'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme } = useContext(ThemeContext)

  const navItems = [
    { icon: LayoutDashboard, path: '/', label: 'Dashboard' },
    { icon: History, path: '/history', label: 'History' },
    { icon: LineChart, path: '/charts', label: 'Charts' },
    { icon: Settings, path: '/settings', label: 'Settings' }
  ]

  return (
    <div className="fixed h-full w-16 md:w-20 bg-slate-800 dark:bg-gray-900 text-white flex flex-col items-center py-6 space-y-6 shadow-lg z-20 transition-colors duration-300">
      <div 
        className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
        onClick={() => navigate('/')}
      >
        <Droplets size={26} />
      </div>
      <nav className="flex flex-col space-y-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`p-2.5 rounded-lg transition-colors duration-200 relative group ${
                isActive 
                  ? 'bg-blue-600 text-white dark:bg-blue-700' 
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white dark:hover:bg-slate-800'
              }`}
              title={item.label}
            >
              <Icon size={20} />
              <span className="absolute left-full ml-2 px-2 py-1 bg-slate-700 dark:bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
} 