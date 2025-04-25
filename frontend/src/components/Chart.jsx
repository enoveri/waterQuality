import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Line } from "react-chartjs-2";
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

// ─── register ─────────────────────────────────────────────────
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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

export const Chart = ({ data }) => {
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
    const chartDataConfig = {
      datasets: [
        {
          label: SENSORS[activeSensor].label,
          data: dataHistory.timestamps.map((t, i) => ({
            x: t,
            y: dataHistory[activeSensor][i],
          })),
          borderColor: SENSORS[activeSensor].color,
          backgroundColor: SENSORS[activeSensor].fill,
          tension: 0.2,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 3,
        },
      ],
    };

    // Log the selected chart data
    console.log(
      `Chart rendering for ${SENSORS[activeSensor].label}:`,
      chartData
    );

    return chartDataConfig;
  }, [dataHistory, activeSensor]);

  // 4) Memoize options with full displayFormats
  const options = useMemo(
    () => ({
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
      },
    }),
    [activeSensor, yMin, yMax]
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
        <Line
          ref={chartRef}
          data={chartData}
          options={options}
          onClick={handleChartClick}
        />
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
    </div>
  );
};
