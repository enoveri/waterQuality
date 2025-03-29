import { useState, useEffect, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
import 'chartjs-adapter-date-fns'
import { ArrowLeft, ArrowRight, ZoomIn, ZoomOut, RotateCcw, Play, Pause } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
)

// Disable all animations globally
ChartJS.defaults.animations = false;
ChartJS.defaults.transitions = false;
ChartJS.defaults.datasets.line.animation = false;

const MAX_DATA_POINTS = 100; // Increased to store more history
const DEFAULT_TIME_WINDOW_SECONDS = 60; // Default visible window: 60 seconds

export const Chart = ({ data }) => {
  const chartRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [timeWindow, setTimeWindow] = useState(DEFAULT_TIME_WINDOW_SECONDS);
  const [viewState, setViewState] = useState({
    min: null,
    max: null
  });
  const [dataHistory, setDataHistory] = useState({
    timestamps: [],
    temperature: [],
    pH: [],
    turbidity: [],
    waterLevel: []
  });
  
  // Update history when new data is received
  useEffect(() => {
    if (data && typeof data.temperature === 'number') {
      const timestamp = new Date();
      
      setDataHistory(prev => {
        // Add new data points
        const newTimestamps = [...prev.timestamps, timestamp];
        const newTemperature = [...prev.temperature, data.temperature];
        const newPH = [...prev.pH, data.pH];
        const newTurbidity = [...prev.turbidity, data.turbidity];
        const newWaterLevel = [...prev.waterLevel, data.waterLevel];
        
        // Keep only the last MAX_DATA_POINTS
        return {
          timestamps: newTimestamps.slice(-MAX_DATA_POINTS),
          temperature: newTemperature.slice(-MAX_DATA_POINTS),
          pH: newPH.slice(-MAX_DATA_POINTS),
          turbidity: newTurbidity.slice(-MAX_DATA_POINTS),
          waterLevel: newWaterLevel.slice(-MAX_DATA_POINTS)
        };
      });
      
      // If in auto-scroll mode, update the view to include the latest data
      if (autoScroll && chartRef.current) {
        const minTime = new Date(timestamp);
        minTime.setSeconds(minTime.getSeconds() - timeWindow);
        
        setViewState({
          min: minTime,
          max: timestamp
        });
      }
    }
  }, [data, autoScroll, timeWindow]);
  
  // Apply viewState to chart when it changes
  useEffect(() => {
    if (chartRef.current && viewState.min && viewState.max) {
      const chart = chartRef.current;
      
      chart.options.scales.x.min = viewState.min;
      chart.options.scales.x.max = viewState.max;
      chart.update('none');
    }
  }, [viewState]);

  // Handle scrolling controls
  const handleScrollLeft = () => {
    if (chartRef.current && dataHistory.timestamps.length > 1) {
      setAutoScroll(false);
      
      // Get current min/max
      const chart = chartRef.current;
      const minTime = new Date(chart.options.scales.x.min);
      const maxTime = new Date(chart.options.scales.x.max);
      
      // Calculate time difference and shift by 25% of current window
      const timeDiff = maxTime - minTime;
      const shiftAmount = timeDiff * 0.25;
      
      // Shift left (back in time)
      setViewState({
        min: new Date(minTime.getTime() - shiftAmount),
        max: new Date(maxTime.getTime() - shiftAmount)
      });
    }
  };
  
  const handleScrollRight = () => {
    if (chartRef.current && dataHistory.timestamps.length > 1) {
      // Get current min/max
      const chart = chartRef.current;
      const minTime = new Date(chart.options.scales.x.min);
      const maxTime = new Date(chart.options.scales.x.max);
      
      // Calculate time difference and shift by 25% of current window
      const timeDiff = maxTime - minTime;
      const shiftAmount = timeDiff * 0.25;
      
      // Check if we're at the latest data
      const latestTimestamp = dataHistory.timestamps[dataHistory.timestamps.length - 1];
      const newMax = new Date(maxTime.getTime() + shiftAmount);
      
      // If we would scroll past the latest data, just go to latest
      if (newMax >= latestTimestamp) {
        // Don't auto-enable auto-scroll, just go to latest data point
        const minTime = new Date(latestTimestamp);
        minTime.setSeconds(minTime.getSeconds() - timeWindow);
        
        setViewState({
          min: minTime,
          max: latestTimestamp
        });
      } else {
        setAutoScroll(false);
        // Shift right (forward in time)
        setViewState({
          min: new Date(minTime.getTime() + shiftAmount),
          max: newMax
        });
      }
    }
  };
  
  const handleZoomIn = () => {
    if (chartRef.current && dataHistory.timestamps.length > 1) {
      setAutoScroll(false);
      
      // Get current min/max
      const chart = chartRef.current;
      const minTime = new Date(chart.options.scales.x.min);
      const maxTime = new Date(chart.options.scales.x.max);
      
      // Calculate center point
      const center = new Date((minTime.getTime() + maxTime.getTime()) / 2);
      
      // Calculate new half window (half the current size)
      const newHalfWindow = (maxTime - minTime) / 4; // quarter of current window
      
      // Set new min/max from center
      setViewState({
        min: new Date(center.getTime() - newHalfWindow),
        max: new Date(center.getTime() + newHalfWindow)
      });
      
      // Update timeWindow for future reference
      const newTimeWindow = Math.max(10, timeWindow / 2);
      setTimeWindow(newTimeWindow);
    }
  };
  
  const handleZoomOut = () => {
    if (chartRef.current && dataHistory.timestamps.length > 1) {
      setAutoScroll(false);
      
      // Get current min/max
      const chart = chartRef.current;
      const minTime = new Date(chart.options.scales.x.min);
      const maxTime = new Date(chart.options.scales.x.max);
      
      // Calculate center point
      const center = new Date((minTime.getTime() + maxTime.getTime()) / 2);
      
      // Calculate new half window (double the current size)
      const newHalfWindow = (maxTime - minTime); // double the current half window
      
      // Set new min/max from center
      setViewState({
        min: new Date(center.getTime() - newHalfWindow),
        max: new Date(center.getTime() + newHalfWindow)
      });
      
      // Update timeWindow for future reference
      const newTimeWindow = Math.min(300, timeWindow * 2);
      setTimeWindow(newTimeWindow);
    }
  };
  
  const handleReset = () => {
    setAutoScroll(true);
    setTimeWindow(DEFAULT_TIME_WINDOW_SECONDS);
    
    // If we have data, jump to the latest
    if (dataHistory.timestamps.length > 0) {
      const latestTimestamp = dataHistory.timestamps[dataHistory.timestamps.length - 1];
      const minTime = new Date(latestTimestamp);
      minTime.setSeconds(minTime.getSeconds() - DEFAULT_TIME_WINDOW_SECONDS);
      
      setViewState({
        min: minTime,
        max: latestTimestamp
      });
    }
  };
  
  const toggleAutoScroll = () => {
    if (!autoScroll) {
      // Enabling auto-scroll - jump to latest data
      handleReset();
    } else {
      // Disabling auto-scroll - stay at current position
      setAutoScroll(false);
    }
  };

  // Event handlers for chart zoom/pan
  const handleChartZoom = () => {
    if (autoScroll) {
      setAutoScroll(false);
    }
  };
  
  const handleChartPan = () => {
    if (autoScroll) {
      setAutoScroll(false);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    animation: false,
    animations: {
      colors: false,
      x: false,
      y: false
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        enabled: true
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          onPan: handleChartPan
        },
        zoom: {
          wheel: { 
            enabled: true,
            speed: 0.05
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
          onZoom: handleChartZoom
        }
      }
    },
    scales: {
      // Fixed scales to prevent any auto-scaling
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Value'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        min: 0,
        max: 14,
        title: {
          display: true,
          text: 'pH'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        type: 'time',
        time: {
          unit: 'second',
          displayFormats: {
            second: 'HH:mm:ss'
          },
          tooltipFormat: 'HH:mm:ss'
        },
        title: {
          display: true,
          text: 'Time'
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 5,
          major: {
            enabled: true
          },
          font: function(context) {
            if (context.tick && context.tick.major) {
              return {
                weight: 'bold'
              };
            }
          }
        }
      }
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 3
      },
      line: {
        tension: 0.2
      }
    }
  }

  // Create datasets with timestamp objects for x values
  const datasets = [
    {
      label: 'Temperature (°C)',
      data: dataHistory.timestamps.map((timestamp, index) => ({
        x: timestamp,
        y: dataHistory.temperature[index]
      })),
      borderColor: 'rgb(255, 99, 132)',
      borderWidth: 2,
      yAxisID: 'y'
    },
    {
      label: 'pH',
      data: dataHistory.timestamps.map((timestamp, index) => ({
        x: timestamp,
        y: dataHistory.pH[index]
      })),
      borderColor: 'rgb(54, 162, 235)',
      borderWidth: 2,
      yAxisID: 'y1'
    },
    {
      label: 'Turbidity (NTU)',
      data: dataHistory.timestamps.map((timestamp, index) => ({
        x: timestamp,
        y: dataHistory.turbidity[index]
      })),
      borderColor: 'rgb(75, 192, 192)',
      borderWidth: 2,
      yAxisID: 'y'
    },
    {
      label: 'Water Level (cm)',
      data: dataHistory.timestamps.map((timestamp, index) => ({
        x: timestamp,
        y: dataHistory.waterLevel[index]
      })),
      borderColor: 'rgb(153, 102, 255)',
      borderWidth: 2,
      yAxisID: 'y'
    }
  ];

  const chartConfig = {
    datasets
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Real-time Monitoring</h2>
        <button
          onClick={toggleAutoScroll}
          className={`flex items-center gap-2 px-3 py-1.5 rounded ${
            autoScroll 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-800'
          }`}
          title={autoScroll ? "Disable auto-scrolling" : "Enable auto-scrolling"}
        >
          {autoScroll ? (
            <>
              <Pause size={16} />
              <span>Auto-scroll</span>
            </>
          ) : (
            <>
              <Play size={16} />
              <span>Auto-scroll</span>
            </>
          )}
        </button>
      </div>
      
      <div className="chart-container" style={{ height: '400px' }}>
        <Line ref={chartRef} options={options} data={chartConfig} />
      </div>
      
      <div className="flex items-center justify-between mt-4">
        <div className="text-xs text-gray-500">
          {autoScroll 
            ? 'Auto-scrolling enabled - chart will follow latest data' 
            : 'Manual mode - interact with chart or use controls below'
          }
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={handleScrollLeft}
            className="p-1 rounded hover:bg-gray-100"
            title="Scroll back in time"
          >
            <ArrowLeft size={20} />
          </button>
          <button 
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-gray-100"
            title="Zoom in"
          >
            <ZoomIn size={20} />
          </button>
          <button 
            onClick={handleReset}
            className={`p-1.5 rounded hover:bg-gray-100 ${autoScroll ? 'bg-blue-100' : ''}`}
            title="Reset view to latest data"
          >
            <RotateCcw size={18} />
          </button>
          <button 
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-gray-100"
            title="Zoom out"
          >
            <ZoomOut size={20} />
          </button>
          <button 
            onClick={handleScrollRight}
            className="p-1 rounded hover:bg-gray-100"
            title="Scroll forward in time"
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
} 