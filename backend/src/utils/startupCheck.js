/**
 * Startup health check for production environment
 * This script runs various checks to ensure the environment is correctly configured
 */

const fs = require('fs');
const path = require('path');
const { testConnection } = require('../config/database');
const logger = require('./logger');

/**
 * Run all startup checks
 * @returns {Promise<boolean>} True if all checks pass
 */
const runStartupChecks = async () => {
  logger.info('Running startup health checks...');
  
  // Track success of all checks
  let allChecksPassed = true;
  
  // Check environment variables
  logger.info('Checking environment variables...');
  const requiredEnvVars = ['PORT', 'NODE_ENV', 'DB_PATH'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    logger.warn(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    logger.warn('Using default values where possible');
    allChecksPassed = false;
  } else {
    logger.info('✓ Environment variables check passed');
  }
  
  // Check database path and directory
  logger.info('Checking database path...');
  const dbPath = process.env.DB_PATH || 'database/database.sqlite';
  const dbDir = path.dirname(dbPath);
  
  try {
    // Check if directory exists
    if (!fs.existsSync(dbDir)) {
      logger.warn(`Database directory ${dbDir} does not exist. Creating...`);
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info(`✓ Created database directory: ${dbDir}`);
    } else {
      logger.info(`✓ Database directory exists: ${dbDir}`);
    }
    
    // Check write permissions by trying to write a test file
    const testFilePath = path.join(dbDir, '.write-test');
    fs.writeFileSync(testFilePath, 'test');
    fs.unlinkSync(testFilePath);
    logger.info(`✓ Database directory is writable`);
    
  } catch (error) {
    logger.error(`Database directory check failed: ${error.message}`);
    allChecksPassed = false;
  }
  
  // Check database connection
  logger.info('Testing database connection...');
  try {
    const connected = await testConnection();
    if (connected) {
      logger.info('✓ Database connection successful');
    } else {
      logger.error('Database connection failed');
      allChecksPassed = false;
    }
  } catch (error) {
    logger.error(`Database connection error: ${error.message}`);
    allChecksPassed = false;
  }
  
  // Check for production mode specifics
  if (process.env.NODE_ENV === 'production') {
    logger.info('Running production-specific checks...');
    
    // Check CORS configuration
    if (!process.env.CORS_ALLOWED_ORIGINS) {
      logger.warn('CORS_ALLOWED_ORIGINS not set in production. Using defaults.');
    }
    
    // Verify fallback mode is enabled if ESP32 is not accessible
    if (process.env.USE_FALLBACK !== 'true') {
      logger.warn('USE_FALLBACK is not enabled in production. ESP32 connectivity issues may occur.');
    }
  }
  
  // Summary
  if (allChecksPassed) {
    logger.info('✅ All startup checks passed!');
  } else {
    logger.warn('⚠️ Some startup checks failed. Review the logs above.');
  }
  
  return allChecksPassed;
};

module.exports = { runStartupChecks };