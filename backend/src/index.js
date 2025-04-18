require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { testConnection, syncDatabase } = require('./config/database');
// Import models to ensure they are registered
const models = require('./models');
const waterQualityRoutes = require('./routes/waterQualityRoutes');
const alertRoutes = require('./routes/alertRoutes');
const thresholdRoutes = require('./routes/thresholdRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const path = require('path');
const fs = require('fs');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Create database directory if it doesn't exist
const dbDir = path.dirname(process.env.DB_PATH || 'database/database.sqlite');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/data', waterQualityRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/thresholds', thresholdRoutes);
app.use('/api/devices', deviceRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

// Start the server after testing database connection
const startServer = async () => {
  try {
    // Test database connection
    const connected = await testConnection();
    
    if (connected) {
      // Sync models with database (create tables if they don't exist)
      await syncDatabase();
      
      // Start server after DB connection is successful
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`API available at http://localhost:${PORT}/api`);
      });
    } else {
      console.error('Failed to connect to the database. Server not started.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Do not crash the server, just log the error
});

module.exports = app; // For testing purposes 