import { useState, useRef } from 'react'
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceArea 
} from 'recharts'
import { useInterval } from 'react-use'
import { generateNewPoint } from '../utils/generateData'

export function Chart({ data: initialData }) {
  const [data, setData] = useState(initialData)
  const [left, setLeft] = useState('dataMin')
  const [right, setRight] = useState('dataMax')
  const [refAreaLeft, setRefAreaLeft] = useState('')
  const [refAreaRight, setRefAreaRight] = useState('')
  
  // Real-time updates
  useInterval(() => {
    setData(currentData => {
      const newPoint = generateNewPoint()
      return [...currentData.slice(1), newPoint]
    })
  }, 1000)

  // Zooming functionality
  const handleMouseDown = (e) => {
    if (!e) return
    setRefAreaLeft(e.activeLabel)
  }

  const handleMouseMove = (e) => {
    if (!e) return
    if (refAreaLeft) setRefAreaRight(e.activeLabel)
  }

  const handleMouseUp = () => {
    if (!refAreaLeft || !refAreaRight) {
      setRefAreaLeft('')
      setRefAreaRight('')
      return
    }

    // Ensure left is less than right
    if (refAreaLeft > refAreaRight) {
      [setRefAreaLeft, setRefAreaRight] = [setRefAreaRight, setRefAreaLeft]
    }

    // Update the zoom viewport
    setLeft(refAreaLeft)
    setRight(refAreaRight)

    setRefAreaLeft('')
    setRefAreaRight('')
  }

  const resetZoom = () => {
    setLeft('dataMin')
    setRight('dataMax')
  }

  // Format time ticks to show only necessary parts
  const formatXAxis = (tickItem) => {
    const time = tickItem.split(':')
    return `${time[0]}:${time[1]}`
  }

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-slate-800">Real-time Measurements</h2>
        <button
          onClick={resetZoom}
          className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          Reset Zoom
        </button>
      </div>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart
            data={data}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="time" 
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              domain={[left, right]}
              tickFormatter={formatXAxis}
              allowDataOverflow
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
              isAnimationActive={false}
            />
            <Line 
              type="monotone" 
              dataKey="pH" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={false}
              name="pH"
              isAnimationActive={false}
            />
            <Line 
              type="monotone" 
              dataKey="turbidity" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={false}
              name="Turbidity"
              isAnimationActive={false}
            />
            {refAreaLeft && refAreaRight ? (
              <ReferenceArea
                x1={refAreaLeft}
                x2={refAreaRight}
                strokeOpacity={0.3}
                fill="#8884d8"
                fillOpacity={0.3}
              />
            ) : null}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-gray-500 mt-2">
        Click and drag to zoom. Click "Reset Zoom" to reset the view.
      </div>
    </div>
  )
} 