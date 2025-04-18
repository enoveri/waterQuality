const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Define Alert model
const Alert = sequelize.define('Alert', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['temperature', 'pH', 'turbidity', 'waterLevel']]
    }
  },
  severity: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['info', 'warning', 'critical']]
    }
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'esp32-sample',
    references: {
      model: 'devices',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active',
    validate: {
      isIn: [['active', 'resolved', 'ignored']]
    }
  }
}, {
  tableName: 'alerts',
  timestamps: true,
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['severity']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['device_id']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = Alert; 