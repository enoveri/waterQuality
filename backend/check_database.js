// Simple script to check database contents
const { sequelize } = require('./src/config/database');
const WaterQualityData = require('./src/models/WaterQualityData');

async function checkDatabase() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Successfully connected to the database.');
    
    // Check total count of records
    const count = await WaterQualityData.count();
    console.log(`Total records in water_quality_data table: ${count}`);
    
    // If there are records, get the most recent ones
    if (count > 0) {
      console.log('Fetching 5 most recent records:');
      const latestRecords = await WaterQualityData.findAll({
        limit: 5,
        order: [['timestamp', 'DESC']]
      });
      
      // Print records in a readable format
      latestRecords.forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log(`  ID: ${record.id}`);
        console.log(`  Timestamp: ${record.timestamp}`);
        console.log(`  Temperature: ${record.temperature}`);
        console.log(`  pH: ${record.pH}`);
        console.log(`  Turbidity: ${record.turbidity}`);
        console.log(`  Water Level: ${record.waterLevel}`);
        console.log(`  Device ID: ${record.deviceId}`);
      });
      
      // Check for any null values
      const nullCheck = await sequelize.query(
        "SELECT COUNT(*) as nullCount FROM water_quality_data WHERE temperature IS NULL OR pH IS NULL OR turbidity IS NULL OR waterLevel IS NULL",
        { type: sequelize.QueryTypes.SELECT }
      );
      console.log(`\nRecords with NULL values: ${nullCheck[0].nullCount}`);
      
    } else {
      console.log('No records found in the database.');
      
      // Check if table exists
      try {
        await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='water_quality_data'");
        console.log("The water_quality_data table exists, but it's empty.");
      } catch (err) {
        console.log("The water_quality_data table might not exist.");
      }
    }
    
  } catch (error) {
    console.error('Database check error:', error);
  } finally {
    // Close connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Run the function
checkDatabase();