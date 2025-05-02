/**
 * ESP32 Deployment Configuration Script
 * This script helps configure the ESP32 device for different environments
 * 
 * Usage: 
 * - Run with node: node deploy_config.js [environment]
 * - Where environment is 'local' or 'cloud'
 */

const fs = require('fs');
const path = require('path');

// Configuration options for different environments
const CONFIG = {
  local: {
    serverURL: 'http://192.168.4.100:3001', // Change to your local server IP
    serverEndpoint: '/api/data',
    eventSource: false,
    sampleInterval: 2000 // 2 seconds
  },
  cloud: {
    serverURL: 'https://water-quality-backend.onrender.com', // Change to your Render URL
    serverEndpoint: '/api/data',
    eventSource: false,
    sampleInterval: 5000 // 5 seconds for cloud to reduce API calls
  }
};

// Get the target file
const sketchFile = path.join(__dirname, 'src', 'final_sketch.cpp');

// Get the environment from command line args
const args = process.argv.slice(2);
const environment = args[0]?.toLowerCase() || 'local';

if (!['local', 'cloud'].includes(environment)) {
  console.error('Invalid environment. Please specify "local" or "cloud"');
  process.exit(1);
}

// Read the file
try {
  console.log(`Reading ESP32 sketch file: ${sketchFile}`);
  let content = fs.readFileSync(sketchFile, 'utf8');
  
  // Make replacements based on environment config
  console.log(`Configuring ESP32 for ${environment} environment`);
  const config = CONFIG[environment];
  
  // Replace server URL
  content = content.replace(
    /#define SERVER_URL .*$/m,
    `#define SERVER_URL "${config.serverURL}"`
  );
  
  // Replace server endpoint
  content = content.replace(
    /#define SERVER_ENDPOINT .*$/m,
    `#define SERVER_ENDPOINT "${config.serverEndpoint}"`
  );
  
  // Replace sample interval
  content = content.replace(
    /#define SAMPLE_INTERVAL .*$/m,
    `#define SAMPLE_INTERVAL ${config.sampleInterval}`
  );
  
  // Write the updated file
  fs.writeFileSync(sketchFile, content, 'utf8');
  console.log('ESP32 configuration updated successfully!');
  console.log(`Server URL: ${config.serverURL}`);
  console.log(`Server Endpoint: ${config.serverEndpoint}`);
  console.log(`Sample Interval: ${config.sampleInterval}ms`);
  
  console.log('\nNext steps:');
  console.log('1. Upload the updated sketch to your ESP32');
  console.log('2. Make sure your ESP32 has internet access');
  console.log('3. Verify data is being sent to your backend');
  
} catch (error) {
  console.error('Error updating ESP32 configuration:', error);
  process.exit(1);
}