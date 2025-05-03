import { Line } from "react-chartjs-2";
// Import adapter first before registering components
import { enUS } from "date-fns/locale";
import "chartjs-adapter-date-fns";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useContext, useState, useEffect, useMemo } from "react";
import { SettingsContext } from "../App";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function MiniChart({ data, label, color, unit, metric, metrics }) {
  const { timeFormat } = useContext(SettingsContext);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Track window size for responsiveness
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter to last 20 entries for mini charts
  const lastItems = data?.slice(-20) || [];

  // Format time helper function
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const options = {
      hour: "numeric",
      minute: "numeric",
      hour12: timeFormat === "12h",
    };
    return new Intl.DateTimeFormat("en-US", options).format(date);
  };

  // Prepare chart data based on the selected metric or use default values
  const chartData = useMemo(() => {
    // Handle the case when metrics prop is not provided (legacy mode)
    if (!metrics) {
      // Create a simple dataset using the provided color and label
      return {
        labels: Array(lastItems.length).fill(""),
        datasets: [
          {
            label: label || "Value",
            data: lastItems,
            borderColor: color || "rgb(75, 192, 192)",
            backgroundColor: `${color || "rgb(75, 192, 192)"}20`,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3,
            fill: true,
          },
        ],
      };
    }

    // Modern mode with metrics prop
    const selectedMetric = metrics.find((m) => m.id === metric);
    if (!selectedMetric || !data || data.length === 0) {
      // Return empty chart data if no valid metric or data
      return {
        labels: [],
        datasets: [
          {
            label: label || "No Data",
            data: [],
            borderColor: color || "rgb(200, 200, 200)",
            backgroundColor: `${color || "rgb(200, 200, 200)"}20`,
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
          },
        ],
      };
    }

    // Log data being displayed in mini chart
    console.log(`MiniChart rendering for ${selectedMetric.label}:`, data);

    return {
      labels: data.map((point) => formatTime(point.timestamp)),
      datasets: [
        {
          label: selectedMetric.label,
          data: data.map((point) => point.value),
          borderColor: selectedMetric.color,
          backgroundColor: `${selectedMetric.color}20`,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }, [data, metric, metrics, timeFormat, label, color, lastItems]);

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: windowWidth < 640 ? 1.25 : 1.75, // More compact for mobile
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            try {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(1);
                if (unit) label += unit;
              }
              return label;
            } catch (error) {
              return "Error";
            }
          },
          title: function (context) {
            try {
              // Check if we're in legacy mode (direct array of values)
              if (
                !metrics &&
                typeof lastItems[context[0].dataIndex] === "number"
              ) {
                return ""; // No timestamp available in legacy mode
              }

              if (!lastItems[context[0].dataIndex]?.timestamp) {
                return "";
              }

              // Format time based on user preference
              const timestamp = new Date(
                lastItems[context[0].dataIndex].timestamp
              );
              const options = {
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
                hour12: timeFormat === "12h",
              };

              return new Intl.DateTimeFormat("en-US", options).format(
                timestamp
              );
            } catch (error) {
              console.error("Error formatting tooltip title:", error);
              return "";
            }
          },
          // Add millisecond precision for detailed view
          afterTitle: function (context) {
            try {
              // Check if we're in legacy mode
              if (
                !metrics &&
                typeof lastItems[context[0].dataIndex] === "number"
              ) {
                return ""; // No timestamp in legacy mode
              }

              if (!lastItems[context[0].dataIndex]?.timestamp) {
                return "";
              }

              // Show additional milliseconds for more precise time reading
              const timestamp = new Date(
                lastItems[context[0].dataIndex].timestamp
              );
              return `.${timestamp
                .getMilliseconds()
                .toString()
                .padStart(3, "0")}`;
            } catch (error) {
              console.error("Error formatting tooltip after title:", error);
              return "";
            }
          },
        },
        displayColors: true,
        backgroundColor: (ctx) => {
          try {
            return ctx.chart.data.datasets[0].borderColor + "CC"; // Semi-transparent background matching chart color
          } catch (error) {
            return "rgba(0,0,0,0.7)";
          }
        },
        padding: 4,
        titleFont: {
          size: windowWidth < 640 ? 10 : 12,
        },
        bodyFont: {
          size: windowWidth < 640 ? 9 : 11,
        },
      },
    },
    scales: {
      x: {
        display: false,
        bounds: "data",
      },
      y: {
        display: false,
        beginAtZero: false,
        bounds: "data",
      },
    },
    elements: {
      line: {
        borderWidth: windowWidth < 640 ? 1 : 1.5,
      },
      point: {
        radius: 0,
        hitRadius: 10,
        hoverRadius: windowWidth < 640 ? 3 : 4,
      },
    },
    layout: {
      padding: 0, // Remove all padding to maximize chart area
    },
  };

  // Get current value based on data format
  const value = useMemo(() => {
    if (!lastItems || lastItems.length === 0) return "N/A";

    // Handle legacy mode (direct array of values)
    if (!metrics) {
      const lastValue = lastItems[lastItems.length - 1];
      return typeof lastValue === "number" ? lastValue : "N/A";
    }

    // Modern mode with timestamp/value objects
    return lastItems[lastItems.length - 1]?.value ?? "N/A";
  }, [lastItems, metrics]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-1.5 sm:p-2 transition-colors duration-300 overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-0 sm:mb-1">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
            {label}
          </h3>
          <div className="flex items-center flex-shrink-0 ml-1">
            <span className="text-base sm:text-lg font-semibold whitespace-nowrap">
              {typeof value === "number" ? value.toFixed(1) : value}
            </span>
            {unit && (
              <span className="ml-0.5 sm:ml-1 text-xxs sm:text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                {unit}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-[60px] sm:min-h-[70px] -mx-0.5 overflow-hidden">
          <Line data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}
