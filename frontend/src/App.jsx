import { Thermometer, Droplets } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { MetricCard } from './components/MetricCard'
import { Chart } from './components/Chart'
import { sampleData } from './data/sampleData'

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

        <Chart data={sampleData} />
      </main>
    </div>
  )
}

export default App