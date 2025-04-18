const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Define Threshold model
const Threshold = sequelize.define('Threshold', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  parameter: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['temperature', 'pH', 'turbidity', 'waterLevel']]
    }
  },
  minWarning: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  maxWarning: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  minCritical: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  maxCritical: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'esp32-sample',
    references: {
      model: 'devices',
      key: 'id'
    }
  }
}, {
  tableName: 'thresholds',
  timestamps: true,
  indexes: [
    {
      fields: ['parameter']
    },
    {
      fields: ['device_id']
    },
    {
      // Unique constraint for parameter + device
      fields: ['parameter', 'device_id'],
      unique: true
    }
  ]
});

module.exports = Threshold; 