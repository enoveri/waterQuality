#include <WiFi.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ================= WIFI and ThingSpeak =================
const char *ssid = "life3";
const char *password = "gggggggg";
const char *thingSpeakAPI = "6V62GMTWBLFLO879";
const char *thingSpeakHost = "api.thingspeak.com";
WiFiClient client;

// ================= DS18S20 Setup =================
#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);
float temperature = 0.0;
DeviceAddress tempDeviceAddress;  // Holds address of temperature sensor

// ================= pH and Turbidity Setup =================
#define PH_PIN 35
#define TURBIDITY_PIN 34
float pH = 0.0;
float turbidity = 0.0;

#define VREF 3.3
#define ADC_MAX 4095

// ================= Ultrasonic Sensor Setup =================
#define TRIG_PIN 12
#define ECHO_PIN 14
#define TANK_HEIGHT_CM 240.0
float waterLevel = 0.0;

// ================= LED Setup =================
#define TEMP_LED 26      // LED for temperature sensor
#define PH_LED 27        // LED for pH sensor
#define TURBIDITY_LED 25 // LED for turbidity sensor
#define WATER_LEVEL_LED 33 // LED for water level sensor

void setup() {
  Serial.begin(115200);

  // Initialize sensors
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

  connectWiFi();
}

void loop() {
  readTemperature();
  readAnalogSensors();
  readWaterLevel();
  sendDataToThingSpeak();
  delay(18000);  // 18-second delay to respect ThingSpeak rate limits
}

// ================== Sensor Functions ==================
void readTemperature() {
  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);

  if (tempC == -127.0) {
    Serial.println("⚠ Temperature sensor error: -127°C. Check wiring or pull-up resistor!");
    temperature = -127.0;  // Send this value to ThingSpeak for debug if needed
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

// ================== WiFi and ThingSpeak ==================
void connectWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Connected to WiFi!");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi connection failed! Restarting ESP...");
    ESP.restart();
  }
}

void sendDataToThingSpeak() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Turn on LEDs before attempting to send data
  if (temperature != -127.0) digitalWrite(TEMP_LED, HIGH); // Only if valid reading
  if (pH >= 0.0 && pH <= 14.0) digitalWrite(PH_LED, HIGH); // Only if valid reading
  if (turbidity >= 0.0) digitalWrite(TURBIDITY_LED, HIGH); // Only if valid reading
  if (waterLevel >= 0.0) digitalWrite(WATER_LEVEL_LED, HIGH); // Only if valid reading

  if (!client.connect(thingSpeakHost, 80)) {
    Serial.println("❌ Failed to connect to ThingSpeak!");
    // Turn off all LEDs on failure
    digitalWrite(TEMP_LED, LOW);
    digitalWrite(PH_LED, LOW);
    digitalWrite(TURBIDITY_LED, LOW);
    digitalWrite(WATER_LEVEL_LED, LOW);
    return;
  }

  String getRequest = "GET /update?api_key=" + String(thingSpeakAPI) +
                      "&field1=" + String(temperature) +
                      "&field2=" + String(pH) +
                      "&field3=" + String(turbidity) +
                      "&field4=" + String(waterLevel) +
                      " HTTP/1.1\r\n" +
                      "Host: " + String(thingSpeakHost) + "\r\n" +
                      "Connection: close\r\n\r\n";

  Serial.print("🌐 Sending Readings: ");
  Serial.println(getRequest);
  client.print(getRequest);

  // Wait for server response
  unsigned long timeout = millis();
  while (client.available() == 0) {
    if (millis() - timeout > 5000) {
      Serial.println("❌ ThingSpeak response timeout!");
      client.stop();
      // Turn off all LEDs on timeout
      digitalWrite(TEMP_LED, LOW);
      digitalWrite(PH_LED, LOW);
      digitalWrite(TURBIDITY_LED, LOW);
      digitalWrite(WATER_LEVEL_LED, LOW);
      return;
    }
  }

  // Read response
  bool success = false;
  while (client.available()) {
    String line = client.readStringUntil('\r');
    Serial.print(line);
    // Check for HTTP 200 OK or successful response
    if (line.indexOf("200 OK") > 0 || line.indexOf("0") == -1) {
      success = true;
    }
  }

  if (success) {
    Serial.println("\n✅ Data sent to ThingSpeak successfully!");
  } else {
    Serial.println("\n❌ Failed to send data to ThingSpeak!");
  }

  // Turn off LEDs after transmission
  digitalWrite(TEMP_LED, LOW);
  digitalWrite(PH_LED, LOW);
  digitalWrite(TURBIDITY_LED, LOW);
  digitalWrite(WATER_LEVEL_LED, LOW);

  client.stop();
  delay(150000); // Moved delay to ensure consistent timing
}
