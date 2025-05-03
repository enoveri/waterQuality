require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { testConnection, syncDatabase } = require("./config/database");
// Import models to ensure they are registered
const models = require("./models");
const waterQualityRoutes = require("./routes/waterQualityRoutes");
const alertRoutes = require("./routes/alertRoutes");
const thresholdRoutes = require("./routes/thresholdRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
// Remove eventsource package import as we'll use standard http

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server from Express app
const server = http.createServer(app);

// ESP32 configuration
const ESP32_IP = process.env.ESP32_IP || "192.168.4.1";
const ESP32_DATA_ENDPOINT = `http://${ESP32_IP}/events`;
console.log(`ESP32 IP configured as: ${ESP32_IP}`);
console.log(`ESP32 SSE endpoint: ${ESP32_DATA_ENDPOINT}`);

// Enable mock data when ESP32 is unreachable
const USE_FALLBACK = process.env.USE_FALLBACK === "true" || false;
console.log(`Fallback mode ${USE_FALLBACK ? "enabled" : "disabled"}`);

// Constants for connection state
const CONNECTING = 0;
const OPEN = 1;
const CLOSED = 2;

// Store the latest data from ESP32
let latestESP32Data = {
  temperature: 0,
  pH: 0,
  turbidity: 0,
  waterLevel: 0,
  timestamp: new Date().toISOString(),
};

// Connected clients for SSE
const clients = new Set();

// Connection state management
let connectionState = CLOSED;
let httpRequest = null;
let reconnectTimeout = null;
let reconnectAttempts = 0;
let heartbeatTimer = null;
let lastMessageTime = 0;
let dataBuffer = "";

// Mock data generation
let mockDataInterval = null;

function startMockDataGeneration() {
  // Clear any existing mock data interval
  if (mockDataInterval) {
    clearInterval(mockDataInterval);
  }

  console.log("Starting mock data generation");

  // Generate mock data immediately
  generateMockData();

  // Then generate at regular intervals (every 2 seconds to match ESP32)
  mockDataInterval = setInterval(generateMockData, 2000);
}

function stopMockDataGeneration() {
  if (mockDataInterval) {
    clearInterval(mockDataInterval);
    mockDataInterval = null;
    console.log("Stopped mock data generation");
  }
}

function generateMockData() {
  // Generate realistic but random sensor data
  const mockData = {
    temperature: (20 + Math.random() * 10).toFixed(2) * 1, // 20-30°C
    pH: (6.5 + Math.random() * 1.5).toFixed(2) * 1, // 6.5-8.0 pH
    turbidity: (Math.random() * 5).toFixed(2) * 1, // 0-5 NTU
    waterLevel: (30 + Math.random() * 20).toFixed(1) * 1, // 30-50 cm
    timestamp: new Date().toISOString(),
  };

  // Update latest data
  latestESP32Data = mockData;

  // Broadcast to clients
  broadcastToClients({
    ...mockData,
    _isMock: true, // Add flag to indicate this is mock data
  });

  console.log("Generated mock data:", mockData);
}

// Connect to ESP32 using standard HTTP client
function connectToESP32() {
  console.log(`Connecting to ESP32 at ${ESP32_DATA_ENDPOINT}`);

  // Stop any mock data generation if it's running
  stopMockDataGeneration();

  // Clean up existing connection if any
  if (httpRequest && httpRequest.destroy) {
    console.log("Closing existing connection");
    httpRequest.destroy();
    httpRequest = null;
  }

  // Clear any pending reconnect
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Clear heartbeat timer
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  // If fallback mode is enabled from the start, just use mock data
  if (USE_FALLBACK) {
    console.log(
      "Fallback mode enabled, using mock data without attempting ESP32 connection"
    );
    connectionState = CLOSED;
    startMockDataGeneration();
    return;
  }

  connectionState = CONNECTING;
  dataBuffer = "";

  try {
    // Create HTTP request to ESP32 events endpoint
    console.log("Creating HTTP connection to ESP32");

    const options = {
      timeout: 30000, // Longer timeout for initial connection
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
        "User-Agent": "Node.js SSE Client",
      },
    };

    httpRequest = http.get(ESP32_DATA_ENDPOINT, options, (response) => {
      console.log(`Connected to ESP32, status: ${response.statusCode}`);

      if (response.statusCode !== 200) {
        console.error(
          `Error connecting to ESP32: HTTP status ${response.statusCode}`
        );
        handleConnectionError(new Error(`HTTP status ${response.statusCode}`));
        return;
      }

      // Check if we got the correct content type for SSE
      const contentType = response.headers["content-type"];
      if (!contentType || !contentType.includes("text/event-stream")) {
        console.warn(
          `Unexpected content type: ${contentType}, expected text/event-stream`
        );
      }

      // Connection established successfully
      connectionState = OPEN;
      reconnectAttempts = 0;
      lastMessageTime = Date.now();
      broadcastConnectionStatus(true);

      // Start heartbeat to detect stalled connections
      heartbeatTimer = setInterval(() => {
        const now = Date.now();
        // If no message received in 15 seconds, consider connection stalled
        if (now - lastMessageTime > 15000) {
          console.warn(
            "Connection appears stalled - no messages for 15 seconds"
          );
          broadcastConnectionStatus(
            false,
            "Connection to ESP32 stalled. Reconnecting..."
          );

          handleConnectionError(new Error("Connection stalled"));
        }
      }, 5000); // Check every 5 seconds

      // Process incoming data
      response.on("data", (chunk) => {
        // Update last message time
        lastMessageTime = Date.now();

        // Process chunk
        const chunkData = chunk.toString();
        // console.log('Received chunk:', chunkData);
        dataBuffer += chunkData;

        // Process any complete SSE messages
        processSSEMessages();
      });

      response.on("end", () => {
        console.log("ESP32 connection ended");
        handleConnectionError(new Error("Connection ended"));
      });
    });

    httpRequest.on("error", (error) => {
      console.error("ESP32 connection error:", error.message);
      handleConnectionError(error);
    });

    httpRequest.on("timeout", () => {
      console.error("ESP32 connection timeout");
      httpRequest.destroy();
      handleConnectionError(new Error("Connection timeout"));
    });
  } catch (error) {
    console.error("Failed to create connection to ESP32:", error);
    console.error(error.stack);
    handleConnectionError(error);
  }
}

// Process complete SSE messages from the data buffer
function processSSEMessages() {
  // SSE messages are separated by double newlines
  const messages = dataBuffer.split("\n\n");

  // If the last part doesn't end with a double newline, it's incomplete
  if (dataBuffer.endsWith("\n\n")) {
    dataBuffer = "";
  } else {
    // Keep the last incomplete message in the buffer
    dataBuffer = messages.pop() || "";
  }

  // Process complete messages
  messages.forEach((message) => {
    if (!message.trim()) return;

    // console.log('Processing message:', message);

    // Extract the data part (typically starts with "data: ")
    const dataMatch = message.match(/^data: (.+)$/m);
    if (!dataMatch) {
      console.warn("Received SSE message without data:", message);
      return;
    }

    try {
      const data = JSON.parse(dataMatch[1]);
      latestESP32Data = {
        ...data,
        timestamp: new Date().toISOString(),
      };

      // console.log('Parsed data:', latestESP32Data);

      // Broadcast to all connected clients
      broadcastToClients(latestESP32Data);
    } catch (error) {
      console.error("Error parsing ESP32 data:", error);
    }
  });
}

// Handle connection errors and schedule reconnection
function handleConnectionError(error) {
  console.error(
    "ESP32 SSE connection error:",
    error.message || "Unknown error"
  );
  broadcastConnectionStatus(
    false,
    `Connection to ESP32 lost: ${
      error.message || "Unknown error"
    }. Reconnecting...`
  );

  // Close the connection
  if (httpRequest && httpRequest.destroy) {
    httpRequest.destroy();
    httpRequest = null;
  }

  // Clear heartbeat timer
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  connectionState = CLOSED;

  // If fallback is enabled, start generating mock data
  if (USE_FALLBACK && reconnectAttempts >= 1) {
    console.log(
      "Using fallback/mock data mode after failed connection attempt"
    );
    startMockDataGeneration();
    return;
  }

  // Schedule reconnect with exponential backoff
  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30s

  console.log(
    `Reconnecting to ESP32 in ${delay}ms (attempt ${reconnectAttempts})`
  );
  reconnectTimeout = setTimeout(connectToESP32, delay);
}

// Broadcast data to all connected clients
function broadcastToClients(data) {
  const clientCount = clients.size;
  if (clientCount > 0) {
    clients.forEach((client) => {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
    console.log(`Data broadcast to ${clientCount} clients`);
  }
}

// Broadcast connection status to all clients
function broadcastConnectionStatus(isConnected, errorMessage = null) {
  const status = {
    type: "connection_status",
    isConnected,
    error: errorMessage,
    timestamp: new Date().toISOString(),
  };

  clients.forEach((client) => {
    client.write(`data: ${JSON.stringify(status)}\n\n`);
  });
}

// Create database directory if it doesn't exist
const dbDir = path.dirname(process.env.DB_PATH || "database/database.sqlite");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Configure CORS for different environments
const corsOptions = {
  origin: function (origin, callback) {
    // In development, allow all origins
    if (process.env.NODE_ENV !== "production") {
      callback(null, true);
      return;
    }

    // In production, only allow specific origins
    const allowedOrigins = [
      "https://water-quality-frontend.vercel.app", // Default Vercel domain
      "https://water-quality-monitor.vercel.app", // Another possible Vercel domain
      "https://waterquality.vercel.app", // Shorter variant
      "https://water-quality-monitor-app.vercel.app", // With app suffix
      "https://waterqualitymonitor.vercel.app", // No dashes variant
      "https://waterquality-frontend.vercel.app", // Another variant
      ".vercel.app", // Allow any Vercel subdomain
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check if the origin exactly matches one of our allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
      return;
    }

    // Check if origin ends with .vercel.app
    if (origin.endsWith(".vercel.app")) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  optionsSuccessStatus: 204,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));

// API Routes
app.use("/api/data", waterQualityRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/thresholds", thresholdRoutes);
app.use("/api/devices", deviceRoutes);

// SSE endpoint for clients to receive real-time updates
app.get("/api/live-data", (req, res) => {
  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Handle CORS for SSE endpoint
  const origin = req.headers.origin;
  if (process.env.NODE_ENV === "production") {
    // Allow any Vercel domain or direct requests
    if (!origin || origin.endsWith(".vercel.app")) {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
    }
  } else {
    // In development, allow all origins
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  // Send initial data immediately
  const initialData = {
    ...latestESP32Data,
    type: "initial",
    isConnected: connectionState === OPEN,
  };

  res.write(`data: ${JSON.stringify(initialData)}\n\n`);

  // Add this client to the set of connected clients
  clients.add(res);
  console.log(`Client connected to SSE. Total clients: ${clients.size}`);

  // Handle client disconnect
  req.on("close", () => {
    clients.delete(res);
    console.log(
      `Client disconnected from SSE. Remaining clients: ${clients.size}`
    );
  });
});

// Endpoint to manually reconnect to ESP32
app.post("/api/reconnect-esp32", (req, res) => {
  // Stop any mock data generation
  stopMockDataGeneration();

  reconnectAttempts = 0;

  // Force connection attempt even in fallback mode
  if (USE_FALLBACK) {
    console.log(
      "Manual reconnection requested - attempting real connection despite fallback mode"
    );
  }

  connectToESP32();
  res.json({ success: true, message: "Reconnection to ESP32 initiated" });
});

// Health check route with enhanced diagnostics
app.get("/health", async (req, res) => {
  try {
    // Test database connection
    let dbStatus = "unknown";
    try {
      await sequelize.authenticate();
      dbStatus = "connected";
    } catch (error) {
      dbStatus = `error: ${error.message}`;
    }

    // Get counts of records in database
    let dataCount = 0;
    let alertCount = 0;
    let deviceCount = 0;

    try {
      dataCount = await WaterQualityData.count();
      alertCount = await Alert.count();
      deviceCount = await Device.count();
    } catch (error) {
      console.error("Error getting record counts:", error);
    }

    res.status(200).json({
      status: "ok",
      message: "Server is running",
      esp32_connection: {
        status: connectionState === OPEN ? "connected" : "disconnected",
        mode: USE_FALLBACK ? "fallback/mock" : "direct",
        reconnectAttempts,
      },
      database: {
        status: dbStatus,
        counts: {
          data: dataCount,
          alerts: alertCount,
          devices: deviceCount,
        },
        path: process.env.DB_PATH || "default_path",
      },
      server: {
        uptime: Math.floor(process.uptime()),
        env: process.env.NODE_ENV || "development",
        memory: process.memoryUsage().rss / (1024 * 1024) + " MB",
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: `Health check failed: ${error.message}`,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "An unexpected error occurred",
    error: process.env.NODE_ENV === "production" ? null : err.message,
  });
});

// Start the server after testing database connection
const startServer = async () => {
  try {
    console.log("Starting server initialization...");

    // Run startup health checks in production
    if (process.env.NODE_ENV === "production") {
      const { runStartupChecks } = require("./utils/startupCheck");
      await runStartupChecks();
    }

    // Test database connection
    console.log("Testing database connection...");
    const connected = await testConnection();

    if (connected) {
      console.log("Database connection successful");
      // Sync models with database (create tables if they don't exist)
      console.log("Syncing database models...");
      await syncDatabase();
      console.log("Database models synced successfully");

      // Initialize the database with sample data if running on free tier
      if (process.env.INIT_DB_ON_START === "true") {
        console.log("Initializing database with sample data...");
        try {
          // Check if we have any existing data
          const WaterQualityData = require("./models/WaterQualityData");
          const count = await WaterQualityData.count();

          if (count === 0) {
            console.log("No data found in database, creating sample data...");
            // Import initialization function directly
            const {
              setupDevice,
              setupThresholds,
              generateSampleData,
              generateSampleAlerts,
            } = require("./utils/initDatabase");

            // Initialize with minimal data for free tier
            await setupDevice();
            await setupThresholds();
            await generateSampleData(2, 6); // Just 2 days with 6 readings per day
            await generateSampleAlerts(10); // Only 10 sample alerts
            console.log("Sample data created successfully");
          } else {
            console.log(
              `Database already contains ${count} records, skipping initialization`
            );
          }
        } catch (error) {
          console.error("Error initializing database with sample data:", error);
          // Continue anyway, not critical for operation
        }
      }

      // Start server after DB connection is successful
      server.listen(PORT, () => {
        console.log(`======================================`);
        console.log(`Server running on port ${PORT}`);
        console.log(`API available at http://localhost:${PORT}/api`);
        console.log(
          `Live data stream available at http://localhost:${PORT}/api/live-data`
        );
        console.log(`======================================`);

        // Connect to ESP32
        console.log("Initiating connection to ESP32...");
        connectToESP32();
      });
    } else {
      console.error("Failed to connect to the database. Server not started.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

startServer();

// Gracefully handle shutdown
process.on("SIGINT", () => {
  console.log("Server shutting down...");

  // Close ESP32 connection
  if (httpRequest && httpRequest.destroy) {
    httpRequest.destroy();
    httpRequest = null;
  }

  // Clear any pending timers
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  // Stop mock data generation
  stopMockDataGeneration();

  // Set connection state
  connectionState = CLOSED;

  // Close HTTP server
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  // Do not crash the server, just log the error
});

module.exports = app; // For testing purposes
