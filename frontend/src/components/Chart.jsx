import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'

export function Chart({ data }) {
  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-lg font-semibold mb-6 text-slate-800">Real-time Measurements</h2>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
  )
} 