import { 
  LayoutDashboard, 
  History, 
  LineChart, 
  Settings,
  Droplets,
  Menu,
  X
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useContext, useState, useEffect } from 'react'
import { ThemeContext } from '../App'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme } = useContext(ThemeContext)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  // Track window width for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false) // Close mobile menu on larger screens
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const navItems = [
    { icon: LayoutDashboard, path: '/', label: 'Dashboard' },
    { icon: History, path: '/history', label: 'History' },
    { icon: LineChart, path: '/charts', label: 'Charts' },
    { icon: Settings, path: '/settings', label: 'Settings' }
  ]

  const handleNavigation = (path) => {
    navigate(path)
    setMobileMenuOpen(false) // Close menu after navigation on mobile
  }

  // Mobile menu toggle button - only visible on small screens
  const mobileMenuButton = (
    <button 
      className="fixed top-3 left-3 z-30 md:hidden bg-slate-800 dark:bg-gray-900 text-white p-2 rounded-md shadow-md"
      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
    >
      {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
    </button>
  )

  return (
    <>
      {mobileMenuButton}
      
      {/* Desktop sidebar - always visible on md+ screens */}
      <div className={`
        fixed h-full w-16 md:w-20 bg-slate-800 dark:bg-gray-900 text-white 
        flex flex-col items-center py-6 space-y-6 shadow-lg transition-all duration-300 
        md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        z-20 md:z-10
      `}>
        <div 
          className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
          onClick={() => handleNavigation('/')}
        >
          <Droplets size={26} />
        </div>
        <nav className="flex flex-col space-y-6 md:space-y-4 w-full items-center">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`p-3 md:p-2.5 rounded-lg transition-colors duration-200 relative group w-11/12 md:w-auto flex justify-center ${
                  isActive 
                    ? 'bg-blue-600 text-white dark:bg-blue-700' 
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white dark:hover:bg-slate-800'
                }`}
                aria-label={item.label}
              >
                <Icon size={windowWidth < 768 ? 24 : 20} />
                <span className="md:hidden ml-3">{item.label}</span>
                <span className="absolute left-full ml-2 px-2 py-1 bg-slate-700 dark:bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none hidden md:block">
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Overlay to close menu when clicked outside - mobile only */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
} 