import { useState, useEffect, useRef, useCallback } from 'react'
import { waterQualityService } from '../services/apiService';
import { API_BASE_URL } from '../config';

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
  
  // Use ref to keep track of event source and timers
  const eventSourceRef = useRef(null);
  const saveTimerRef = useRef(null);
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
          limit: 300 // MAX_HISTORY_POINTS
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
  }, []);

  // Connect to server via SSE
  const connectToServer = useCallback(() => {
    // Close any existing connection first
    closeConnection();
    
    setError('Connecting to server...');
    console.log('Initializing server SSE connection');
    
    try {
      // Connect to our Node.js server endpoint instead of ESP32 directly
      const es = new EventSource(`${API_BASE_URL}/live-data`);
      eventSourceRef.current = es;
      
      es.onopen = () => {
        console.log('SSE connection to server opened');
        // We'll set isConnected when we receive a connection_status event
      };
      
      es.onmessage = (event) => {
        try {
          const eventData = JSON.parse(event.data);
          const timestamp = new Date();
          
          // Handle connection status updates
          if (eventData.type === 'connection_status') {
            setIsConnected(eventData.isConnected);
            if (!eventData.isConnected && eventData.error) {
              setError(eventData.error);
            } else if (eventData.isConnected) {
              setError(null);
            }
            return;
          }
          
          // Handle initial data (when first connecting)
          if (eventData.type === 'initial') {
            setIsConnected(eventData.isConnected);
            if (!eventData.isConnected) {
              setError('Server is not connected to ESP32');
            } else {
              setError(null);
            }
          }
          
          // Update current data with sensor readings
          const newData = {
            temperature: eventData.temperature || 0,
            pH: eventData.pH || 0,
            turbidity: eventData.turbidity || 0,
            waterLevel: eventData.waterLevel || 0
          };
          
          setData(newData);

          // Update history
          setDataHistory(prev => {
            const newHistory = {
              temperature: [...prev.temperature, { timestamp, value: newData.temperature }],
              pH: [...prev.pH, { timestamp, value: newData.pH }],
              turbidity: [...prev.turbidity, { timestamp, value: newData.turbidity }],
              waterLevel: [...prev.waterLevel, { timestamp, value: newData.waterLevel }]
            };
            
            // Keep only the last 300 points
            return {
              temperature: newHistory.temperature.slice(-300),
              pH: newHistory.pH.slice(-300),
              turbidity: newHistory.turbidity.slice(-300),
              waterLevel: newHistory.waterLevel.slice(-300)
            };
          });
        } catch (error) {
          console.error('Error parsing data:', error);
        }
      };
      
      es.onerror = (error) => {
        console.error('Server SSE Error:', error);
        setIsConnected(false);
        setError('Connection to server lost. Click reconnect to try again.');
        
        // Close connection on error
        closeConnection();
      };
    } catch (error) {
      console.error('Error creating EventSource:', error);
      setIsConnected(false);
      setError(`Failed to connect to server: ${error.message}. Click reconnect to try again.`);
    }
  }, [closeConnection]);

  // Save data to database effect (we can disable this since the server now handles it)
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
    console.log('Initializing connection to server');
    connectToServer();
    
    // Cleanup function
    return () => {
      closeConnection();
      
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [connectToServer, closeConnection]);
  
  // Function to toggle database saving
  const toggleDatabaseSaving = (enabled, interval = 5000) => {
    setShouldSaveToDb(enabled);
    if (interval && interval > 1000) {
      setSavingInterval(interval);
    }
  };

  // Manual reconnect function - uses the server endpoint to reconnect
  const reconnect = useCallback(async () => {
    console.log('Manual reconnection requested');
    
    try {
      // First tell the server to reconnect to ESP32
      await waterQualityService.reconnectToESP32();
      
      // Then reconnect to the server's SSE endpoint
      connectToServer();
    } catch (error) {
      console.error('Error requesting reconnection:', error);
      setError('Failed to request reconnection. Please try again.');
    }
  }, [connectToServer]);

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