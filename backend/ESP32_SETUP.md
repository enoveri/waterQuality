# ESP32 Database Integration Guide

This guide outlines the steps to connect your ESP32 directly to the database or through the backend API.

## Option 1: ESP32 to Backend API (Recommended)

In this approach, the ESP32 sends data directly to the backend API, which then stores it in the database.

### ESP32 Arduino Code

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YourWiFiName";
const char* password = "YourWiFiPassword";

// Backend API endpoint
const char* serverUrl = "http://your-server-ip:5000/api/v1/water-quality/data";

// Sensor pins
const int temperaturePin = 36;  // Example GPIO pin
const int pHPin = 39;           // Example GPIO pin
const int turbidityPin = 34;    // Example GPIO pin
const int waterLevelPin = 35;   // Example GPIO pin

// Device identifier
const char* deviceId = "esp32-main";

// Data collection interval (milliseconds)
const unsigned long dataInterval = 10000;  // 10 seconds
unsigned long lastDataTime = 0;

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // Initialize sensor pins
  pinMode(temperaturePin, INPUT);
  pinMode(pHPin, INPUT);
  pinMode(turbidityPin, INPUT);
  pinMode(waterLevelPin, INPUT);
}

void loop() {
  unsigned long currentTime = millis();
  
  // Check if it's time to collect and send data
  if (currentTime - lastDataTime >= dataInterval) {
    lastDataTime = currentTime;
    
    // Read sensor data
    float temperature = readTemperature();
    float pH = readPH();
    float turbidity = readTurbidity();
    float waterLevel = readWaterLevel();
    
    // Send data to backend
    sendDataToBackend(temperature, pH, turbidity, waterLevel);
  }
}

float readTemperature() {
  // Read analog value and convert to temperature
  int rawValue = analogRead(temperaturePin);
  // Example conversion - replace with your sensor's formula
  float voltage = rawValue * (3.3 / 4095.0);
  float temperature = voltage * 100; // LM35 formula (adjust for your sensor)
  return temperature;
}

float readPH() {
  // Read analog value and convert to pH
  int rawValue = analogRead(pHPin);
  // Example conversion - replace with your sensor's formula
  float voltage = rawValue * (3.3 / 4095.0);
  float pH = 3.5 * voltage; // Example formula (adjust for your sensor)
  return pH;
}

float readTurbidity() {
  // Read analog value and convert to turbidity
  int rawValue = analogRead(turbidityPin);
  // Example conversion - replace with your sensor's formula
  float voltage = rawValue * (3.3 / 4095.0);
  float turbidity = voltage * 5; // Example formula (adjust for your sensor)
  return turbidity;
}

float readWaterLevel() {
  // Read analog value and convert to water level
  int rawValue = analogRead(waterLevelPin);
  // Example conversion - replace with your sensor's formula
  float voltage = rawValue * (3.3 / 4095.0);
  float waterLevel = voltage * 30; // Example formula (adjust for your sensor)
  return waterLevel;
}

void sendDataToBackend(float temperature, float pH, float turbidity, float waterLevel) {
  // Check WiFi connection
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // Configure endpoint
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON document
    StaticJsonDocument<256> doc;
    doc["temperature"] = temperature;
    doc["pH"] = pH;
    doc["turbidity"] = turbidity;
    doc["waterLevel"] = waterLevel;
    doc["deviceId"] = deviceId;
    
    // Serialize JSON to string
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Send POST request
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
      Serial.println(response);
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("WiFi Disconnected, attempting to reconnect...");
    WiFi.reconnect();
  }
}
```

## Option 2: ESP32 to Event Server (Current Approach with Database Storage)

In this approach, the ESP32 continues sending data via Server-Sent Events (SSE), but the frontend saves the data to the database.

### ESP32 Arduino Code for SSE

```cpp
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>

// WiFi Access Point settings
const char* ssid = "ESP32-WaterQuality";
const char* password = "waterquality123";

// Create AsyncWebServer object on port 80
AsyncWebServer server(80);
AsyncEventSource events("/events");

// Sensor pins
const int temperaturePin = 36;  // Example GPIO pin
const int pHPin = 39;           // Example GPIO pin
const int turbidityPin = 34;    // Example GPIO pin
const int waterLevelPin = 35;   // Example GPIO pin

// Data collection interval (milliseconds)
const unsigned long dataInterval = 1000;  // 1 second
unsigned long lastDataTime = 0;

void setup() {
  Serial.begin(115200);
  
  // Set up Access Point
  WiFi.softAP(ssid, password);
  
  Serial.println("Access Point Started");
  Serial.print("IP Address: ");
  Serial.println(WiFi.softAPIP());

  // Initialize sensor pins
  pinMode(temperaturePin, INPUT);
  pinMode(pHPin, INPUT);
  pinMode(turbidityPin, INPUT);
  pinMode(waterLevelPin, INPUT);
  
  // CORS setup for the web client
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, PUT");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type");
  
  // Route for event source
  server.addHandler(&events);
  
  // Route for root / web page
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "text/plain", "ESP32 Water Quality Monitor");
  });

  // Start server
  server.begin();
}

void loop() {
  unsigned long currentTime = millis();
  
  // Check if it's time to collect and send data
  if (currentTime - lastDataTime >= dataInterval) {
    lastDataTime = currentTime;
    
    // Read sensor data
    float temperature = readTemperature();
    float pH = readPH();
    float turbidity = readTurbidity();
    float waterLevel = readWaterLevel();
    
    // Create JSON document
    StaticJsonDocument<256> doc;
    doc["temperature"] = temperature;
    doc["pH"] = pH;
    doc["turbidity"] = turbidity;
    doc["waterLevel"] = waterLevel;
    
    // Serialize JSON to string
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Send event
    events.send(jsonString.c_str(), "water_data", millis());
    
    // Print to serial for debugging
    Serial.println(jsonString);
  }
}

// Sensor reading functions as in the previous example
float readTemperature() {
  int rawValue = analogRead(temperaturePin);
  float voltage = rawValue * (3.3 / 4095.0);
  float temperature = voltage * 100;
  return temperature;
}

float readPH() {
  int rawValue = analogRead(pHPin);
  float voltage = rawValue * (3.3 / 4095.0);
  float pH = 3.5 * voltage;
  return pH;
}

float readTurbidity() {
  int rawValue = analogRead(turbidityPin);
  float voltage = rawValue * (3.3 / 4095.0);
  float turbidity = voltage * 5;
  return turbidity;
}

float readWaterLevel() {
  int rawValue = analogRead(waterLevelPin);
  float voltage = rawValue * (3.3 / 4095.0);
  float waterLevel = voltage * 30;
  return waterLevel;
}
```

## Setup Instructions

1. Install the required libraries in Arduino IDE:
   - For Option 1: `ArduinoJson`, `HTTPClient`, `WiFi`
   - For Option 2: `ArduinoJson`, `AsyncTCP`, `ESPAsyncWebServer`, `WiFi`

2. Modify the code with your WiFi credentials and sensor calibration formulas.

3. Upload the code to your ESP32.

4. For Option 1, ensure your backend server is running and accessible from the ESP32's network.

5. For Option 2, connect to the ESP32's WiFi access point "ESP32-WaterQuality" with password "waterquality123".

## Troubleshooting

- If the ESP32 cannot connect to WiFi (Option 1), check your credentials and network visibility.
- If data isn't being received by the backend, check your server's IP address and ensure ports are open.
- For sensor issues, verify wiring connections and calibration formulas.

## Advanced Configuration

- Add MQTT support for more reliable communication
- Implement deep sleep for battery optimization
- Add OTA (Over-The-Air) updates for remote firmware updates 