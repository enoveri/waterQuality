const Device = require('./Device');
const WaterQualityData = require('./WaterQualityData');
const Alert = require('./Alert');
const Threshold = require('./Threshold');

// Define relationships between models

// Device has many WaterQualityData
Device.hasMany(WaterQualityData, {
  foreignKey: 'deviceId',
  onDelete: 'CASCADE'
});
WaterQualityData.belongsTo(Device, {
  foreignKey: 'deviceId'
});

// Device has many Alerts
Device.hasMany(Alert, {
  foreignKey: 'deviceId',
  onDelete: 'CASCADE'
});
Alert.belongsTo(Device, {
  foreignKey: 'deviceId'
});

// Device has many Thresholds
Device.hasMany(Threshold, {
  foreignKey: 'deviceId',
  onDelete: 'CASCADE'
});
Threshold.belongsTo(Device, {
  foreignKey: 'deviceId'
});

module.exports = {
  Device,
  WaterQualityData,
  Alert,
  Threshold
}; 