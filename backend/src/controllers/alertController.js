const Alert = require('../models/Alert');
const { Op } = require('sequelize');

// Get all alerts with optional filtering
exports.getAlerts = async (req, res) => {
  try {
    const { 
      deviceId,
      startDate,
      endDate,
      severity,
      type,
      status,
      limit = 100,
      offset = 0,
      sort = 'desc'
    } = req.query;
    
    // Build where conditions
    const whereConditions = {};
    
    if (deviceId) whereConditions.deviceId = deviceId;
    if (severity) whereConditions.severity = severity;
    if (type) whereConditions.type = type;
    if (status) whereConditions.status = status;
    
    // Add date range if specified
    if (startDate || endDate) {
      whereConditions.timestamp = {};
      if (startDate) whereConditions.timestamp[Op.gte] = new Date(startDate);
      if (endDate) whereConditions.timestamp[Op.lte] = new Date(endDate);
    }
    
    // Query database
    const alerts = await Alert.findAll({
      where: whereConditions,
      order: [['timestamp', sort === 'asc' ? 'ASC' : 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
    
    // Count total matching alerts
    const totalCount = await Alert.count({
      where: whereConditions
    });
    
    return res.status(200).json({
      success: true,
      count: alerts.length,
      total: totalCount,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
      error: error.message
    });
  }
};

// Get latest alerts
exports.getLatestAlerts = async (req, res) => {
  try {
    const { deviceId, limit = 10 } = req.query;
    
    // Build where conditions
    const whereConditions = {};
    if (deviceId) whereConditions.deviceId = deviceId;
    
    // Query database
    const alerts = await Alert.findAll({
      where: whereConditions,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit, 10)
    });
    
    return res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching latest alerts:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching latest alerts',
      error: error.message
    });
  }
};

// Get a specific alert by ID
exports.getAlertById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const alert = await Alert.findByPk(id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: `Alert with ID ${id} not found`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Error fetching alert by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching alert',
      error: error.message
    });
  }
};

// Update an alert (e.g., mark as resolved)
exports.updateAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Find the alert
    const alert = await Alert.findByPk(id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: `Alert with ID ${id} not found`
      });
    }
    
    // Update the alert
    await alert.update(updateData);
    
    return res.status(200).json({
      success: true,
      message: 'Alert updated successfully',
      data: alert
    });
  } catch (error) {
    console.error('Error updating alert:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating alert',
      error: error.message
    });
  }
};

// Create a new alert
exports.createAlert = async (req, res) => {
  try {
    const { 
      type, 
      severity, 
      message, 
      value, 
      deviceId = 'esp32-sample',
      status = 'active' 
    } = req.body;
    
    // Check required fields
    if (!type || !severity || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, severity, message'
      });
    }
    
    // Create alert
    const alert = await Alert.create({
      type,
      severity,
      message,
      value,
      deviceId,
      status,
      timestamp: new Date()
    });
    
    return res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      data: alert
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating alert',
      error: error.message
    });
  }
}; 