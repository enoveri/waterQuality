/**
 * This utility script generates sample alerts for testing
 * Run with: node src/utils/seedAlerts.js
 */

require('dotenv').config();
const Alert = require('../models/Alert');
const { testConnection } = require('../config/database');

// Alert types
const alertTypes = ['temperature', 'pH', 'turbidity', 'waterLevel'];

// Alert severities
const severities = ['info', 'warning', 'critical'];

// Random value generator within a range
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Random element from array
const randomElement = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// Get random message based on type and severity
const getMessage = (type, severity, value) => {
  const messages = {
    temperature: {
      info: `Temperature slightly out of optimal range at ${value}°C`,
      warning: `Temperature approaching critical levels at ${value}°C`,
      critical: `Critical temperature detected at ${value}°C!`
    },
    pH: {
      info: `pH level slightly abnormal at ${value}`,
      warning: `pH level approaching critical range at ${value}`,
      critical: `Critical pH level detected at ${value}!`
    },
    turbidity: {
      info: `Water clarity slightly reduced at ${value} NTU`,
      warning: `Water clarity significantly reduced at ${value} NTU`,
      critical: `Critical turbidity level detected at ${value} NTU!`
    },
    waterLevel: {
      info: `Water level slightly outside normal range at ${value}cm`,
      warning: `Water level approaching critical threshold at ${value}cm`,
      critical: `Critical water level detected at ${value}cm!`
    }
  };
  
  return messages[type][severity];
};

// Generate appropriate value based on type and severity
const generateValue = (type, severity) => {
  // Different ranges based on type and severity
  const ranges = {
    temperature: {
      info: [22, 23, 27, 28],
      warning: [18, 21, 29, 32],
      critical: [10, 17, 33, 40]
    },
    pH: {
      info: [6.5, 6.8, 7.5, 7.8],
      warning: [6.0, 6.4, 7.9, 8.5],
      critical: [4.0, 5.9, 8.6, 10.0]
    },
    turbidity: {
      info: [3.0, 4.0],
      warning: [4.1, 6.0],
      critical: [6.1, 10.0]
    },
    waterLevel: {
      info: [35, 45, 55, 65],
      warning: [25, 34, 66, 75],
      critical: [10, 24, 76, 90]
    }
  };
  
  const range = ranges[type][severity];
  
  // For critical and warning, pick either low or high range
  if (severity === 'critical' || severity === 'warning') {
    const isLow = Math.random() > 0.5;
    if (isLow) {
      return randomInt(range[0] * 10, range[1] * 10) / 10;
    } else {
      return randomInt(range[2] * 10, range[3] * 10) / 10;
    }
  }
  
  // For info, just pick a random value from the range
  return randomInt(range[0] * 10, range[3] * 10) / 10;
};

// Generate sample alerts
const generateSampleAlerts = async (count = 50) => {
  try {
    // Test database connection
    await testConnection();
    
    console.log(`Generating ${count} sample alerts...`);
    
    const sampleAlerts = [];
    const now = new Date();
    
    // Create sample alerts
    for (let i = 0; i < count; i++) {
      const type = randomElement(alertTypes);
      const severity = randomElement(severities);
      const value = generateValue(type, severity);
      
      // Random timestamp within the last 30 days
      const timestamp = new Date(now);
      timestamp.setDate(now.getDate() - randomInt(0, 30));
      timestamp.setHours(randomInt(0, 23));
      timestamp.setMinutes(randomInt(0, 59));
      timestamp.setSeconds(randomInt(0, 59));
      
      sampleAlerts.push({
        type,
        severity,
        message: getMessage(type, severity, value),
        value,
        timestamp,
        deviceId: 'esp32-sample',
        status: Math.random() > 0.7 ? 'resolved' : 'active' // 30% resolved, 70% active
      });
    }
    
    // Sort by timestamp in descending order (newer first)
    sampleAlerts.sort((a, b) => b.timestamp - a.timestamp);
    
    // Bulk insert the alerts
    await Alert.bulkCreate(sampleAlerts);
    
    console.log(`Successfully created ${sampleAlerts.length} sample alerts`);
    
    // Exit process when done
    process.exit(0);
  } catch (error) {
    console.error('Error generating sample alerts:', error);
    process.exit(1);
  }
};

// Run with default parameter (50 alerts)
generateSampleAlerts(); 