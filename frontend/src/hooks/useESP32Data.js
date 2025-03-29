import { useState, useEffect } from 'react'

const ESP32_IP = '192.168.4.1' // Default IP when ESP32 is in AP mode
const MAX_HISTORY_POINTS = 300 // Store 5 minutes of data at 1 second intervals

export const useESP32Data = () => {
  const [data, setData] = useState({
    temperature: 0,
    pH: 0,
    turbidity: 0,
    waterLevel: 0
  })
  const [dataHistory, setDataHistory] = useState({
    temperature: [],
    pH: [],
    turbidity: [],
    waterLevel: []
  })
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let eventSource = null

    const connectToESP32 = () => {
      try {
        eventSource = new EventSource(`http://${ESP32_IP}/events`)
        
        eventSource.onopen = () => {
          setIsConnected(true)
          setError(null)
        }

        eventSource.onmessage = (event) => {
          try {
            const newData = JSON.parse(event.data)
            const timestamp = new Date()

            // Update current data
            setData(newData)

            // Update history
            setDataHistory(prev => {
              const newHistory = {
                temperature: [...prev.temperature, { timestamp, value: newData.temperature }],
                pH: [...prev.pH, { timestamp, value: newData.pH }],
                turbidity: [...prev.turbidity, { timestamp, value: newData.turbidity }],
                waterLevel: [...prev.waterLevel, { timestamp, value: newData.waterLevel }]
              }

              // Keep only the last MAX_HISTORY_POINTS
              return {
                temperature: newHistory.temperature.slice(-MAX_HISTORY_POINTS),
                pH: newHistory.pH.slice(-MAX_HISTORY_POINTS),
                turbidity: newHistory.turbidity.slice(-MAX_HISTORY_POINTS),
                waterLevel: newHistory.waterLevel.slice(-MAX_HISTORY_POINTS)
              }
            })
          } catch (error) {
            console.error('Error parsing data:', error)
            setError('Error parsing data from ESP32')
          }
        }

        eventSource.onerror = (error) => {
          console.error('SSE Error:', error)
          setIsConnected(false)
          setError('Connection lost. Retrying...')
        }
      } catch (error) {
        console.error('Error creating EventSource:', error)
        setError('Failed to connect to ESP32')
        setIsConnected(false)
      }
    }

    connectToESP32()

    // Cleanup function
    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [])

  return { 
    data, 
    dataHistory,
    isConnected, 
    error 
  }
} 