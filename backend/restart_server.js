/**
 * Restart Server Script
 * 
 * This script will:
 * 1. Detect and close any processes using port 3001
 * 2. Start the server
 * 
 * Usage: node restart_server.js
 */

const { exec } = require('child_process');
const path = require('path');

console.log('Starting server restart process...');

// Function to execute shell commands
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        // Don't reject here, just continue
        resolve({ stdout, stderr });
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function restartServer() {
  try {
    // Step 1: Find processes using port 3001
    console.log('Checking for processes using port 3001...');
    const { stdout: findResult } = await executeCommand('netstat -ano | findstr :3001');
    
    // Parse PID from netstat output
    let pids = [];
    if (findResult) {
      const lines = findResult.split('\n');
      for (const line of lines) {
        const pidMatch = line.match(/\s+(\d+)\s*$/);
        if (pidMatch && pidMatch[1]) {
          const pid = pidMatch[1].trim();
          if (!pids.includes(pid) && pid !== '0') {
            pids.push(pid);
          }
        }
      }
    }
    
    // Step 2: Kill processes if any were found
    if (pids.length > 0) {
      console.log(`Found processes using port 3001: ${pids.join(', ')}`);
      for (const pid of pids) {
        console.log(`Killing process ${pid}...`);
        await executeCommand(`taskkill /F /PID ${pid}`);
      }
      console.log('All processes killed');
    } else {
      console.log('No processes found using port 3001');
    }
    
    // Step 3: Start the server
    console.log('Starting server...');
    const serverProcess = exec('node src/index.js', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Server error: ${error.message}`);
        return;
      }
    });
    
    // Output server logs
    serverProcess.stdout.on('data', (data) => {
      console.log(data.toString().trim());
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error(data.toString().trim());
    });
    
    console.log('Server startup process initiated');
    console.log('Server should be available at http://localhost:3001/api');
    
  } catch (error) {
    console.error('Error during restart process:', error);
  }
}

// Run the restart process
restartServer(); 