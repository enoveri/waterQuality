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
  TimeScale,
  Filler
} from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
import 'chartjs-adapter-date-fns'
import { ArrowLeft, ArrowRight, ZoomIn, ZoomOut, RotateCcw, Play, Pause } from 'lucide-react'
import { useContext } from 'react'
import { SettingsContext } from '../App'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin,
  Filler
)

// Disable all animations globally
ChartJS.defaults.animations = false;
ChartJS.defaults.transitions = false;
ChartJS.defaults.datasets.line.animation = false;

const MAX_DATA_POINTS = 100; // Increased to store more history
const DEFAULT_TIME_WINDOW_SECONDS = 60; // Default visible window: 60 seconds

export const Chart = ({ data, units }) => {
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
    aspectRatio: 2.5, // Add fixed aspect ratio
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
        align: 'start',
        labels: {
          boxWidth: 12,
          padding: 6,
          usePointStyle: true,
          font: {
            size: 10
          }
        },
        margin: 2
      },
      tooltip: {
        enabled: true,
        callbacks: {
          title: function(context) {
            // Format time based on user preference
            const timeValue = context[0].label;
            if (timeFormat === '12h') {
              // Convert 24h format to 12h format
              const hour = parseInt(timeValue.split(':')[0]);
              if (hour === 0) return '12:00 AM';
              if (hour === 12) return '12:00 PM';
              return hour > 12 
                ? `${hour - 12}:00 PM` 
                : `${hour}:00 AM`;
            }
            return timeValue;
          }
        }
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
          text: 'Value',
          font: {
            size: 10
          },
          padding: { top: 0, bottom: 2 }
        },
        grid: {
          drawBorder: true,
          drawOnChartArea: true,
        },
        ticks: {
          maxTicksLimit: 6, // Limit the number of ticks
          padding: 2,
          font: {
            size: 9
          }
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
          text: 'pH',
          font: {
            size: 10
          },
          padding: { top: 0, bottom: 2 }
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          maxTicksLimit: 6, // Limit the number of ticks
          padding: 2,
          font: {
            size: 9
          }
        }
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
          text: 'Time',
          font: {
            size: 10
          },
          padding: { top: 2, bottom: 0 }
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 5,
          major: {
            enabled: true
          },
          padding: 2,
          font: function(context) {
            if (context.tick && context.tick.major) {
              return {
                weight: 'bold',
                size: 9
              };
            }
            return {
              size: 9
            };
          }
        }
      }
    },
    layout: {
      padding: {
        top: 2,
        right: 2, 
        bottom: 2,
        left: 2
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 transition-colors duration-300 overflow-hidden">
      <div className="flex justify-between mb-1">
        <h2 className="text-base font-medium dark:text-white">Real-time Data</h2>
        <div className="flex space-x-1">
          <button 
            onClick={handleZoomOut}
            className="p-1 rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <button 
            onClick={handleZoomIn}
            className="p-1 rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button 
            onClick={handleScrollLeft}
            className="p-1 rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Move left"
          >
            <ArrowLeft size={16} />
          </button>
          <button 
            onClick={handleScrollRight}
            className="p-1 rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Move right"
          >
            <ArrowRight size={16} />
          </button>
          <button 
            onClick={handleReset}
            className="p-1 rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Reset view to latest data"
          >
            <RotateCcw size={16} />
          </button>
          <button 
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1 rounded-full ${
              autoScroll 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            title={autoScroll ? "Auto-scroll enabled" : "Auto-scroll disabled"}
          >
            {autoScroll ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </div>
      </div>
      <div className="w-full h-[calc(100%-36px)] min-h-[260px]">
        <Line ref={chartRef} data={{ datasets }} options={options} />
      </div>
    </div>
  )
}