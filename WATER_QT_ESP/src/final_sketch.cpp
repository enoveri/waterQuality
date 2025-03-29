// IOT SMART WATER QUALITY MONITORING SYSTEM - ESP32 WEB SERVER
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>

// Access Point settings
const char* apSSID = "WaterQualityMonitor";
const char* apPassword = "water123"; // At least 8 characters for WPA2

// Web server on port 80
WebServer server(80);

// Sensor values received from Arduino
float temperature = 0.0;
float pH = 0.0;
float turbidity = 0.0;
float waterLevel = 0.0;

// Demo mode settings
bool demoMode = true;  // Set to true to enable demo mode
unsigned long lastDemoUpdate = 0;
const long demoInterval = 5000;  // Update demo data every 5 seconds

// Add at the top with other globals
#define MAX_CLIENTS 5
WiFiClient clients[MAX_CLIENTS];
bool isSSEClient[MAX_CLIENTS] = {false};

// Function declarations (prototypes)
void setupAccessPoint();
void setupWebServer();
void handleRoot();
void handleGetData();
void handleEvents();  // New function for SSE
void parseData(String data);
void generateDemoData();
void sendEventData();  // New function to send updates to SSE clients

void setup() {
  Serial.begin(115200);
  setupAccessPoint();
  setupWebServer();
  Serial.println("ESP32 Water Quality Monitor ready!");
  
  if (demoMode) {
    Serial.println("DEMO MODE ENABLED - Generating simulated data");
    generateDemoData();  // Initialize with some data immediately
  }
}

void loop() {
  // Handle client requests
  server.handleClient();
  
  // Process data from Arduino (when not in demo mode)
  if (!demoMode && Serial.available() > 0) {
    String data = Serial.readStringUntil('\n');
    parseData(data);
    sendEventData();  // Send update to connected clients
  }
  
  // In demo mode, periodically update the simulated data
  if (demoMode && (millis() - lastDemoUpdate > demoInterval)) {
    generateDemoData();
    sendEventData();  // Send update to connected clients
    lastDemoUpdate = millis();
  }
}

void setupAccessPoint() {
  Serial.println("Setting up Access Point...");
  
  // Configure AP mode
  WiFi.mode(WIFI_AP);
  
  // Start the access point
  if(WiFi.softAP(apSSID, apPassword)) {
    Serial.println("Access Point started successfully");
    Serial.print("SSID: ");
    Serial.println(apSSID);
    Serial.print("Password: ");
    Serial.println(apPassword);
    Serial.print("AP IP address: ");
    Serial.println(WiFi.softAPIP());
  } else {
    Serial.println("Failed to start Access Point!");
    ESP.restart();
  }
}

void setupWebServer() {
  // Define API endpoints
  server.on("/", HTTP_GET, handleRoot);
  server.on("/data", HTTP_GET, handleGetData);
  server.on("/events", HTTP_GET, handleEvents);  // New endpoint for SSE
  
  // Start the server
  server.begin();
  Serial.println("Web server started");
}

void handleRoot() {
  String html = "<html><head><title>Water Quality Monitor</title>";
  html += "<style>body{font-family:Arial;margin:20px;} .data{margin:10px 0;padding:10px;background:#f0f0f0;}</style>";
  html += "<script>";
  html += "const eventSource = new EventSource('/events');";
  html += "eventSource.onmessage = function(event) {";
  html += "  const data = JSON.parse(event.data);";
  html += "  document.getElementById('temperature').textContent = data.temperature + ' °C';";
  html += "  document.getElementById('pH').textContent = data.pH;";
  html += "  document.getElementById('turbidity').textContent = data.turbidity + ' %';";
  html += "  document.getElementById('waterLevel').textContent = data.waterLevel + ' cm';";
  html += "  document.getElementById('lastUpdate').textContent = 'Last updated: ' + new Date().toLocaleTimeString();";
  html += "};";
  html += "</script></head><body>";
  html += "<h1>Water Quality Monitoring System</h1>";
  html += "<div class='data'><h2>Current Readings:</h2>";
  html += "<p>Temperature: <span id='temperature'>" + String(temperature) + " °C</span></p>";
  html += "<p>pH Level: <span id='pH'>" + String(pH) + "</span></p>";
  html += "<p>Turbidity: <span id='turbidity'>" + String(turbidity) + " %</span></p>";
  html += "<p>Water Level: <span id='waterLevel'>" + String(waterLevel) + " cm</span></p>";
  html += "</div>";
  html += "<p id='lastUpdate'>Last updated: Just now</p>";
  html += "<p><a href='/data'>View Raw JSON Data</a></p>";
  html += "</body></html>";
  
  server.send(200, "text/html", html);
}

void handleGetData() {
  // Create JSON formatted data
  String jsonData = "{\"temperature\":" + String(temperature) + 
                    ",\"pH\":" + String(pH) + 
                    ",\"turbidity\":" + String(turbidity) + 
                    ",\"waterLevel\":" + String(waterLevel) + "}";
  
  server.send(200, "application/json", jsonData);
}

void handleEvents() {
  WiFiClient client = server.client();
  
  // Find an empty slot for the new client
  int clientIndex = -1;
  for (int i = 0; i < MAX_CLIENTS; i++) {
    if (!clients[i] || !clients[i].connected()) {
      clientIndex = i;
      clients[i] = client;
      isSSEClient[i] = true;
      break;
    }
  }
  
  if (clientIndex == -1) {
    // No space for new client
    client.stop();
    return;
  }

  // Send SSE headers
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: text/event-stream");
  client.println("Cache-Control: no-cache");
  client.println("Connection: keep-alive");
  client.println("Access-Control-Allow-Origin: *");
  client.println();
  
  // Send initial data
  String jsonData = "data: {\"temperature\":" + String(temperature) + 
                   ",\"pH\":" + String(pH) + 
                   ",\"turbidity\":" + String(turbidity) + 
                   ",\"waterLevel\":" + String(waterLevel) + "}\n\n";
  client.print(jsonData);
}

void parseData(String data) {
  // Expected format: "temperature,pH,turbidity,waterLevel"
  int firstComma = data.indexOf(',');
  int secondComma = data.indexOf(',', firstComma + 1);
  int thirdComma = data.indexOf(',', secondComma + 1);

  if (firstComma == -1 || secondComma == -1 || thirdComma == -1) {
    Serial.println("Invalid data format received");
    return;
  }

  temperature = data.substring(0, firstComma).toFloat();
  pH = data.substring(firstComma + 1, secondComma).toFloat();
  turbidity = data.substring(secondComma + 1, thirdComma).toFloat();
  waterLevel = data.substring(thirdComma + 1).toFloat();

  Serial.print("Received data: Temp="); Serial.print(temperature);
  Serial.print(", pH="); Serial.print(pH);
  Serial.print(", Turbidity="); Serial.print(turbidity);
  Serial.print(", Level="); Serial.println(waterLevel);
}

void generateDemoData() {
  // Generate realistic but random values for testing
  temperature = random(2000, 3500) / 100.0;  // 20.00 to 35.00 °C
  pH = random(650, 850) / 100.0;            // 6.50 to 8.50 pH
  turbidity = random(0, 100);               // 0 to 100%
  waterLevel = random(5, 50);               // 5 to 50 cm
  
  Serial.println("Generated demo data:");
  Serial.print("Temperature: "); Serial.print(temperature); Serial.println(" °C");
  Serial.print("pH: "); Serial.println(pH);
  Serial.print("Turbidity: "); Serial.print(turbidity); Serial.println("%");
  Serial.print("Water Level: "); Serial.print(waterLevel); Serial.println(" cm");
}

// New function to send updates to SSE clients
void sendEventData() {
  String jsonData = "data: {\"temperature\":" + String(temperature) + 
                   ",\"pH\":" + String(pH) + 
                   ",\"turbidity\":" + String(turbidity) + 
                   ",\"waterLevel\":" + String(waterLevel) + "}\n\n";
  
  // Send to all connected SSE clients
  for (int i = 0; i < MAX_CLIENTS; i++) {
    if (clients[i] && clients[i].connected() && isSSEClient[i]) {
      clients[i].print(jsonData);
    } else {
      // Clean up disconnected clients
      if (isSSEClient[i]) {
        clients[i].stop();
        isSSEClient[i] = false;
      }
    }
  }
}