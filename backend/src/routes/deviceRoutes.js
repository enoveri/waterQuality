const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// Ensure all controller methods are defined
if (!deviceController.getDevices) {
  console.error('Warning: deviceController.getDevices is undefined');
  deviceController.getDevices = (req, res) => {
    res.status(500).json({ error: 'Route handler not properly defined' });
  };
}

if (!deviceController.getDeviceById) {
  console.error('Warning: deviceController.getDeviceById is undefined');
  deviceController.getDeviceById = (req, res) => {
    res.status(500).json({ error: 'Route handler not properly defined' });
  };
}

if (!deviceController.updateDevice) {
  console.error('Warning: deviceController.updateDevice is undefined');
  deviceController.updateDevice = (req, res) => {
    res.status(500).json({ error: 'Route handler not properly defined' });
  };
}

if (!deviceController.createDevice) {
  console.error('Warning: deviceController.createDevice is undefined');
  deviceController.createDevice = (req, res) => {
    res.status(500).json({ error: 'Route handler not properly defined' });
  };
}

// GET all devices
router.get('/', deviceController.getDevices);

// GET a specific device by ID
router.get('/:id', deviceController.getDeviceById);

// UPDATE device information
router.put('/:id', deviceController.updateDevice);

// CREATE a new device
router.post('/', deviceController.createDevice);

module.exports = router; 