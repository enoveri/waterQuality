# Water Quality Monitor Backend

This is the backend server for the Water Quality Monitor application, using Express.js with SQLite and Sequelize ORM.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the backend directory with the following content:
   ```
   PORT=3001
   DB_PATH=database/database.sqlite
   ```

3. Initialize the database with sample data:
   ```
   npm run db:init
   ```

## Database

This application uses SQLite with Sequelize ORM to store water quality data. The database file is stored in the `database/database.sqlite` file.

### Models

- **WaterQualityData**: Stores sensor readings (temperature, pH, turbidity, waterLevel)
- **Alert**: Stores alert events when readings exceed thresholds
- **Threshold**: Stores threshold settings for each parameter
- **Device**: Stores information about monitoring devices

### Database Management Scripts

The following npm scripts are available for database management:

- `npm run db:init` - Initialize the database with tables and sample data
- `npm run db:seed:data` - Generate sample water quality data
- `npm run db:seed:alerts` - Generate sample alerts
- `npm run db:seed:thresholds` - Set up default threshold values

## API Endpoints

### Water Quality Data
- `GET /api/data` - Get all water quality data, with optional filtering
- `GET /api/data/latest` - Get latest water quality readings
- `GET /api/data/range` - Get data within a specific date range
- `POST /api/data` - Add new water quality data

### Alerts
- `GET /api/alerts` - Get all alerts, with optional filtering
- `GET /api/alerts/latest` - Get latest alerts
- `PUT /api/alerts/:id` - Update an alert (e.g., mark as resolved)

### Thresholds
- `GET /api/thresholds` - Get all threshold settings
- `PUT /api/thresholds/:parameter` - Update threshold settings for a parameter

### Devices
- `GET /api/devices` - Get all devices
- `GET /api/devices/:id` - Get device by ID
- `PUT /api/devices/:id` - Update device information

## Development

Start the development server with:
```
npm run dev
```

The server will restart automatically when changes are made to the code. 