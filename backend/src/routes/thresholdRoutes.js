const express = require('express');
const router = express.Router();
const thresholdController = require('../controllers/thresholdController');

// GET all thresholds for a device
router.get('/', thresholdController.getThresholds);

// GET threshold for a specific parameter
router.get('/:parameter', thresholdController.getThresholdByParameter);

// UPDATE threshold for a specific parameter
router.put('/:parameter', thresholdController.updateThreshold);

module.exports = router; 