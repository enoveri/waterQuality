const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Define Device model
const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Unknown'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lastSeenAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'devices',
  timestamps: true,
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['last_seen_at']
    }
  ]
});

module.exports = Device; 