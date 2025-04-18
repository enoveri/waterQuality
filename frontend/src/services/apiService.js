import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = import.meta.env.VITE_API_URL || API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Water Quality Data Services
export const waterQualityService = {
  // Get latest data
  getLatestData: async (deviceId = 'esp32-sample') => {
    try {
      const response = await apiClient.get(`/data/latest`, {
        params: { deviceId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching latest data:', error);
      throw error;
    }
  },
  
  // Get historical data with optional date filtering
  getHistoricalData: async (params) => {
    try {
      const response = await apiClient.get(`/data/range`, { 
        params 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  },
  
  // Get all data with optional filtering
  getAllData: async (params) => {
    try {
      const response = await apiClient.get(`/data`, { 
        params 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  },
  
  // Save data (for manual recording or ESP32 proxy)
  saveData: async (data) => {
    try {
      const response = await apiClient.post(`/data`, data);
      return response.data;
    } catch (error) {
      console.error('Error saving data:', error);
      throw error;
    }
  },
  
  // Request the server to reconnect to ESP32
  reconnectToESP32: async () => {
    try {
      const response = await apiClient.post(`/reconnect-esp32`);
      return response.data;
    } catch (error) {
      console.error('Error requesting ESP32 reconnection:', error);
      throw error;
    }
  },
  
  // Get connection status to ESP32
  getConnectionStatus: async () => {
    try {
      const response = await apiClient.get(`/health`);
      return {
        success: true,
        isConnected: response.data.esp32Connected,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error checking connection status:', error);
      return {
        success: false,
        isConnected: false,
        message: 'Could not reach server'
      };
    }
  }
};

// Alerts Services
export const alertsService = {
  // Get all alerts with optional filtering
  getAlerts: async (params) => {
    try {
      const response = await apiClient.get(`/alerts`, { 
        params 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }
  },
  
  // Get latest alerts
  getLatestAlerts: async (params) => {
    try {
      const response = await apiClient.get(`/alerts/latest`, { 
        params 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching latest alerts:', error);
      throw error;
    }
  },
  
  // Update alert status (e.g., mark as resolved)
  updateAlert: async (id, data) => {
    try {
      const response = await apiClient.put(`/alerts/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating alert:', error);
      throw error;
    }
  }
};

// Thresholds Services
export const thresholdsService = {
  // Get all thresholds
  getThresholds: async (deviceId = 'esp32-sample') => {
    try {
      const response = await apiClient.get(`/thresholds`, {
        params: { deviceId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching thresholds:', error);
      throw error;
    }
  },
  
  // Update threshold settings
  updateThreshold: async (parameter, data) => {
    try {
      const response = await apiClient.put(`/thresholds/${parameter}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating threshold:', error);
      throw error;
    }
  }
};

// Devices Services
export const devicesService = {
  // Get all devices
  getDevices: async () => {
    try {
      const response = await apiClient.get(`/devices`);
      return response.data;
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  },
  
  // Get device by ID
  getDevice: async (id) => {
    try {
      const response = await apiClient.get(`/devices/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching device:', error);
      throw error;
    }
  },
  
  // Update device
  updateDevice: async (id, data) => {
    try {
      const response = await apiClient.put(`/devices/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating device:', error);
      throw error;
    }
  }
};

export default {
  waterQuality: waterQualityService,
  alerts: alertsService,
  thresholds: thresholdsService,
  devices: devicesService
}; 