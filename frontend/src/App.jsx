import { Thermometer, Droplets } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { MetricCard } from './components/MetricCard'
import { Chart } from './components/Chart'
import { ConnectionStatus } from './components/ConnectionStatus'
import { useESP32Data } from './hooks/useESP32Data'

function App() {
  const { data, isConnected, error } = useESP32Data()

  // Helper function to determine status based on values
  const getStatus = (value, type) => {
    switch (type) {
      case 'temperature':
        return value > 28 || value < 22 ? 'poor' : 
               value > 26 || value < 24 ? 'moderate' : 'good'
      case 'turbidity':
        return value > 2.0 ? 'poor' : 
               value > 1.5 ? 'moderate' : 'good'
      case 'pH':
        return value > 8.0 || value < 6.0 ? 'poor' :
               value > 7.5 || value < 6.5 ? 'moderate' : 'good'
      default:
        return 'good'
    }
  }

  // Calculate overall status
  const getOverallStatus = () => {
    const tempStatus = getStatus(data.temperature, 'temperature')
    const turbStatus = getStatus(data.turbidity, 'turbidity')
    const phStatus = getStatus(data.pH, 'pH')
    
    if (tempStatus === 'poor' || turbStatus === 'poor' || phStatus === 'poor') return 'poor'
    if (tempStatus === 'moderate' || turbStatus === 'moderate' || phStatus === 'moderate') return 'moderate'
    return 'good'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-col">
        <Header />
        
        <main className="ml-16 md:ml-20 pt-16 p-4 md:p-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Water Quality Dashboard</h1>
            <ConnectionStatus isConnected={isConnected} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard 
              title="Temperature" 
              value={`${data.temperature.toFixed(1)}°C`}
              icon={Thermometer}
              status={getStatus(data.temperature, 'temperature')}
            />
            <MetricCard 
              title="pH" 
              value={data.pH.toFixed(1)}
              icon={Droplets}
              status={getStatus(data.pH, 'pH')}
            />
            <MetricCard 
              title="Turbidity" 
              value={`${data.turbidity.toFixed(2)} NTU`}
              icon={Droplets}
              status={getStatus(data.turbidity, 'turbidity')}
            />
            <MetricCard 
              title="Overall Quality" 
              value={getOverallStatus().charAt(0).toUpperCase() + getOverallStatus().slice(1)}
              icon={Droplets}
              status={getOverallStatus()}
            />
          </div>

          <Chart data={data} />
        </main>
      </div>
    </div>
  )
}

export default App