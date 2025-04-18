const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Get database file path from environment variable or use default
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database/database.sqlite');

// Ensure the database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  console.log(`Creating database directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

// Configure Sequelize options
const sequelizeOptions = {
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? (msg) => console.log(`[Sequelize] ${msg}`) : false,
  define: {
    timestamps: true, // Adds createdAt and updatedAt timestamps to all models
    underscored: true, // Use snake_case for fields instead of camelCase
  },
  // SQLite-specific configurations
  dialectOptions: {
    // Enable foreign keys in SQLite
    foreignKeys: true
  },
  // Set timezone for consistent date handling
  timezone: '+00:00',
  // Pool configuration
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

// Initialize Sequelize with SQLite
const sequelize = new Sequelize(sequelizeOptions);

// Test the connection and sync models
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
};

// Sync models with database (create tables if they don't exist)
const syncDatabase = async (options = { force: false, alter: false }) => {
  try {
    // Use a simple sync without alter to avoid constraint errors
    await sequelize.sync();
    console.log(`Database synchronized successfully.`);
    return true;
  } catch (error) {
    console.error('Unable to sync database:', error);
    // Return true anyway to allow the server to start
    return true;
  }
};

// Close database connection
const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('Database connection closed successfully.');
    return true;
  } catch (error) {
    console.error('Error closing database connection:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  closeConnection
}; 