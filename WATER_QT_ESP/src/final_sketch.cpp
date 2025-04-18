// IOT SMART WATER QUALITY MONITORING SYSTEM - ESP32 WEB SERVER
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// Access Point settings
const char* apSSID = "WaterQualityMonitor";
const char* apPassword = "water123"; // At least 8 characters for WPA2

// Web server on port 80
WebServer server(80);

// ================= Sensor Variables =================
// Temperature sensor
#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);
DeviceAddress tempDeviceAddress;  // Holds address of temperature sensor

// pH and Turbidity Setup
#define PH_PIN 35
#define TURBIDITY_PIN 34
#define VREF 3.3
#define ADC_MAX 4095

// Ultrasonic Sensor Setup
#define TRIG_PIN 12
#define ECHO_PIN 14
#define TANK_HEIGHT_CM 240.0

// LED Setup
#define TEMP_LED 26      // LED for temperature sensor
#define PH_LED 27        // LED for pH sensor
#define TURBIDITY_LED 25 // LED for turbidity sensor
#define WATER_LEVEL_LED 33 // LED for water level sensor

// Sensor values
float temperature = 0.0;
float pH = 0.0;
float turbidity = 0.0;
float waterLevel = 0.0;

// Demo mode settings
bool demoMode = false;  // Changed to false since we'll use real sensors
unsigned long lastDemoUpdate = 0;
const long demoInterval = 5000;  // Update demo data every 5 seconds

// Add at the top with other globals
#define MAX_CLIENTS 5
WiFiClient clients[MAX_CLIENTS];
bool isSSEClient[MAX_CLIENTS] = {false};

// Function declarations (prototypes)
void setupAccessPoint();
void setupWebServer();
void setupSensors();
void handleRoot();
void handleGetData();
void handleEvents();
void parseData(String data);
void generateDemoData();
void sendEventData();
void readSensors();
void readTemperature();
void readAnalogSensors();
void readWaterLevel();

void setup() {
  Serial.begin(115200);
  setupSensors();
  setupAccessPoint();
  setupWebServer();
  Serial.println("ESP32 Water Quality Monitor ready!");
  
  if (demoMode) {
    Serial.println("DEMO MODE ENABLED - Generating simulated data");
    generateDemoData();  // Initialize with some data immediately
  } else {
    // Get initial sensor readings
    readSensors();
  }
}

void loop() {
  // Handle client requests
  server.handleClient();
  
  if (!demoMode) {
    // Read from actual sensors
    readSensors();
    sendEventData();  // Send update to connected clients
    delay(5000);  // Take readings every 5 seconds
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

void setupSensors() {
  // Initialize temperature sensor
  tempSensor.begin();
  if (tempSensor.getAddress(tempDeviceAddress, 0)) {
    Serial.print("DS18S20 Sensor found at address: ");
    for (uint8_t i = 0; i < 8; i++) {
      Serial.print(tempDeviceAddress[i], HEX);
      if (i < 7) Serial.print(":");
    }
    Serial.println();
  } else {
    Serial.println("❌ No DS18x20 sensor found. Please check wiring!");
  }

  // Initialize sensor pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);

  // Initialize LED pins
  pinMode(TEMP_LED, OUTPUT);
  pinMode(PH_LED, OUTPUT);
  pinMode(TURBIDITY_LED, OUTPUT);
  pinMode(WATER_LEVEL_LED, OUTPUT);

  // Turn off all LEDs initially
  digitalWrite(TEMP_LED, LOW);
  digitalWrite(PH_LED, LOW);
  digitalWrite(TURBIDITY_LED, LOW);
  digitalWrite(WATER_LEVEL_LED, LOW);
}

void readSensors() {
  // Turn on LEDs during reading
  digitalWrite(TEMP_LED, HIGH);
  digitalWrite(PH_LED, HIGH);
  digitalWrite(TURBIDITY_LED, HIGH);
  digitalWrite(WATER_LEVEL_LED, HIGH);
  
  // Read from all sensors
  readTemperature();
  readAnalogSensors();
  readWaterLevel();
  
  // Turn off LEDs after reading
  digitalWrite(TEMP_LED, LOW);
  digitalWrite(PH_LED, LOW);
  digitalWrite(TURBIDITY_LED, LOW);
  digitalWrite(WATER_LEVEL_LED, LOW);
}

void readTemperature() {
  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);

  if (tempC == -127.0) {
    Serial.println("⚠ Temperature sensor error: -127°C. Check wiring or pull-up resistor!");
    temperature = -127.0;
  } else {
    temperature = tempC;
    Serial.printf("🌡 Temperature: %.2f °C\n", temperature);
  }
}

void readAnalogSensors() {
  int rawPH = analogRead(PH_PIN);
  int rawTurbidity = analogRead(TURBIDITY_PIN);

  float voltagePH = rawPH * (VREF / ADC_MAX);
  float voltageTurbidity = rawTurbidity * (VREF / ADC_MAX);
  Serial.printf("Turbidity Voltage: %.3f V\n", voltageTurbidity);

  pH = 7 + ((2.5 - voltagePH) / 0.18);  // Example formula
  pH = constrain(pH, 0.0, 14.0);

  turbidity = -1120.4 * sq(voltageTurbidity) + 5742.3 * voltageTurbidity - 4352.9;
  if (turbidity < 0.0) turbidity = 0.0;

  Serial.printf("pH: %.2f | Turbidity: %.2f NTU\n", pH, turbidity);
}

void readWaterLevel() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  float distance = duration * 0.0343 / 2.0;

  if (distance <= 0 || distance >= TANK_HEIGHT_CM) {
    Serial.println("🛑 Ultrasonic read error");
    waterLevel = -1;
    return;
  }

  waterLevel = TANK_HEIGHT_CM - distance;
  Serial.printf("Water Level: %.2f cm\n", waterLevel);
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
  html += "  document.getElementById('turbidity').textContent = data.turbidity + ' NTU';"; // Changed from % to NTU
  html += "  document.getElementById('waterLevel').textContent = data.waterLevel + ' cm';";
  html += "  document.getElementById('lastUpdate').textContent = 'Last updated: ' + new Date().toLocaleTimeString();";
  html += "};";
  html += "</script></head><body>";
  html += "<h1>Water Quality Monitoring System</h1>";
  html += "<div class='data'><h2>Current Readings:</h2>";
  html += "<p>Temperature: <span id='temperature'>" + String(temperature) + " °C</span></p>";
  html += "<p>pH Level: <span id='pH'>" + String(pH) + "</span></p>";
  html += "<p>Turbidity: <span id='turbidity'>" + String(turbidity) + " NTU</span></p>"; // Changed from % to NTU
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
  turbidity = random(0, 100);               // 0 to 100 NTU
  waterLevel = random(5, 50);               // 5 to 50 cm
  
  Serial.println("Generated demo data:");
  Serial.print("Temperature: "); Serial.print(temperature); Serial.println(" °C");
  Serial.print("pH: "); Serial.println(pH);
  Serial.print("Turbidity: "); Serial.print(turbidity); Serial.println(" NTU");
  Serial.print("Water Level: "); Serial.print(waterLevel); Serial.println(" cm");
}

// Function to send updates to SSE clients
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