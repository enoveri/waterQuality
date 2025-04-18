/**
 * Database initialization script
 * This script creates tables and populates them with sample data
 * Run with: node src/utils/initDatabase.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize, testConnection } = require('../config/database');
const WaterQualityData = require('../models/WaterQualityData');
const Alert = require('../models/Alert');
const Threshold = require('../models/Threshold');
const Device = require('../models/Device');

// Default thresholds
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
    minWarning: 0,
    maxWarning: 3.0,
    minCritical: 0,
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

// Default device
const defaultDevice = {
  id: 'esp32-sample',
  name: 'Sample ESP32 Device',
  location: 'Test Location',
  description: 'A sample device for testing',
  lastSeenAt: new Date()
};

// Random helpers
const randomValue = (min, max, decimals = 1) => {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
};

const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomElement = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// Generate sample water quality data
const generateSampleData = async (days = 7, readingsPerDay = 24) => {
  console.log(`Generating ${days} days of sample water quality data with ${readingsPerDay} readings per day...`);
  
  const sampleData = [];
  const now = new Date();
  
  // Create entries for each day
  for (let day = 0; day < days; day++) {
    for (let reading = 0; reading < readingsPerDay; reading++) {
      // Calculate timestamp by subtracting days and adding hours
      const timestamp = new Date(now);
      timestamp.setDate(now.getDate() - day);
      timestamp.setHours(Math.floor(24 / readingsPerDay) * reading);
      timestamp.setMinutes(0);
      timestamp.setSeconds(0);
      
      // Generate random values with some variance but within reasonable ranges
      const baseTemp = 25; // baseline temperature in Celsius
      const basePh = 7.0; // neutral pH
      const baseTurb = 2.5; // baseline turbidity in NTU
      const baseWaterLevel = 50; // baseline water level in cm
      
      // Add some daily variance
      const dayVariance = Math.sin(day * 0.5) * 2;
      // Add some hourly variance
      const hourVariance = Math.sin(reading * 0.25) * 1;
      
      // Create the data entry
      sampleData.push({
        temperature: randomValue(baseTemp - 3 + dayVariance, baseTemp + 3 + dayVariance, 1),
        pH: randomValue(basePh - 0.5 + (dayVariance * 0.1), basePh + 0.5 + (dayVariance * 0.1), 2),
        turbidity: randomValue(baseTurb - 1 + (hourVariance * 0.5), baseTurb + 1 + (hourVariance * 0.5), 2),
        waterLevel: randomValue(baseWaterLevel - 10 + (dayVariance * 2), baseWaterLevel + 10 + (dayVariance * 2), 0),
        deviceId: 'esp32-sample',
        timestamp
      });
    }
  }
  
  // Bulk insert the data
  await WaterQualityData.bulkCreate(sampleData);
  
  console.log(`Successfully created ${sampleData.length} sample data entries`);
  return sampleData.length;
};

// Generate alert messages based on type and severity
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
  console.log(`Generating ${count} sample alerts...`);
  
  const alertTypes = ['temperature', 'pH', 'turbidity', 'waterLevel'];
  const severities = ['info', 'warning', 'critical'];
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
  return sampleAlerts.length;
};

// Create or update thresholds
const setupThresholds = async () => {
  console.log('Setting up thresholds...');
  let created = 0;
  let updated = 0;
  
  // For each threshold, find or create
  for (const threshold of defaultThresholds) {
    const [thresholdRecord, isCreated] = await Threshold.findOrCreate({
      where: {
        parameter: threshold.parameter,
        deviceId: threshold.deviceId
      },
      defaults: threshold
    });
    
    if (!isCreated) {
      // Update the existing threshold
      await thresholdRecord.update(threshold);
      updated++;
    } else {
      created++;
    }
  }
  
  console.log(`Thresholds setup complete: ${created} created, ${updated} updated`);
  return { created, updated };
};

// Create or update device
const setupDevice = async () => {
  console.log('Setting up device...');
  
  const [device, created] = await Device.findOrCreate({
    where: { id: defaultDevice.id },
    defaults: defaultDevice
  });
  
  if (!created) {
    await device.update(defaultDevice);
    console.log(`Updated existing device: ${defaultDevice.id}`);
  } else {
    console.log(`Created new device: ${defaultDevice.id}`);
  }
  
  return device;
};

// Main initialization function
const initializeDatabase = async () => {
  try {
    // Ensure database directory exists
    const dbDir = path.dirname(process.env.DB_PATH || 'database/database.sqlite');
    if (!fs.existsSync(dbDir)) {
      console.log(`Creating database directory: ${dbDir}`);
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Test connection
    await testConnection();
    console.log('Database connection successful');
    
    // Sync all models with database (create tables)
    await sequelize.sync({ alter: true });
    console.log('Database schema synchronized');
    
    // Set up device
    await setupDevice();
    
    // Set up thresholds
    await setupThresholds();
    
    // Generate sample data
    const dataCount = await generateSampleData(14, 24); // 14 days of data with hourly readings
    
    // Generate sample alerts
    const alertCount = await generateSampleAlerts(75); // 75 sample alerts
    
    console.log('========================================');
    console.log('Database initialization complete:');
    console.log(`- 1 device created`);
    console.log(`- 4 thresholds configured`);
    console.log(`- ${dataCount} data points generated`);
    console.log(`- ${alertCount} alerts generated`);
    console.log('========================================');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

// Run the initialization
initializeDatabase(); 