import { Download } from 'lucide-react'

export function Header() {
  return (
    <header className="bg-white border-b border-slate-200 h-16 fixed top-0 right-0 left-16 md:left-20 z-10 shadow-sm">
      <div className="h-full flex items-center justify-between px-6">
        <h1 className="text-xl font-semibold text-blue-600">Water Quality Monitor</h1>
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors duration-200">
            <Download size={20} className="text-slate-600" />
          </button>
          <div className="w-9 h-9 bg-slate-200 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all duration-200"></div>
        </div>
      </div>
    </header>
  )
} 