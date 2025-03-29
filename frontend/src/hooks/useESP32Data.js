import { useState, useEffect } from 'react'

const ESP32_IP = '192.168.4.1' // Default IP when ESP32 is in AP mode

export const useESP32Data = () => {
  const [data, setData] = useState({
    temperature: 0,
    pH: 0,
    turbidity: 0,
    waterLevel: 0
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
            setData(newData)
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

  return { data, isConnected, error }
} 