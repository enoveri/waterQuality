const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Define WaterQualityData model with Sequelize
const WaterQualityData = sequelize.define('WaterQualityData', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    index: true
  },
  temperature: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  pH: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  turbidity: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  waterLevel: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'esp32-default',
    index: true
  }
}, {
  // Table configuration options
  tableName: 'water_quality_data',
  timestamps: true, // Adds createdAt and updatedAt columns
  
  // Indexes for better query performance
  indexes: [
    {
      fields: ['timestamp']
    },
    {
      fields: ['device_id']
    },
    {
      fields: ['device_id', 'timestamp']
    }
  ]
});

module.exports = WaterQualityData; 