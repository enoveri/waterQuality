/**
 * Logger utility for consistent logging across the application
 * Configurable based on environment
 */

// Simple logger with different levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Get current log level from environment or default to INFO
const getCurrentLevel = () => {
  const envLevel = process.env.LOG_LEVEL
    ? process.env.LOG_LEVEL.toUpperCase()
    : "INFO";
  return LOG_LEVELS[envLevel] !== undefined
    ? LOG_LEVELS[envLevel]
    : LOG_LEVELS.INFO;
};

// Current log level
const currentLevel = getCurrentLevel();

// Logger with timestamp and level prefixes
const logger = {
  error: (...args) => {
    if (currentLevel >= LOG_LEVELS.ERROR) {
      console.error(`[${new Date().toISOString()}] [ERROR]`, ...args);
    }
  },

  warn: (...args) => {
    if (currentLevel >= LOG_LEVELS.WARN) {
      console.warn(`[${new Date().toISOString()}] [WARN]`, ...args);
    }
  },

  info: (...args) => {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.info(`[${new Date().toISOString()}] [INFO]`, ...args);
    }
  },

  debug: (...args) => {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      console.debug(`[${new Date().toISOString()}] [DEBUG]`, ...args);
    }
  },

  // For API request logging
  request: (req, status, time) => {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.info(
        `[${new Date().toISOString()}] [REQUEST] ${req.method} ${
          req.url
        } ${status} ${time}ms`
      );
    }
  },
};

module.exports = logger;
