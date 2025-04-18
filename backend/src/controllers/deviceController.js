const Device = require('../models/Device');

// Get all devices
exports.getDevices = async (req, res) => {
  try {
    const devices = await Device.findAll();
    
    return res.status(200).json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching devices',
      error: error.message
    });
  }
};

// Get a device by ID
exports.getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const device = await Device.findByPk(id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: `Device with ID ${id} not found`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: device
    });
  } catch (error) {
    console.error('Error fetching device by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching device',
      error: error.message
    });
  }
};

// Update a device
exports.updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      location,
      description
    } = req.body;
    
    const device = await Device.findByPk(id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: `Device with ID ${id} not found`
      });
    }
    
    // Update fields
    await device.update({
      name: name || device.name,
      location: location || device.location,
      description: description || device.description,
      lastSeenAt: new Date() // Update last seen timestamp
    });
    
    return res.status(200).json({
      success: true,
      message: 'Device updated successfully',
      data: device
    });
  } catch (error) {
    console.error('Error updating device:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating device',
      error: error.message
    });
  }
};

// Create a new device
exports.createDevice = async (req, res) => {
  try {
    const {
      id,
      name,
      location,
      description
    } = req.body;
    
    // Validate required fields
    if (!id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: id, name'
      });
    }
    
    // Check if device with ID already exists
    const existingDevice = await Device.findByPk(id);
    
    if (existingDevice) {
      return res.status(409).json({
        success: false,
        message: `Device with ID ${id} already exists`
      });
    }
    
    // Create new device
    const device = await Device.create({
      id,
      name,
      location: location || 'Unknown',
      description: description || '',
      lastSeenAt: new Date()
    });
    
    return res.status(201).json({
      success: true,
      message: 'Device created successfully',
      data: device
    });
  } catch (error) {
    console.error('Error creating device:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating device',
      error: error.message
    });
  }
}; 