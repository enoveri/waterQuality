const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

// GET all alerts with optional filtering
router.get('/', alertController.getAlerts);

// GET latest alerts
router.get('/latest', alertController.getLatestAlerts);

// GET a specific alert by ID
router.get('/:id', alertController.getAlertById);

// UPDATE an alert (e.g., mark as resolved)
router.put('/:id', alertController.updateAlert);

// CREATE a new alert (typically done internally by the system)
router.post('/', alertController.createAlert);

module.exports = router; 