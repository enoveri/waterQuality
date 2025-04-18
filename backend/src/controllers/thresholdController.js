const Threshold = require('../models/Threshold');

// Get all thresholds for a device
exports.getThresholds = async (req, res) => {
  try {
    const { deviceId = 'esp32-sample' } = req.query;
    
    // Get all thresholds for the device
    const thresholds = await Threshold.findAll({
      where: { deviceId }
    });
    
    return res.status(200).json({
      success: true,
      count: thresholds.length,
      data: thresholds
    });
  } catch (error) {
    console.error('Error fetching thresholds:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching thresholds',
      error: error.message
    });
  }
};

// Get threshold for a specific parameter
exports.getThresholdByParameter = async (req, res) => {
  try {
    const { parameter } = req.params;
    const { deviceId = 'esp32-sample' } = req.query;
    
    // Check if parameter is valid
    if (!['temperature', 'pH', 'turbidity', 'waterLevel'].includes(parameter)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid parameter. Use temperature, pH, turbidity, or waterLevel'
      });
    }
    
    // Get threshold
    const threshold = await Threshold.findOne({
      where: { parameter, deviceId }
    });
    
    if (!threshold) {
      return res.status(404).json({
        success: false,
        message: `No threshold found for parameter ${parameter} and device ${deviceId}`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: threshold
    });
  } catch (error) {
    console.error('Error fetching threshold by parameter:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching threshold',
      error: error.message
    });
  }
};

// Update threshold for a specific parameter
exports.updateThreshold = async (req, res) => {
  try {
    const { parameter } = req.params;
    const { 
      minWarning, 
      maxWarning, 
      minCritical, 
      maxCritical, 
      enabled,
      deviceId = 'esp32-sample'
    } = req.body;
    
    // Check if parameter is valid
    if (!['temperature', 'pH', 'turbidity', 'waterLevel'].includes(parameter)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid parameter. Use temperature, pH, turbidity, or waterLevel'
      });
    }
    
    // Find threshold
    let threshold = await Threshold.findOne({
      where: { parameter, deviceId }
    });
    
    if (!threshold) {
      // Create new threshold if it doesn't exist
      threshold = await Threshold.create({
        parameter,
        minWarning,
        maxWarning,
        minCritical,
        maxCritical,
        enabled: enabled !== undefined ? enabled : true,
        deviceId
      });
      
      return res.status(201).json({
        success: true,
        message: 'Threshold created successfully',
        data: threshold
      });
    } else {
      // Update existing threshold
      await threshold.update({
        minWarning: minWarning !== undefined ? minWarning : threshold.minWarning,
        maxWarning: maxWarning !== undefined ? maxWarning : threshold.maxWarning,
        minCritical: minCritical !== undefined ? minCritical : threshold.minCritical,
        maxCritical: maxCritical !== undefined ? maxCritical : threshold.maxCritical,
        enabled: enabled !== undefined ? enabled : threshold.enabled
      });
      
      return res.status(200).json({
        success: true,
        message: 'Threshold updated successfully',
        data: threshold
      });
    }
  } catch (error) {
    console.error('Error updating threshold:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating threshold',
      error: error.message
    });
  }
}; 