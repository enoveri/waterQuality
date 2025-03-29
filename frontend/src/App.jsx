import { useState } from 'react'
import { 
  LayoutDashboard, 
  History, 
  LineChart, 
  Settings,
  Droplets,
  Thermometer,
  // Flask,
  Download
} from 'lucide-react'
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'

function Sidebar() {
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

function Header() {
  return (
    <header className="bg-white border-b border-slate-200 h-16 fixed top-0 right-0 left-16 md:left-20 z-10 shadow-sm">
      <div className="h-full flex items-center justify-between px-6">
        <h1 className="text-xl font-semibold text-amber-300">Water Quality Monitor</h1>
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

function MetricCard({ title, value, icon: Icon, status }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-emerald-500'
      case 'moderate': return 'text-amber-500'
      case 'poor': return 'text-rose-500'
      default: return 'text-slate-500'
    }
  }

  return (
    <div className="bg-black p-6 rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={`text-2xl font-semibold mt-2 ${getStatusColor(status)}`}>
            {value}
          </p>
        </div>
        <div className={`${getStatusColor(status)} opacity-80`}>
          <Icon size={28} />
        </div>
      </div>
    </div>
  )
}

const sampleData = [
  { time: '00:00', temperature: 25, pH: 7.2, turbidity: 1.5 },
  { time: '04:00', temperature: 24, pH: 7.1, turbidity: 1.8 },
  { time: '08:00', temperature: 26, pH: 7.3, turbidity: 1.6 },
  { time: '12:00', temperature: 27, pH: 7.4, turbidity: 1.4 },
  { time: '16:00', temperature: 26, pH: 7.2, turbidity: 1.7 },
  { time: '20:00', temperature: 25, pH: 7.1, turbidity: 1.5 },
]

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Header />
      
      <main className="ml-16 md:ml-20 pt-16 p-4 md:p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard 
            title="Temperature" 
            value="25°C" 
            icon={Thermometer}
            status="good"
          />
          {/* <MetricCard 
            title="pH Level" 
            value="7.2" 
            icon={Flask}
            status="moderate"
          /> */}
          <MetricCard 
            title="Turbidity" 
            value="1.5 NTU" 
            icon={Droplets}
            status="good"
          />
          <MetricCard 
            title="Overall Quality" 
            value="Good" 
            icon={Droplets}
            status="good"
          />
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-6 text-slate-800">Real-time Measurements</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={sampleData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    padding: '0.5rem',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={false}
                  name="Temperature"
                />
                <Line 
                  type="monotone" 
                  dataKey="pH" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                  name="pH"
                />
                <Line 
                  type="monotone" 
                  dataKey="turbidity" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={false}
                  name="Turbidity"
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App