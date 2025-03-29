// Constants for connecting to ESP32
const ESP32_IP = '192.168.4.1'; // Default IP when ESP32 is in AP mode

// DOM Elements
let temperatureElement;
let phElement;
let turbidityElement;
let waterLevelElement;
let statusElement;
let chartElement;

// Chart configuration (keeping for later)
let chart;
const maxDataPoints = 50; // Maximum number of data points to show
let dataPoints = {
    temperature: [],
    ph: [],
    turbidity: [],
    waterLevel: []
};

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    temperatureElement = document.getElementById('temperature');
    phElement = document.getElementById('ph');
    turbidityElement = document.getElementById('turbidity');
    waterLevelElement = document.getElementById('waterLevel');
    statusElement = document.getElementById('connection-status');
    chartElement = document.getElementById('chart');

    // Commenting out chart setup for now
    // setupChart();
    
    // Connect to ESP32 SSE
    connectToESP32();
});

function connectToESP32() {
    statusElement.textContent = 'Connecting...';
    statusElement.className = 'connecting';

    const eventSource = new EventSource(`http://${ESP32_IP}/events`);

    eventSource.onopen = () => {
        statusElement.textContent = 'Connected';
        statusElement.className = 'connected';
    };

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            updateDisplay(data);
            // Commenting out chart update for now
            // updateChart(data);
        } catch (error) {
            console.error('Error parsing data:', error);
        }
    };

    eventSource.onerror = (error) => {
        statusElement.textContent = 'Connection lost. Retrying...';
        statusElement.className = 'error';
        console.error('SSE Error:', error);
    };
}

function updateDisplay(data) {
    // Update text displays
    temperatureElement.textContent = `${data.temperature.toFixed(2)} °C`;
    phElement.textContent = data.pH.toFixed(2);
    turbidityElement.textContent = `${data.turbidity.toFixed(1)} %`;
    waterLevelElement.textContent = `${data.waterLevel.toFixed(1)} cm`;

    // Update timestamp
    document.getElementById('last-update').textContent = 
        new Date().toLocaleTimeString();
}

// Keeping chart functions for later use
function setupChart() {
    const ctx = chartElement.getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: dataPoints.temperature,
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                },
                {
                    label: 'pH',
                    data: dataPoints.ph,
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.1
                },
                {
                    label: 'Turbidity (%)',
                    data: dataPoints.turbidity,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                },
                {
                    label: 'Water Level (cm)',
                    data: dataPoints.waterLevel,
                    borderColor: 'rgb(153, 102, 255)',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'second',
                        displayFormats: {
                            second: 'HH:mm:ss'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Value'
                    }
                }
            },
            animation: {
                duration: 0 // Disable animation for better performance
            }
        }
    });
}

function updateChart(data) {
    const now = new Date();

    // Add new data points
    dataPoints.temperature.push({ x: now, y: data.temperature });
    dataPoints.ph.push({ x: now, y: data.pH });
    dataPoints.turbidity.push({ x: now, y: data.turbidity });
    dataPoints.waterLevel.push({ x: now, y: data.waterLevel });

    // Remove old data points if exceeding maxDataPoints
    if (dataPoints.temperature.length > maxDataPoints) {
        dataPoints.temperature.shift();
        dataPoints.ph.shift();
        dataPoints.turbidity.shift();
        dataPoints.waterLevel.shift();
    }

    // Update chart datasets
    chart.data.datasets[0].data = dataPoints.temperature;
    chart.data.datasets[1].data = dataPoints.ph;
    chart.data.datasets[2].data = dataPoints.turbidity;
    chart.data.datasets[3].data = dataPoints.waterLevel;

    // Update chart
    chart.update('none'); // Update without animation
}
