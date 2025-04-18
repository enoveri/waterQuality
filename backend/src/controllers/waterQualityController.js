const WaterQualityData = require('../models/WaterQualityData');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// Create a new data entry from ESP32
exports.createDataEntry = async (req, res) => {
  try {
    const { temperature, pH, turbidity, waterLevel, deviceId = 'esp32-default', timestamp } = req.body;
    
    // Validate required fields
    if (temperature === undefined || pH === undefined || 
        turbidity === undefined || waterLevel === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields (temperature, pH, turbidity, waterLevel)' 
      });
    }
    
    // Create data object with custom timestamp if provided
    const dataEntry = await WaterQualityData.create({
      temperature,
      pH,
      turbidity,
      waterLevel,
      deviceId,
      ...(timestamp && { timestamp: new Date(timestamp) })
    });
    
    return res.status(201).json({
      success: true,
      data: dataEntry
    });
  } catch (error) {
    console.error('Error saving water quality data:', error);
    return res.status(500).json({
      success: false,
      message: 'Error saving water quality data',
      error: error.message
    });
  }
};

// Get the latest data entry
exports.getLatestData = async (req, res) => {
  try {
    const { deviceId = 'esp32-default' } = req.query;
    
    const latestData = await WaterQualityData.findOne({
      where: { deviceId },
      order: [['timestamp', 'DESC']]
    });
    
    if (!latestData) {
      return res.status(404).json({
        success: false,
        message: 'No data found for this device'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: latestData
    });
  } catch (error) {
    console.error('Error fetching latest data:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching latest data',
      error: error.message
    });
  }
};

// Get historical data within a date range
exports.getHistoricalData = async (req, res) => {
  try {
    const { 
      deviceId = 'esp32-sample',
      startDate, 
      endDate,
      limit = 1000, // Default limit to prevent excessive data
      interval // Optional: 'minute', 'hour', 'day' for aggregated data
    } = req.query;
    
    // Log query parameters for debugging
    console.log('Historical data query parameters:', { 
      deviceId, 
      startDate, 
      endDate, 
      limit, 
      interval,
      path: req.path,
      originalUrl: req.originalUrl
    });
    
    // Build query conditions
    const whereCondition = { deviceId };
    
    // Add date range if provided
    if (startDate || endDate) {
      whereCondition.timestamp = {};
      if (startDate) whereCondition.timestamp[Op.gte] = new Date(startDate);
      if (endDate) whereCondition.timestamp[Op.lte] = new Date(endDate);
    }
    
    // If interval specified, use aggregation for downsampling
    if (interval) {
      let timeFormat;
      
      // Configure time format string for SQLite strftime function
      switch(interval) {
        case 'minute':
          timeFormat = '%Y-%m-%d %H:%M:00';
          break;
        case 'hour':
          timeFormat = '%Y-%m-%d %H:00:00';
          break;
        case 'day':
          timeFormat = '%Y-%m-%d 00:00:00';
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid interval. Use 'minute', 'hour', or 'day'"
          });
      }
      
      // Raw SQL query for aggregation since SQLite has limited aggregation functionality
      // compared to MongoDB's aggregation pipeline
      const query = `
        SELECT 
          strftime('${timeFormat}', timestamp) as interval_timestamp,
          AVG(temperature) as temperature,
          AVG(pH) as pH,
          AVG(turbidity) as turbidity,
          AVG(water_level) as waterLevel,
          COUNT(*) as count,
          MIN(timestamp) as timestamp,
          device_id as deviceId
        FROM water_quality_data
        WHERE device_id = ? ${startDate ? "AND timestamp >= datetime(?)" : ""} ${endDate ? "AND timestamp <= datetime(?)" : ""}
        GROUP BY interval_timestamp, device_id
        ORDER BY interval_timestamp
        LIMIT ?
      `;
      
      const replacements = [deviceId];
      if (startDate) replacements.push(new Date(startDate).toISOString());
      if (endDate) replacements.push(new Date(endDate).toISOString());
      replacements.push(parseInt(limit, 10));
      
      const aggregatedData = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });
      
      return res.status(200).json({
        success: true,
        count: aggregatedData.length,
        data: aggregatedData.map(item => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }))
      });
    } else {
      // Regular query without aggregation
      const data = await WaterQualityData.findAll({
        where: whereCondition,
        order: [['timestamp', 'ASC']],
        limit: parseInt(limit, 10)
      });
      
      // Log results for debugging
      console.log(`Found ${data.length} records matching query`);
      if (data.length === 0) {
        console.log('No records found - checking database content');
        const totalCount = await WaterQualityData.count();
        console.log(`Total records in database: ${totalCount}`);
        if (totalCount > 0) {
          const sampleData = await WaterQualityData.findOne();
          console.log('Sample data record deviceId:', sampleData.deviceId);
        }
      }
      
      return res.status(200).json({
        success: true,
        count: data.length,
        data: data
      });
    }
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching historical data',
      error: error.message
    });
  }
};

// Get statistics for a date range
exports.getStatistics = async (req, res) => {
  try {
    const { 
      deviceId = 'esp32-default',
      startDate, 
      endDate,
      parameter // temperature, pH, turbidity, waterLevel
    } = req.query;
    
    // Validate parameter
    if (!parameter || !['temperature', 'pH', 'turbidity', 'waterLevel'].includes(parameter)) {
      return res.status(400).json({
        success: false,
        message: "Parameter required. Use 'temperature', 'pH', 'turbidity', or 'waterLevel'"
      });
    }
    
    // Map parameter name to database column
    const columnName = parameter === 'waterLevel' ? 'water_level' : parameter;
    
    // Build query conditions
    const whereCondition = { deviceId };
    
    // Add date range if provided
    if (startDate || endDate) {
      whereCondition.timestamp = {};
      if (startDate) whereCondition.timestamp[Op.gte] = new Date(startDate);
      if (endDate) whereCondition.timestamp[Op.lte] = new Date(endDate);
    }
    
    // Raw SQL query for statistics
    const query = `
      SELECT 
        MIN(${columnName}) as min,
        MAX(${columnName}) as max,
        AVG(${columnName}) as avg,
        COUNT(*) as count
      FROM water_quality_data
      WHERE device_id = ? ${startDate ? "AND timestamp >= datetime(?)" : ""} ${endDate ? "AND timestamp <= datetime(?)" : ""}
    `;
    
    const replacements = [deviceId];
    if (startDate) replacements.push(new Date(startDate).toISOString());
    if (endDate) replacements.push(new Date(endDate).toISOString());
    
    const statsResults = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });
    
    // With sequelize.QueryTypes.SELECT, results are returned as an array
    const stats = statsResults[0];
    
    if (!stats || !stats.count) {
      return res.status(404).json({
        success: false,
        message: 'No data found for this parameter and date range'
      });
    }
    
    // Calculate standard deviation (not directly available in SQLite)
    const stdDevQuery = `
      SELECT 
        sqrt(sum((${columnName} - ${stats.avg}) * (${columnName} - ${stats.avg})) / count(*)) as stdDev
      FROM water_quality_data
      WHERE device_id = ? ${startDate ? "AND timestamp >= datetime(?)" : ""} ${endDate ? "AND timestamp <= datetime(?)" : ""}
    `;
    
    const stdDevResults = await sequelize.query(stdDevQuery, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });
    
    const stdDevResult = stdDevResults[0];
    
    return res.status(200).json({
      success: true,
      data: {
        ...stats,
        stdDev: stdDevResult?.stdDev || 0
      }
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting statistics',
      error: error.message
    });
  }
};

// Delete historical data
exports.deleteHistoricalData = async (req, res) => {
  try {
    const { 
      deviceId = 'esp32-default',
      startDate, 
      endDate
    } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required for deletion'
      });
    }
    
    // Build query conditions
    const whereCondition = { 
      deviceId,
      timestamp: {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      }
    };
    
    // Delete matching records
    const result = await WaterQualityData.destroy({
      where: whereCondition
    });
    
    return res.status(200).json({
      success: true,
      message: `Deleted ${result} records`
    });
  } catch (error) {
    console.error('Error deleting data:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting data',
      error: error.message
    });
  }
}; 