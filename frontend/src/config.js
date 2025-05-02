// Configuration for the frontend application

// API base URL - dynamically selects based on environment
const getApiBaseUrl = () => {
  // For production builds on Vercel
  if (import.meta.env.PROD) {
    // Return relative URL which will be handled by Vercel rewrites
    return '/api';
  }
  // For local development
  return 'http://localhost:3001/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Maximum number of data points to store in history
export const MAX_HISTORY_POINTS = 300;

// Default refresh rates
export const DEFAULT_CHART_REFRESH_RATE = 1000; // 1 second
export const DEFAULT_DB_SAVE_INTERVAL = 5000; // 5 seconds