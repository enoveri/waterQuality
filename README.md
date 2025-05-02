# Water Quality Monitor

A full-stack application for monitoring water quality parameters from IoT devices. This system collects data from ESP32 sensors, stores it in a SQLite database, and displays it through a React frontend with real-time visualization.

## Architecture

The application consists of three main components:

1. **ESP32 Device**: Collects water quality parameters (temperature, pH, turbidity, water level) and sends them to the backend server.

2. **Backend Server**: An Express.js application that:
   - Stores data in a SQLite database using Sequelize ORM
   - Provides REST API endpoints for data access
   - Processes alerts based on configurable thresholds

3. **Frontend Application**: A React application that:
   - Displays real-time and historical water quality data
   - Visualizes data using interactive charts
   - Provides alert management and notification
   - Allows configuration of thresholds and system settings

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm (v6+)

### Setup Instructions

#### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the backend directory with:
   ```
   PORT=3001
   DB_PATH=database/database.sqlite
   ```

4. Initialize the database with sample data:
   ```
   npm run db:init
   ```

5. Start the backend server:
   ```
   npm run dev
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the frontend directory with:
   ```
   REACT_APP_API_URL=http://localhost:3001/api
   ```

4. Start the frontend development server:
   ```
   npm start
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Deployment

This application is configured for easy deployment to cloud platforms:

- **Backend**: Optimized for deployment on Render with persistent storage
- **Frontend**: Ready for Vercel deployment with global CDN

For detailed deployment instructions, see the [DEPLOYMENT.md](./DEPLOYMENT.md) file.

## Key Features

- **Real-time Monitoring**: View current water quality parameters with automatic updates
- **Historical Data Analysis**: Review trends over time with interactive charts
- **Customizable Alerts**: Set thresholds for each parameter to generate alerts
- **Data Export**: Export data in CSV or JSON format for external analysis
- **Responsive Design**: Access the dashboard from desktop or mobile devices
- **Dark Mode Support**: Toggle between light and dark themes for comfort

## Development

### Backend Architecture

- Express.js server with RESTful API endpoints
- SQLite database for data storage
- Sequelize ORM for database interactions
- MVC architecture for clean code organization

### Frontend Architecture

- React with functional components and hooks
- Context API for state management
- Chart.js for data visualization
- TailwindCSS for styling
- React Router for navigation

## License

This project is licensed under the MIT License.