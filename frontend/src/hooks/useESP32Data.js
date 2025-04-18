import { useState, useEffect } from 'react'
import { waterQualityService } from '../services/apiService';

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
  const [shouldSaveToDb, setShouldSaveToDb] = useState(true) // Option to toggle DB saving
  const [savingInterval, setSavingInterval] = useState(5000) // Save every 5 seconds by default

  // Load historical data from backend on initial load
  useEffect(() => {
    const loadHistoricalData = async () => {
      try {
        // Get data from the last 24 hours
        const endDate = new Date().toISOString();
        const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const response = await waterQualityService.getHistoricalData({
          startDate,
          endDate,
          limit: MAX_HISTORY_POINTS
        });
        
        if (response.success && response.data.length > 0) {
          // Format data for the application
          const formattedData = {
            temperature: [],
            pH: [],
            turbidity: [],
            waterLevel: []
          };
          
          response.data.forEach(item => {
            formattedData.temperature.push({ timestamp: new Date(item.timestamp), value: item.temperature });
            formattedData.pH.push({ timestamp: new Date(item.timestamp), value: item.pH });
            formattedData.turbidity.push({ timestamp: new Date(item.timestamp), value: item.turbidity });
            formattedData.waterLevel.push({ timestamp: new Date(item.timestamp), value: item.waterLevel });
          });
          
          setDataHistory(formattedData);
          
          // Also set current data to the latest value
          const latest = response.data[response.data.length - 1];
          setData({
            temperature: latest.temperature,
            pH: latest.pH,
            turbidity: latest.turbidity,
            waterLevel: latest.waterLevel
          });
        }
      } catch (error) {
        console.error('Error loading historical data:', error);
        // Try getting at least the latest data
        try {
          const latestResponse = await waterQualityService.getLatestData();
          if (latestResponse.success && latestResponse.data) {
            setData({
              temperature: latestResponse.data.temperature,
              pH: latestResponse.data.pH,
              turbidity: latestResponse.data.turbidity,
              waterLevel: latestResponse.data.waterLevel
            });
          }
        } catch (latestError) {
          console.error('Error loading latest data:', latestError);
        }
      }
    };
    
    loadHistoricalData();
  }, []);

  // Connect to ESP32 via SSE
  useEffect(() => {
    let eventSource = null;
    let saveTimer = null;
    let lastSavedData = null;

    const connectToESP32 = () => {
      try {
        eventSource = new EventSource(`http://${ESP32_IP}/events`);
        
        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const newData = JSON.parse(event.data);
            const timestamp = new Date();

            // Update current data
            setData(newData);

            // Update history
            setDataHistory(prev => {
              const newHistory = {
                temperature: [...prev.temperature, { timestamp, value: newData.temperature }],
                pH: [...prev.pH, { timestamp, value: newData.pH }],
                turbidity: [...prev.turbidity, { timestamp, value: newData.turbidity }],
                waterLevel: [...prev.waterLevel, { timestamp, value: newData.waterLevel }]
              };

              // Keep only the last MAX_HISTORY_POINTS
              return {
                temperature: newHistory.temperature.slice(-MAX_HISTORY_POINTS),
                pH: newHistory.pH.slice(-MAX_HISTORY_POINTS),
                turbidity: newHistory.turbidity.slice(-MAX_HISTORY_POINTS),
                waterLevel: newHistory.waterLevel.slice(-MAX_HISTORY_POINTS)
              };
            });
            
            // Save to DB using the last-saved comparison to avoid saving identical data
            if (shouldSaveToDb) {
              // Only initialize timer if it's not already running
              if (saveTimer === null) {
                saveTimer = setInterval(() => {
                  const currentData = {
                    temperature: data.temperature, 
                    pH: data.pH, 
                    turbidity: data.turbidity, 
                    waterLevel: data.waterLevel,
                    timestamp: new Date().toISOString(),
                    deviceId: 'esp32-sample' // Using our sample device ID
                  };
                  
                  // Avoid saving identical data
                  if (lastSavedData === null || 
                      lastSavedData.temperature !== currentData.temperature ||
                      lastSavedData.pH !== currentData.pH ||
                      lastSavedData.turbidity !== currentData.turbidity ||
                      lastSavedData.waterLevel !== currentData.waterLevel) {
                    
                    // Save to database
                    waterQualityService.saveData(currentData)
                      .then(response => {
                        if (response.success) {
                          lastSavedData = { ...currentData };
                          console.log('Data saved to database');
                        } else {
                          console.error('Error saving to database:', response.message);
                        }
                      })
                      .catch(err => {
                        console.error('Error saving to database:', err);
                      });
                  }
                }, savingInterval);
              }
            } else if (saveTimer !== null) {
              // Clear timer if saving is disabled
              clearInterval(saveTimer);
              saveTimer = null;
            }
          } catch (error) {
            console.error('Error parsing data:', error);
            setError('Error parsing data from ESP32');
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE Error:', error);
          setIsConnected(false);
          setError('Connection lost. Retrying...');
          
          // Close current connection and retry after a short delay
          if (eventSource) {
            eventSource.close();
            setTimeout(connectToESP32, 5000); // Retry after 5 seconds
          }
        };
      } catch (error) {
        console.error('Error creating EventSource:', error);
        setError('Failed to connect to ESP32');
        setIsConnected(false);
        
        // Retry connection after delay
        setTimeout(connectToESP32, 5000);
      }
    };

    connectToESP32();

    // Cleanup function
    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (saveTimer) {
        clearInterval(saveTimer);
      }
    };
  }, [shouldSaveToDb, savingInterval, data]);
  
  // Function to toggle database saving
  const toggleDatabaseSaving = (enabled, interval = 5000) => {
    setShouldSaveToDb(enabled);
    if (interval && interval > 1000) {
      setSavingInterval(interval);
    }
  };

  return { 
    data, 
    dataHistory,
    isConnected, 
    error,
    toggleDatabaseSaving, // Expose function to enable/disable DB saving
    shouldSaveToDb // Current state of DB saving
  };
}; 