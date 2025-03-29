const generatePoint = (timestamp) => {
  // Use timestamp to create smooth oscillating patterns
  return {
    time: new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    temperature: 25 + 3 * Math.sin(timestamp / 10000) + Math.random(),
    pH: 7 + Math.sin(timestamp / 8000) * 0.5 + Math.random() * 0.2,
    turbidity: 1.5 + Math.cos(timestamp / 12000) + Math.random() * 0.3
  }
}

export const generateInitialData = (pointCount = 100) => {
  const now = Date.now()
  const data = []
  
  for (let i = pointCount; i > 0; i--) {
    const timestamp = now - i * 1000 // 1 second intervals
    data.push(generatePoint(timestamp))
  }
  
  return data
}

export const generateNewPoint = () => {
  return generatePoint(Date.now())
} 