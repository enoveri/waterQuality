const express = require('express');
const router = express.Router();
const waterQualityController = require('../controllers/waterQualityController');

// CREATE - Post new data
router.post('/', waterQualityController.createDataEntry);

// READ - Get all data with optional filtering
router.get('/', waterQualityController.getHistoricalData);

// READ - Get latest data
router.get('/latest', waterQualityController.getLatestData);

// READ - Get data within a specific date range
router.get('/range', waterQualityController.getHistoricalData);

// READ - Get historical data - this endpoint was missing
router.get('/historical', waterQualityController.getHistoricalData);

// READ - Get data statistics
router.get('/stats', waterQualityController.getStatistics);

// DELETE - Delete historical data
router.delete('/', waterQualityController.deleteHistoricalData);

module.exports = router; 