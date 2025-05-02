import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from "chart.js";
import "chartjs-adapter-date-fns";
import zoomPlugin from "chartjs-plugin-zoom";
import {
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
} from "lucide-react";
import { getBarChartConfig, optimizeTimeScaleForBarChart } from "../utils/chart/barChartAdapter";

// ─── register ─────────────────────────────────────────────────
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  zoomPlugin
);

const SENSORS = {
  temperature: {
    label: "Temperature (°C)",
    color: "rgb(255,99,132)",
    fill: "rgba(255,99,132,0.2)",
  },
  pH: { label: "pH", color: "rgb(54,162,235)", fill: "rgba(54,162,235,0.2)" },
  turbidity: {
    label: "Turbidity (NTU)",
    color: "rgb(75,192,192)",
    fill: "rgba(75,192,192,0.2)",
  },
  waterLevel: {
    label: "Water Level (cm)",
    color: "rgb(153,102,255)",
    fill: "rgba(153,102,255,0.2)",
  },
};

function getSuggestedYMin(sensor) {
  switch (sensor) {
    case "temperature":
      return 0;
    case "pH":
      return 6;
    case "turbidity":
      return 0;
    case "waterLevel":
      return 0;
    default:
      return 0;
  }
}
function getSuggestedYMax(sensor) {
  switch (sensor) {
    case "temperature":
      return 50;
    case "pH":
      return 8;
    case "turbidity":
      return 100;
    case "waterLevel":
      return 200;
    default:
      return 100;
  }
}

// ─── Chart Component ──────────────────────────────────────────────────────────
// simple constants for history and live window
const MAX_HISTORY = 300;
const LIVE_WINDOW_MS = 60000;

export const Chart = ({ data, chartType = "line" }) => {
  const chartRef = useRef(null);
  const [activeSensor, setActiveSensor] = useState("temperature");
  const [autoScroll, setAutoScroll] = useState(true);
  const [dataHistory, setDataHistory] = useState({
    timestamps: [],
    temperature: [],
    pH: [],
    turbidity: [],
    waterLevel: [],
  });
  const [selectedPoint, setSelectedPoint] = useState(null);
  // Track previous chart type to handle clean chart recreation
  const [prevChartType, setPrevChartType] = useState(chartType);

  // Force chart recreation when changing between chart types
  useEffect(() => {
    if (prevChartType !== chartType && chartRef.current) {
      console.log(`[DEBUG] Chart type changed from ${prevChartType} to ${chartType}, destroying chart instance`);

      // Destroy the chart instance to prevent issues when switching types
      if (chartRef.current?.chartInstance) {
        console.log("[DEBUG] Destroying existing chart instance");
        chartRef.current.chartInstance.destroy();
      } else {
        console.log("[DEBUG] No chart instance found to destroy");
      }

      // Update the previous chart type
      setPrevChartType(chartType);
      console.log(`[DEBUG] Updated prevChartType to: ${chartType}`);
    }
  }, [chartType, prevChartType]);

  // 1) Append new point
  useEffect(() => {
    if (data?.temperature != null) {
      const now = new Date();
      setDataHistory((prev) => {
        const MAX = MAX_HISTORY;
        return {
          timestamps: [...prev.timestamps, now].slice(-MAX),
          temperature: [...prev.temperature, data.temperature].slice(-MAX),
          pH: [...prev.pH, data.pH].slice(-MAX),
          turbidity: [...prev.turbidity, data.turbidity].slice(-MAX),
          waterLevel: [...prev.waterLevel, data.waterLevel].slice(-MAX),
        };
      });
    }
  }, [data]);

  // 2) Dynamic Y bounds
  const { yMin, yMax } = useMemo(() => {
    const vals = dataHistory[activeSensor];
    if (!vals.length) {
      return {
        yMin: getSuggestedYMin(activeSensor),
        yMax: getSuggestedYMax(activeSensor),
      };
    }
    const min = Math.min(...vals),
      max = Math.max(...vals);

    // Flat line → draw from zero (or baseline) up to that constant
    if (min === max) {
      return { yMin: 0, yMax: max };
    }

    // Otherwise apply 10% padding around observed min/max
    const pad = (max - min) * 0.1;
    return {
      yMin: min - pad,
      yMax: max + pad,
    };
  }, [dataHistory, activeSensor]);

  // 3) Memoize data payload
  const chartData = useMemo(() => {
    console.log(`[DEBUG] Building chart data for type=${chartType}, sensor=${activeSensor}, points=${dataHistory.timestamps?.length || 0}`);
    
    // Safety check - if there's no data, return an empty dataset
    if (!dataHistory || !dataHistory.timestamps || dataHistory.timestamps.length === 0) {
      console.warn('[DEBUG] No data available for chart, returning empty dataset');
      return {
        datasets: [{
          label: SENSORS[activeSensor]?.label || 'No Data',
          data: []
        }]
      };
    }
    
    // Safety check - ensure the active sensor exists in the data
    if (!dataHistory[activeSensor] || !Array.isArray(dataHistory[activeSensor])) {
      console.warn(`[DEBUG] No data available for sensor ${activeSensor}, returning empty dataset`);
      return {
        datasets: [{
          label: SENSORS[activeSensor]?.label || 'No Data',
          data: []
        }]
      };
    }
    
    // Extract the data points
    const rawDataPoints = dataHistory.timestamps.map((t, i) => {
      // Safety check - ensure the value exists and is a number
      const value = dataHistory[activeSensor][i];
      return {
        x: t || new Date(), // Default to current time if timestamp is missing
        y: typeof value === 'number' ? value : 0 // Default to 0 if value is missing or not a number
      };
    }).filter(point => point.x && point.y !== undefined); // Filter out any invalid points
    
    console.log(`[DEBUG] Raw data points created: ${rawDataPoints.length}`);
    console.log(`[DEBUG] First data point:`, rawDataPoints.length > 0 ? rawDataPoints[0] : 'none');
    
    // Different configuration based on chart type
    let datasetConfig;
    
    if (chartType === "bar") {
      console.log("[DEBUG] Creating BAR chart dataset");
      
      // For bar charts, we need to ensure the data is formatted correctly
      datasetConfig = {
        label: SENSORS[activeSensor]?.label || 'Unknown Sensor',
        data: rawDataPoints,
        backgroundColor: SENSORS[activeSensor]?.color || 'rgb(75,192,192)',
        borderColor: SENSORS[activeSensor]?.color || 'rgb(75,192,192)',
        borderWidth: 1,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      };
      
      // Get more bar chart configuration from adapter if available
      try {
        if (typeof getBarChartConfig === 'function') {
          const timestamps = dataHistory.timestamps || [];
          const barConfig = getBarChartConfig(timestamps, "auto");
          console.log("[DEBUG] Bar chart adapter config:", barConfig);
          if (barConfig && typeof barConfig === 'object') {
            Object.assign(datasetConfig, barConfig);
          }
        }
      } catch (error) {
        console.error("[ERROR] Failed to get bar chart config:", error);
        // Continue with default config
      }
    } else {
      // Line chart configuration
      console.log("[DEBUG] Creating LINE chart dataset");
      datasetConfig = {
        label: SENSORS[activeSensor]?.label || 'Unknown Sensor',
        data: rawDataPoints,
        borderColor: SENSORS[activeSensor]?.color || 'rgb(75,192,192)',
        backgroundColor: SENSORS[activeSensor]?.fill || 'rgba(75,192,192,0.2)',
        tension: 0.2,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 3,
      };
    }
    
    const chartDataConfig = {
      datasets: [datasetConfig],
    };

    // Add extensive debugging for chart data 
    console.log(`[DEBUG] Final ${chartType} chart dataset:`, datasetConfig);
    console.log(`[DEBUG] Dataset has ${datasetConfig.data?.length || 0} points`);
    
    if (datasetConfig.data && datasetConfig.data.length > 0) {
      // Check for any null or undefined values that could break the chart
      const hasInvalidData = datasetConfig.data.some(
        point => point.x === null || point.x === undefined || point.y === null || point.y === undefined
      );
      
      if (hasInvalidData) {
        console.error("[ERROR] Chart dataset contains null or undefined values!");
      }
    } else {
      console.warn("[WARN] No data points available for the chart!");
    }

    return chartDataConfig;
  }, [dataHistory, activeSensor, chartType]);

  // 4) Memoize options with full displayFormats
  const options = useMemo(
    () => {
      console.log(`[DEBUG] Creating chart options for ${chartType}`);
      
      const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            type: "time",
            time: {
              tooltipFormat: "HH:mm:ss",
              displayFormats: {
                millisecond: "HH:mm:ss.SSS",
                second: "HH:mm:ss",
                minute: "HH:mm",
                hour: "HH:mm",
                day: "MMM d",
                month: "MMM yyyy",
                year: "yyyy",
              },
            },
            ticks: {
              source: "auto",
              autoSkip: true,
              maxRotation: 0,
            },
          },
          y: {
            min: yMin,
            max: yMax,
            title: { display: true, text: SENSORS[activeSensor].label },
            ticks: { count: 6, callback: (v) => Number(v).toFixed(2) },
          },
        },
        plugins: {
          zoom: {
            pan: { enabled: true, mode: "x", threshold: 5 },
            zoom: {
              wheel: { enabled: true, speed: 0.1 },
              pinch: { enabled: true },
              mode: "x",
            },
          },
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
          },
        },
      };
      
      // Add specific options for bar charts
      if (chartType === "bar") {
        console.log("[DEBUG] Setting up bar chart specific options");
        
        // CRITICAL SETTING: determine time unit based on data span
        const dataPoints = dataHistory.timestamps;
        let timeUnit = 'hour';
        
        if (dataPoints.length >= 2) {
          const firstPoint = dataPoints[0];
          const lastPoint = dataPoints[dataPoints.length - 1];
          const timeSpanMs = lastPoint - firstPoint;
          
          console.log(`[DEBUG] Data time span: ${timeSpanMs}ms (${timeSpanMs / (1000 * 60 * 60 * 24)} days)`);
          
          // Choose appropriate time unit based on data span
          if (timeSpanMs > 1000 * 60 * 60 * 24 * 30) { // > 30 days
            timeUnit = 'month';
          } else if (timeSpanMs > 1000 * 60 * 60 * 24 * 2) { // > 2 days
            timeUnit = 'day';
          } else if (timeSpanMs > 1000 * 60 * 60 * 2) { // > 2 hours
            timeUnit = 'hour';
          } else {
            timeUnit = 'minute';
          }
          
          console.log(`[DEBUG] Selected time unit for bar chart: ${timeUnit}`);
          
          // Update time configuration
          baseOptions.scales.x.time.unit = timeUnit;
        }
        
        // Essential settings for bar charts with time scale
        baseOptions.scales.x.offset = true;
        baseOptions.scales.x.stacked = false;
        baseOptions.scales.x.distribution = 'series'; 
        
        // Grid offset for proper bar alignment
        baseOptions.scales.x.grid = { offset: true };
        
        // Adjust bar width based on data density
        if (dataPoints.length > 50) {
          baseOptions.scales.x.ticks.maxTicksLimit = 10;
        } else if (dataPoints.length > 20) {
          baseOptions.scales.x.ticks.maxTicksLimit = 8;
        } else {
          baseOptions.scales.x.ticks.maxTicksLimit = 6;
        }
        
        console.log("[DEBUG] Bar chart x-axis config:", baseOptions.scales.x);
      }

      return baseOptions;
    },
    [activeSensor, yMin, yMax, chartType, dataHistory.timestamps]
  );

  // 5) Zoom/pan handlers
  const handleReset = useCallback(() => {
    chartRef.current?.resetZoom();
  }, []);
  const handleZoomIn = useCallback(() => {
    chartRef.current?.zoom(1.2);
  }, []);
  const handleZoomOut = useCallback(() => {
    chartRef.current?.zoom(0.8);
  }, []);
  const handlePanLeft = useCallback(() => {
    chartRef.current?.pan({ x: -100 }, undefined);
  }, []);
  const handlePanRight = useCallback(() => {
    chartRef.current?.pan({ x: 100 }, undefined);
  }, []);

  // 6) Auto‑scroll live 60s window
  useEffect(() => {
    if (!autoScroll || !chartRef.current) return;
    const last = dataHistory.timestamps.at(-1);
    if (!last) return;
    const first = new Date(last.getTime() - LIVE_WINDOW_MS);
    chartRef.current.options.scales.x.min = first;
    chartRef.current.options.scales.x.max = last;
    chartRef.current.update("none");
  }, [dataHistory, autoScroll]);

  const handleChartClick = (event) => {
    const chart = chartRef.current;
    if (!chart) return;
    const elements = chart.getElementsAtEventForMode(
      event,
      "nearest",
      { intersect: true },
      true
    );
    if (!elements.length) {
      setSelectedPoint(null);
      return;
    }
    const { datasetIndex, index } = elements[0];
    const dataset = chart.data.datasets[datasetIndex];
    const { x: timestamp, y: value } = dataset.data[index];
    setSelectedPoint({ label: dataset.label, value, timestamp });
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
        Real-time Data
      </h2>

      {/* sensor selector */}
      <div className="flex flex-wrap mb-4 gap-2">
        {Object.entries(SENSORS).map(([k, s]) => (
          <button
            key={k}
            onClick={() => setActiveSensor(k)}
            title={s.label}
            aria-pressed={activeSensor === k}
            className={`px-3 py-1 text-sm rounded-md ${
              activeSensor === k
                ? "bg-blue-100 text-blue-700 border-blue-300 border"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* pan/zoom controls */}
      <div className="flex flex-wrap mb-4 gap-2">
        <button onClick={handlePanLeft} className="btn" title="Pan Left">
          <ArrowLeft size={16} />
        </button>
        <button onClick={handlePanRight} className="btn" title="Pan Right">
          <ArrowRight size={16} />
        </button>
        <button onClick={handleZoomIn} className="btn" title="Zoom In">
          <ZoomIn size={16} />
        </button>
        <button onClick={handleZoomOut} className="btn" title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <button onClick={handleReset} className="btn" title="Reset Zoom">
          <RotateCcw size={16} />
        </button>
        <button
          onClick={() => setAutoScroll((p) => !p)}
          className={`btn flex items-center gap-1 ${
            autoScroll ? "bg-green-100 text-green-700" : "bg-gray-100"
          }`}
        >
          {autoScroll ? <Pause size={16} /> : <Play size={16} />}
          {autoScroll ? "Live" : "Paused"}
        </button>
      </div>

      {/* the chart */}
      <div style={{ height: 300 }}>
        {console.log(`[DEBUG] Rendering chart container for type: ${chartType}`)}
        {chartType === "line" ? (
          <>
            {console.log("[DEBUG] Rendering Line chart component")}
            <Line
              ref={(ref) => {
                chartRef.current = ref;
                console.log("[DEBUG] Line chart reference set:", ref ? "success" : "null");
              }}
              data={chartData}
              options={options}
              onClick={handleChartClick}
            />
          </>
        ) : chartType === "bar" ? (
          <>
            {console.log("[DEBUG] Rendering Bar chart component")}
            <pre style={{display: 'none'}}>
              {JSON.stringify(chartData, null, 2)}
            </pre>
            <Bar
              ref={(ref) => {
                chartRef.current = ref;
                console.log("[DEBUG] Bar chart reference set:", ref ? "success" : "null", ref);
              }}
              data={chartData}
              options={options}
              onClick={handleChartClick}
              redraw={true}
            />
          </>
        ) : (
          <Line
            ref={chartRef}
            data={chartData}
            options={options}
            onClick={handleChartClick}
          />
        )}
      </div>
      {selectedPoint && (
        <div className="mt-2 p-2 bg-gray-100 rounded border text-sm">
          <strong>{selectedPoint.label}</strong>
          <br />
          Time: {new Date(selectedPoint.timestamp).toLocaleString()}
          <br />
          Value: {selectedPoint.value}
        </div>
      )}
      
      {/* Debug panel with more detailed information */}
      <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono">
        <details>
          <summary className="cursor-pointer text-gray-700 hover:text-blue-600">
            Chart Debug Information
          </summary>
          <div className="mt-1 whitespace-pre-wrap text-gray-600">
            <strong>Chart Type:</strong> {chartType}<br />
            <strong>Active Sensor:</strong> {activeSensor}<br />
            <strong>Data Points:</strong> {dataHistory[activeSensor].length}<br />
            <strong>Chart Ref:</strong> {chartRef.current ? "Available" : "Not Available"}<br />
            <strong>Bar Chart Settings:</strong><br />
            {chartType === "bar" && chartData.datasets?.[0] ? 
              <>
              barPercentage: {chartData.datasets[0].barPercentage || "default"}<br />
              categoryPercentage: {chartData.datasets[0].categoryPercentage || "default"}<br />
              data points: {chartData.datasets[0].data?.length || 0}
              </> : "N/A"}
            <br />
            <strong>Sample Data Point:</strong><br />
            {chartData.datasets?.[0]?.data?.length > 0 
              ? JSON.stringify(chartData.datasets[0].data[0], null, 2) 
              : "No data"}
          </div>
        </details>
      </div>

      {/* Add debug information in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono">
          <details>
            <summary className="cursor-pointer text-gray-700 hover:text-blue-600">
              Debug Information
            </summary>
            <div className="mt-1 whitespace-pre-wrap text-gray-600">
              Chart Type: {chartType}
              <br />
              Active Sensor: {activeSensor}
              <br />
              Data Points: {dataHistory[activeSensor].length}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};
