/**
 * This utility script sets default threshold values for alerts
 * Run with: node src/utils/seedThresholds.js
 */

require('dotenv').config();
const Threshold = require('../models/Threshold');
const { testConnection } = require('../config/database');

// Default thresholds for water quality parameters
const defaultThresholds = [
  {
    parameter: 'temperature',
    minWarning: 20,
    maxWarning: 28,
    minCritical: 15,
    maxCritical: 32,
    enabled: true,
    deviceId: 'esp32-sample'
  },
  {
    parameter: 'pH',
    minWarning: 6.5,
    maxWarning: 8.0,
    minCritical: 6.0,
    maxCritical: 9.0,
    enabled: true,
    deviceId: 'esp32-sample'
  },
  {
    parameter: 'turbidity',
    minWarning: 0,  // No minimum warning for turbidity
    maxWarning: 3.0,
    minCritical: 0, // No minimum critical for turbidity
    maxCritical: 5.0,
    enabled: true,
    deviceId: 'esp32-sample'
  },
  {
    parameter: 'waterLevel',
    minWarning: 30,
    maxWarning: 70,
    minCritical: 20,
    maxCritical: 80,
    enabled: true,
    deviceId: 'esp32-sample'
  }
];

// Set default thresholds
const setDefaultThresholds = async () => {
  try {
    // Test database connection
    await testConnection();
    
    console.log('Setting default thresholds...');
    
    // For each threshold, try to find an existing one and update it,
    // or create a new one if it doesn't exist
    for (const threshold of defaultThresholds) {
      const [thresholdRecord, created] = await Threshold.findOrCreate({
        where: {
          parameter: threshold.parameter,
          deviceId: threshold.deviceId
        },
        defaults: threshold
      });
      
      if (!created) {
        // Update the existing threshold with new values
        await thresholdRecord.update(threshold);
        console.log(`Updated threshold for ${threshold.parameter}`);
      } else {
        console.log(`Created new threshold for ${threshold.parameter}`);
      }
    }
    
    console.log('Successfully set default thresholds');
    
    // Exit process when done
    process.exit(0);
  } catch (error) {
    console.error('Error setting default thresholds:', error);
    process.exit(1);
  }
};

// Run the function
setDefaultThresholds(); 