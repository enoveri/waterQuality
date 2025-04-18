import { useState, useEffect, useRef, useCallback } from 'react'
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
  
  // Use ref to keep track of the event source and timers
  const eventSourceRef = useRef(null);
  const saveTimerRef = useRef(null);
  const connectionTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const lastSavedDataRef = useRef(null);

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

  // Function to close current connection
  const closeConnection = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('Closing existing EventSource connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    
    if (connectionTimerRef.current) {
      clearTimeout(connectionTimerRef.current);
      connectionTimerRef.current = null;
    }
  }, []);

  // Connect to ESP32 via SSE
  const connectToESP32 = useCallback(() => {
    // Close any existing connection first
    closeConnection();
    
    setError('Connecting to ESP32...');
    console.log('Initializing new connection to ESP32');
    
    try {
      // Create a new EventSource
      const es = new EventSource(`http://${ESP32_IP}/events`);
      eventSourceRef.current = es;
      
      es.onopen = () => {
        console.log('SSE connection opened successfully');
        setIsConnected(true);
        setError(null);
        
        // Start the heartbeat timer once we're connected
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
        }
        
        heartbeatTimerRef.current = setInterval(() => {
          if (eventSourceRef.current) {
            const now = Date.now();
            const lastMessageTimestamp = eventSourceRef.current.lastMessageTime || 0;
            
            // Check if we've received any message in the last 10 seconds
            if (now - lastMessageTimestamp > 10000 && lastMessageTimestamp !== 0) {
              console.warn('Connection appears stalled - no messages for 10 seconds');
              setError('Connection stalled. Click reconnect to try again.');
              setIsConnected(false);
              
              // Close the stalled connection
              closeConnection();
            }
          }
        }, 5000);
      };
      
      es.onmessage = (event) => {
        try {
          const newData = JSON.parse(event.data);
          const timestamp = new Date();
          
          // Track the last message received time
          eventSourceRef.current.lastMessageTime = Date.now();
          
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
        } catch (error) {
          console.error('Error parsing data:', error);
        }
      };
      
      es.onerror = (error) => {
        console.error('SSE Error:', error);
        setIsConnected(false);
        setError('Connection lost. Click reconnect to try again.');
        
        // Close connection on error
        closeConnection();
      };
    } catch (error) {
      console.error('Error creating EventSource:', error);
      setIsConnected(false);
      setError(`Failed to connect: ${error.message}. Click reconnect to try again.`);
    }
  }, [closeConnection]);

  // Save data to database effect
  useEffect(() => {
    if (shouldSaveToDb && isConnected) {
      if (!saveTimerRef.current) {
        console.log('Starting database save timer');
        saveTimerRef.current = setInterval(() => {
          const currentData = {
            temperature: data.temperature, 
            pH: data.pH, 
            turbidity: data.turbidity, 
            waterLevel: data.waterLevel,
            timestamp: new Date().toISOString(),
            deviceId: 'esp32-sample'
          };
          
          // Avoid saving identical data
          if (lastSavedDataRef.current === null || 
              lastSavedDataRef.current.temperature !== currentData.temperature ||
              lastSavedDataRef.current.pH !== currentData.pH ||
              lastSavedDataRef.current.turbidity !== currentData.turbidity ||
              lastSavedDataRef.current.waterLevel !== currentData.waterLevel) {
            
            // Save to database
            waterQualityService.saveData(currentData)
              .then(response => {
                if (response.success) {
                  lastSavedDataRef.current = { ...currentData };
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
    } else if (saveTimerRef.current) {
      console.log('Stopping database save timer');
      clearInterval(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    
    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [shouldSaveToDb, savingInterval, data, isConnected]);
  
  // Initial connection effect - only runs once on component mount
  useEffect(() => {
    console.log('Initializing ESP32 connection');
    connectToESP32();
    
    // Cleanup function
    return () => {
      closeConnection();
      
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [connectToESP32, closeConnection]);
  
  // Function to toggle database saving
  const toggleDatabaseSaving = (enabled, interval = 5000) => {
    setShouldSaveToDb(enabled);
    if (interval && interval > 1000) {
      setSavingInterval(interval);
    }
  };

  // Manual reconnect function - actually forces a new connection
  const reconnect = useCallback(() => {
    console.log('Manual reconnection requested');
    connectToESP32();
  }, [connectToESP32]);

  return { 
    data, 
    dataHistory,
    isConnected, 
    error,
    toggleDatabaseSaving, // Expose function to enable/disable DB saving
    shouldSaveToDb, // Current state of DB saving
    reconnect // Manual reconnection function
  };
}; 