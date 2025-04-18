/**
 * This utility script generates sample water quality data for testing
 * Run with: node src/utils/seedData.js
 */

require('dotenv').config();
const WaterQualityData = require('../models/WaterQualityData');
const { sequelize, testConnection } = require('../config/database');

// Random value generator within a range
const randomValue = (min, max, decimals = 1) => {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
};

// Generate sample data
const generateSampleData = async (days = 7, readingsPerDay = 24) => {
  try {
    // Test database connection
    await testConnection();
    
    console.log(`Generating ${days} days of sample data with ${readingsPerDay} readings per day...`);
    
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
    
    // Exit process when done
    process.exit(0);
  } catch (error) {
    console.error('Error generating sample data:', error);
    process.exit(1);
  }
};

// Run the function with default parameters (7 days with 24 readings per day)
generateSampleData(); 