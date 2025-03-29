import { 
  LayoutDashboard, 
  History, 
  LineChart, 
  Settings,
  Droplets,
} from 'lucide-react'

export function Sidebar() {
  return (
    <div className="fixed h-full w-16 md:w-20 bg-slate-800 text-white flex flex-col items-center py-8 space-y-8 shadow-lg">
      <div className="text-blue-400 hover:text-blue-300 transition-colors">
        <Droplets size={28} />
      </div>
      <nav className="flex flex-col space-y-6">
        <button className="p-3 hover:bg-slate-700 rounded-xl transition-colors duration-200 text-slate-300 hover:text-white">
          <LayoutDashboard size={22} />
        </button>
        <button className="p-3 hover:bg-slate-700 rounded-xl transition-colors duration-200 text-slate-300 hover:text-white">
          <History size={22} />
        </button>
        <button className="p-3 hover:bg-slate-700 rounded-xl transition-colors duration-200 text-slate-300 hover:text-white">
          <LineChart size={22} />
        </button>
        <button className="p-3 hover:bg-slate-700 rounded-xl transition-colors duration-200 text-slate-300 hover:text-white">
          <Settings size={22} />
        </button>
      </nav>
    </div>
  )
} 