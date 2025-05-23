import {
  useState,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Calendar,
  Clock,
  Download,
  FileText,
  Bell,
  AlertTriangle,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  FileIcon,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { Line } from "react-chartjs-2";
import { SettingsContext, ThemeContext } from "../App";
import { waterQualityService } from "../services/apiService";
import * as XLSX from "xlsx";
import { enUS } from "date-fns/locale";
import "chartjs-adapter-date-fns";
import zoomPlugin from "chartjs-plugin-zoom";
import PropTypes from "prop-types";
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Import our new modular components
import scrollbarPlugin from "../utils/chart/scrollbarPlugin";
import { useChartZoom } from "../utils/chart/useChartZoom";
import { useAlertFilters } from "../utils/useAlertFilters";

// Register Chart.js components
ChartJS.register(
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin,
  scrollbarPlugin
);

// Helper to format date for datetime inputs
const formatDateForInput = (date) => {
  return date.toISOString().split("T")[0];
};

// Get nicely formatted date
const formatDate = (date, timeFormat = "24h") => {
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: timeFormat === "12h",
  };
  return new Date(date).toLocaleDateString("en-US", options);
};

// Utility to filter data points by date range
const filterByDateRange = (arr, start, end) => {
  // Ensure arr is an array before filtering
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.filter((d) => {
    const ts = new Date(d.timestamp);
    return ts >= start && ts <= end;
  });
};

export function History({
  dataHistory: localDataHistory,
  thresholds,
  windowWidth: propWindowWidth,
}) {
  const { timeFormat, units } = useContext(SettingsContext);
  const { theme } = useContext(ThemeContext);

  // State for loading database data
  const [isLoading, setIsLoading] = useState(false);
  const [dbDataHistory, setDbDataHistory] = useState(null);
  const [useDbData, setUseDbData] = useState(true);

  // Combine local data history with database data if available
  const dataHistory =
    useDbData && dbDataHistory ? dbDataHistory : localDataHistory;

  // Window width state management
  const [localWindowWidth, setLocalWindowWidth] = useState(window.innerWidth);
  const windowWidth = propWindowWidth || localWindowWidth;

  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default to last 7 days
    return formatDateForInput(date);
  });
  const [endDate, setEndDate] = useState(() => formatDateForInput(new Date()));

  // UI state
  const [activeTab, setActiveTab] = useState("data");
  const [alertsHistory, setAlertsHistory] = useState([]);
  const [exportFormat, setExportFormat] = useState("csv");
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Use our custom hooks
  const {
    chartRef,
    zoomState,
    chartViewState,
    handleZoomIn: baseHandleZoomIn,
    handleZoomOut: baseHandleZoomOut,
    handlePanLeft: baseHandlePanLeft,
    handlePanRight: baseHandlePanRight,
    handleResetZoom,
    getZoomPluginOptions,
  } = useChartZoom();

  // Create wrappers to bind the date ranges
  const handleZoomIn = () => baseHandleZoomIn(startDate, endDate);
  const handleZoomOut = () => baseHandleZoomOut(startDate, endDate);
  const handlePanLeft = () => baseHandlePanLeft(startDate, endDate);
  const handlePanRight = () => baseHandlePanRight(startDate, endDate);

  // Use our custom alert filters hook
  const {
    alertFilters,
    showFilters,
    toggleFilters: toggleFilterPanel,
    updateFilter,
    filteredAlerts,
  } = useAlertFilters(alertsHistory);

  // Update individual filter
  const handleFilterChange = (filterName) => {
    updateFilter(filterName, !alertFilters[filterName]);
  };

  // Track window size for responsiveness (only if no prop is provided)
  useEffect(() => {
    if (propWindowWidth) return; // Skip if prop is provided

    const handleResize = () => setLocalWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [propWindowWidth]);

  // Generate mock alerts history data
  useEffect(() => {
    // This would be replaced with an API call in a real app
    const generateMockAlerts = () => {
      const mockAlerts = [];
      // Go back 30 days and generate some random alerts
      for (let i = 0; i < 40; i++) {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        date.setHours(Math.floor(Math.random() * 24));

        const types = ["temperature", "pH", "turbidity", "waterLevel"];
        const type = types[Math.floor(Math.random() * types.length)];
        const severities = ["low", "medium", "high"];
        const severity =
          severities[Math.floor(Math.random() * severities.length)];

        let message = "";
        let threshold = "";

        switch (type) {
          case "temperature":
            const temp = (20 + Math.random() * 10).toFixed(1);
            message = `High temperature: ${temp}°C`;
            threshold = `>${thresholds.temperature.high}°C`;
            break;
          case "pH":
            const ph = (6 + Math.random() * 3).toFixed(1);
            message = `pH out of range: ${ph}`;
            threshold = `${thresholds.pH.low}-${thresholds.pH.high}`;
            break;
          case "turbidity":
            const turbidity = (Math.random() * 5).toFixed(2);
            message = `High turbidity: ${turbidity} NTU`;
            threshold = `>${thresholds.turbidity.high} NTU`;
            break;
          case "waterLevel":
            const level = (Math.random() * 100).toFixed(0);
            message = `Water level critical: ${level}cm`;
            threshold = `>90cm`;
            break;
          default:
            break;
        }

        mockAlerts.push({
          id: i,
          type,
          message,
          threshold,
          timestamp: date,
          severity,
          acknowledged: Math.random() > 0.3,
        });
      }

      // Sort by timestamp descending
      return mockAlerts.sort((a, b) => b.timestamp - a.timestamp);
    };

    setAlertsHistory(generateMockAlerts());
  }, [thresholds]);

  // Process data for chart
  const chartData = useMemo(() => {
    // Ensure dataHistory exists and all required arrays are valid
    if (
      !dataHistory ||
      !dataHistory.temperature ||
      !dataHistory.pH ||
      !dataHistory.turbidity ||
      !dataHistory.waterLevel ||
      !Array.isArray(dataHistory.temperature) ||
      !Array.isArray(dataHistory.pH) ||
      !Array.isArray(dataHistory.turbidity) ||
      !Array.isArray(dataHistory.waterLevel)
    ) {
      console.warn("Invalid or missing data format in dataHistory");
      return null;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // DRY: use helper to filter each series with safe access
    const filtered = {
      temperature: filterByDateRange(dataHistory.temperature || [], start, end),
      pH: filterByDateRange(dataHistory.pH || [], start, end),
      turbidity: filterByDateRange(dataHistory.turbidity || [], start, end),
      waterLevel: filterByDateRange(dataHistory.waterLevel || [], start, end),
    };

    // Make sure we have at least some data after filtering
    if (!filtered.temperature.length) {
      console.info("No data available for selected date range");
      return {
        labels: [],
        datasets: [],
      };
    }

    // Return prepared chart data
    return {
      labels: filtered.temperature.map((d) => new Date(d.timestamp)),
      datasets: [
        {
          label: "Temperature",
          data: filtered.temperature.map((d) => d.value),
          borderColor: "#ef4444",
          backgroundColor: "#ef444420",
          yAxisID: "y",
          tension: 0.2,
        },
        {
          label: "pH",
          data: filtered.pH.map((d) => d.value),
          borderColor: "#3b82f6",
          backgroundColor: "#3b82f620",
          yAxisID: "y1",
          tension: 0.2,
        },
        {
          label: "Turbidity",
          data: filtered.turbidity.map((d) => d.value),
          borderColor: "#10b981",
          backgroundColor: "#10b98120",
          yAxisID: "y",
          tension: 0.2,
        },
        {
          label: "Water Level",
          data: filtered.waterLevel.map((d) => d.value),
          borderColor: "#8b5cf6",
          backgroundColor: "#8b5cf620",
          yAxisID: "y",
          tension: 0.2,
        },
      ],
    };
  }, [dataHistory, startDate, endDate]);

  // Add chart container ref and zoom state
  const chartContainerRef = useRef(null);
  const [isZooming, setIsZooming] = useState(false);

  // Handle keyboard events for zoom mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && chartContainerRef.current) {
        chartContainerRef.current.classList.add("zooming");
        setIsZooming(true);
      }
    };

    const handleKeyUp = (e) => {
      if (!e.ctrlKey && chartContainerRef.current) {
        chartContainerRef.current.classList.remove("zooming");
        setIsZooming(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Update chart options for better mobile view and add zoom/pan functionality with dynamic time units
  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: windowWidth < 640 ? 1.5 : 2.5,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        // Add custom tooltip title formatter based on zoom level
        tooltip: {
          callbacks: {
            title: (context) => {
              if (!context.length) return "";

              const date = new Date(context[0].parsed.x);
              const timeRange =
                zoomState.max && zoomState.min
                  ? zoomState.max - zoomState.min
                  : null;

              // Determine appropriate time format based on zoom level
              let options = {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour12: timeFormat === "12h",
              };

              // Add more detailed time units when zoomed in
              if (timeRange) {
                // Less than a day - show hours, minutes, seconds
                if (timeRange < 86400000) {
                  options.hour = "numeric";
                  options.minute = "numeric";
                  // Less than an hour - show seconds
                  if (timeRange < 3600000) {
                    options.second = "numeric";
                    // Less than a minute - show milliseconds
                    if (timeRange < 60000) {
                      return date.toLocaleString("en-US", {
                        ...options,
                        fractionalSecondDigits: 3,
                      });
                    }
                  }
                }
              } else {
                // Default format when not zoomed
                options.hour = "numeric";
                options.minute = "numeric";
              }

              return date.toLocaleString("en-US", options);
            },
          },
        },
        legend: {
          position: "top",
          align: "start",
          labels: {
            boxWidth: windowWidth < 640 ? 8 : 12,
            padding: 4,
            usePointStyle: true,
            font: {
              size: windowWidth < 640 ? 9 : 11,
            },
          },
        },

        chartScrollbar: {
          scrollbarWidth: 8,
          scrollbarColor:
            theme === "dark"
              ? "rgba(156, 163, 175, 0.3)"
              : "rgba(107, 114, 128, 0.3)",
          scrollbarHoverColor:
            theme === "dark"
              ? "rgba(156, 163, 175, 0.5)"
              : "rgba(107, 114, 128, 0.5)",
          scrollbarBorderRadius: 4,
          // Enable interactive scrollbar
          interactive: true,
        },
        // Use our zoom plugin options from the hook
        zoom: getZoomPluginOptions(),
      },
      scales: {
        x: {
          type: "time",
          time: {
            // Enhanced display formats for all time scales
            displayFormats: {
              millisecond: "HH:mm:ss.SSS",
              second: "HH:mm:ss",
              minute: "HH:mm",
              hour: "HH:mm",
              day: "MMM d",
              week: "MMM d, yyyy",
              month: "MMM yyyy",
              quarter: "MMM yyyy",
              year: "yyyy",
            },
            // Dynamically adjust time unit based on zoom level
            unit: (() => {
              // If not zoomed, use auto unit
              if (!zoomState.isZoomed) return undefined;

              // Calculate time range in milliseconds
              const timeRange = zoomState.max - zoomState.min;

              // Select appropriate time unit based on zoom level
              if (timeRange < 1000) return "millisecond";
              if (timeRange < 60000) return "second";
              if (timeRange < 3600000) return "minute";
              if (timeRange < 86400000) return "hour";
              if (timeRange < 604800000) return "day";
              if (timeRange < 2592000000) return "week";
              if (timeRange < 31536000000) return "month";
              return "year";
            })(),
            // Minimum display unit (for very zoomed in views)
            minUnit: "millisecond",
            tooltipFormat: "MMM d, yyyy HH:mm:ss",
          },
          adapters: {
            date: {
              locale: enUS,
            },
          },
          title: {
            display: windowWidth >= 640,
            text: "Date",
            font: {
              size: 12,
            },
          },
          ticks: {
            maxTicksLimit: windowWidth < 640 ? 5 : 8,
            font: {
              size: windowWidth < 640 ? 8 : 10,
            },
            major: {
              enabled: true,
            },
            source: "auto",
            autoSkip: true,
            autoSkipPadding: 50,
          },
          // Apply chart view state if defined
          min: chartViewState.min ? chartViewState.min : undefined,
          max: chartViewState.max ? chartViewState.max : undefined,
        },
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: {
            display: windowWidth >= 640,
            text: "Value",
            font: {
              size: 12,
            },
          },
          ticks: {
            maxTicksLimit: windowWidth < 640 ? 5 : 8,
            font: {
              size: windowWidth < 640 ? 8 : 10,
            },
          },
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          min: 0,
          max: 14,
          title: {
            display: windowWidth >= 640,
            text: "pH",
            font: {
              size: 12,
            },
          },
          ticks: {
            maxTicksLimit: windowWidth < 640 ? 5 : 8,
            font: {
              size: windowWidth < 640 ? 8 : 10,
            },
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
      layout: {
        padding: {
          bottom: 30, // Increased padding for scrollbar
        },
      },
      onHover: (event, elements, chart) => {
        const target = event.native.target;
        if (!target) return;

        // Change cursor based on mode and interaction
        if (event.native.ctrlKey) {
          target.style.cursor = "zoom-in";
        } else {
          target.style.cursor = elements.length ? "pointer" : "grab";
        }
      },
    }),
    [
      windowWidth,
      zoomState,
      theme,
      timeFormat,
      chartViewState,
      getZoomPluginOptions,
    ]
  );

  // Add CSS styles for cursor changes and scrollbar interactions
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .chart-container {
        position: relative;
      }
      .chart-container:active {
        cursor: grabbing !important;
      }
      .chart-container.zooming {
        cursor: zoom-in !important;
      }
      /* Scrollbar styles */
      .chart-container canvas {
        margin-bottom: 20px; /* Add space for scrollbar */
      }
      /* Custom cursor for scrollbar */
      .scrollbar-grabbing {
        cursor: grabbing !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle export function
  const handleExport = useCallback(
    (format) => {
      // guard missing dataHistory series
      if (!dataHistory?.temperature && format !== "alerts-report") return;

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // For alerts report
      if (format === "alerts-report") {
        const reportData = filteredAlerts.map((alert) => ({
          timestamp: formatDate(alert.timestamp, timeFormat),
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          threshold: alert.threshold,
          status: alert.acknowledged ? "Acknowledged" : "Unacknowledged",
        }));

        // Create workbook for Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(reportData);
        XLSX.utils.book_append_sheet(wb, ws, "Alerts Report");
        XLSX.writeFile(
          wb,
          `water-quality-alerts-${startDate}-to-${endDate}.xlsx`
        );
        setShowExportOptions(false);
        return;
      }

      // DRY: filter each series using helper
      const filtered = {
        temperature: filterByDateRange(dataHistory.temperature, start, end),
        pH: filterByDateRange(dataHistory.pH, start, end),
        turbidity: filterByDateRange(dataHistory.turbidity, start, end),
        waterLevel: filterByDateRange(dataHistory.waterLevel, start, end),
      };

      // Create data for export
      const exportData = [];
      // Use optional chaining for safety
      filtered.temperature?.forEach((temp, i) => {
        if (
          filtered.pH?.[i] &&
          filtered.turbidity?.[i] &&
          filtered.waterLevel?.[i]
        ) {
          exportData.push({
            timestamp: new Date(temp.timestamp).toISOString(),
            temperature: temp.value,
            pH: filtered.pH[i].value, // Already guarded by the if condition
            turbidity: filtered.turbidity[i].value, // Already guarded by the if condition
            waterLevel: filtered.waterLevel[i].value, // Already guarded by the if condition
          });
        }
      });

      switch (format) {
        case "excel":
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(exportData);
          XLSX.utils.book_append_sheet(wb, ws, "Water Quality Data");
          XLSX.writeFile(
            wb,
            `water-quality-data-${startDate}-to-${endDate}.xlsx`
          );
          break;

        case "csv":
          const headers = [
            "Timestamp",
            "Temperature",
            "pH",
            "Turbidity",
            "Water Level",
          ];
          const csvContent = exportData.map((row) => {
            return `${row.timestamp},${row.temperature},${row.pH},${row.turbidity},${row.waterLevel}`;
          });

          const csv = [headers.join(","), ...csvContent].join("\n");

          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `water-quality-data-${startDate}-to-${endDate}.csv`;
          link.click();
          break;

        case "json":
          const jsonContent = JSON.stringify(exportData, null, 2);
          const jsonBlob = new Blob([jsonContent], {
            type: "application/json",
          });
          const jsonUrl = URL.createObjectURL(jsonBlob);
          const jsonLink = document.createElement("a");
          jsonLink.href = jsonUrl;
          jsonLink.download = `water-quality-data-${startDate}-to-${endDate}.json`;
          jsonLink.click();
          break;
      }

      setShowExportOptions(false);
    },
    [dataHistory, filteredAlerts, startDate, endDate, timeFormat]
  );

  // Load historical data from database when date range changes
  useEffect(() => {
    // Only attempt to load if useDbData is true
    if (!useDbData) return;

    const loadHistoricalData = async () => {
      setIsLoading(true);
      try {
        // Parse date strings to ensure correct format
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999); // End of the day

        const response = await waterQualityService.getHistoricalData({
          startDate: startDateObj.toISOString(),
          endDate: endDateObj.toISOString(),
          limit: 5000, // Higher limit for historical view
        });

        if (response.success && response.data.length > 0) {
          // Format data for the application
          const formattedData = {
            temperature: [],
            pH: [],
            turbidity: [],
            waterLevel: [],
          };

          response.data.forEach((item) => {
            formattedData.temperature.push({
              timestamp: new Date(item.timestamp),
              value: item.temperature,
            });
            formattedData.pH.push({
              timestamp: new Date(item.timestamp),
              value: item.pH,
            });
            formattedData.turbidity.push({
              timestamp: new Date(item.timestamp),
              value: item.turbidity,
            });
            formattedData.waterLevel.push({
              timestamp: new Date(item.timestamp),
              value: item.waterLevel,
            });
          });

          setDbDataHistory(formattedData);
        } else {
          // If no data found, clear previous data
          setDbDataHistory(null);
        }
      } catch (error) {
        console.error("Error loading historical data:", error);
        // If error, fall back to local data
        setUseDbData(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistoricalData();
  }, [startDate, endDate, useDbData]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-1 sm:gap-2">
          <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
          Historical Data
        </h1>
      </div>

      {/* Date Range Selector - More compact for mobile */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 transition-colors duration-300">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-medium dark:text-white flex items-center gap-1 sm:gap-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            Date Range
          </h2>

          {/* Add a toggle for data source */}
          <div className="flex items-center">
            <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
              <input
                type="checkbox"
                checked={useDbData}
                onChange={() => setUseDbData(!useDbData)}
                className="mr-1.5 text-blue-600"
              />
              Use Database
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-1.5 sm:p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm [color-scheme:auto]"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-1.5 sm:p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="mt-3 flex justify-center text-blue-600 dark:text-blue-400">
            <div className="animate-pulse flex space-x-1 items-center">
              <div className="h-2 w-2 bg-current rounded-full"></div>
              <div className="h-2 w-2 bg-current rounded-full"></div>
              <div className="h-2 w-2 bg-current rounded-full"></div>
              <span className="text-xs ml-2">Loading data...</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs - More compact for mobile */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <ul className="flex flex-wrap -mb-px text-xs sm:text-sm font-medium text-center">
          <li className="mr-1 sm:mr-2">
            <button
              onClick={() => setActiveTab("data")}
              className={`inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-t-lg ${
                activeTab === "data"
                  ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500"
                  : "hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300"
              }`}
            >
              <FileText className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Data
            </button>
          </li>
          <li className="mr-1 sm:mr-2">
            <button
              onClick={() => setActiveTab("alerts")}
              className={`inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-t-lg ${
                activeTab === "alerts"
                  ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500"
                  : "hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300"
              }`}
            >
              <Bell className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Alerts
            </button>
          </li>
        </ul>
      </div>

      {/* Tab Content */}
      {activeTab === "data" ? (
        // Historical Data Tab
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 transition-colors duration-300">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-medium dark:text-white">
              Data Visualization
            </h2>

            {/* Export Button */}
            <div className="relative">
              <button
                onClick={() => setShowExportOptions(!showExportOptions)}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 rounded-lg flex items-center gap-1 transition-colors text-sm"
              >
                <Download size={windowWidth < 640 ? 14 : 16} />
                <span className="hidden sm:inline">Export</span>
              </button>

              {showExportOptions && (
                <div className="absolute right-0 mt-1 w-48 sm:w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-3">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Export Options
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleExport("excel")}
                        className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <FileIcon
                          size={16}
                          className="text-green-600 dark:text-green-400"
                        />
                        Excel Spreadsheet
                      </button>
                      <button
                        onClick={() => handleExport("csv")}
                        className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <FileIcon
                          size={16}
                          className="text-blue-600 dark:text-blue-400"
                        />
                        CSV File
                      </button>
                      <button
                        onClick={() => handleExport("json")}
                        className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <FileIcon
                          size={16}
                          className="text-yellow-600 dark:text-yellow-400"
                        />
                        JSON Data
                      </button>
                      <button
                        onClick={() => handleExport("alerts-report")}
                        className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <Bell
                          size={16}
                          className="text-purple-600 dark:text-purple-400"
                        />
                        Alerts Report
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div
            ref={chartContainerRef}
            className="chart-container h-[250px] sm:h-[350px] md:h-[400px]"
          >
            {chartData ? (
              <>
                {/* Add chart control buttons */}
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-base sm:text-lg font-medium dark:text-white">
                    Data Visualization
                  </h2>

                  {/* Add zoom/pan controls */}
                  <div className="flex space-x-1">
                    <button
                      onClick={handleZoomOut}
                      className="p-1 rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      title="Zoom out"
                    >
                      <ZoomOut size={windowWidth < 640 ? 14 : 16} />
                    </button>
                    <button
                      onClick={handleZoomIn}
                      className="p-1 rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      title="Zoom in"
                    >
                      <ZoomIn size={windowWidth < 640 ? 14 : 16} />
                    </button>
                    <button
                      onClick={handlePanLeft}
                      className="p-1 rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      title="Pan left"
                    >
                      <ArrowLeft size={windowWidth < 640 ? 14 : 16} />
                    </button>
                    <button
                      onClick={handlePanRight}
                      className="p-1 rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      title="Pan right"
                    >
                      <ArrowRight size={windowWidth < 640 ? 14 : 16} />
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="p-1 rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      title="Reset view"
                    >
                      <RotateCcw size={windowWidth < 640 ? 14 : 16} />
                    </button>
                  </div>
                </div>

                <Line data={chartData} options={chartOptions} ref={chartRef} />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                No data available for the selected time range
              </div>
            )}
          </div>
        </div>
      ) : (
        // Alerts History Tab
        <div className="space-y-3 sm:space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 transition-colors duration-300">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-medium dark:text-white flex items-center gap-1 sm:gap-2">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                Alerts History
              </h2>

              {/* Filter button */}
              <div className="relative">
                <button
                  onClick={toggleFilterPanel}
                  className="flex items-center gap-1 p-1.5 rounded-md bg-gray-100 dark:bg-gray-700 transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <Filter
                    size={windowWidth < 640 ? 14 : 16}
                    className="text-gray-600 dark:text-gray-300"
                  />
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
                    Filters
                  </span>
                </button>

                {showFilters && (
                  <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 p-3">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Filter Alerts
                      </h3>
                      <button
                        onClick={toggleFilterPanel}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Parameter
                      </h4>
                      <div className="space-y-1 mb-3">
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={alertFilters.temperature}
                            onChange={() => handleFilterChange("temperature")}
                            className="mr-2 text-blue-600"
                          />
                          Temperature
                        </label>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={alertFilters.pH}
                            onChange={() => handleFilterChange("pH")}
                            className="mr-2 text-blue-600"
                          />
                          pH
                        </label>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={alertFilters.turbidity}
                            onChange={() => handleFilterChange("turbidity")}
                            className="mr-2 text-blue-600"
                          />
                          Turbidity
                        </label>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={alertFilters.waterLevel}
                            onChange={() => handleFilterChange("waterLevel")}
                            className="mr-2 text-blue-600"
                          />
                          Water Level
                        </label>
                      </div>

                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Severity
                      </h4>
                      <div className="space-y-1">
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={alertFilters.high}
                            onChange={() => handleFilterChange("high")}
                            className="mr-2 text-blue-600"
                          />
                          High
                        </label>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={alertFilters.medium}
                            onChange={() => handleFilterChange("medium")}
                            className="mr-2 text-blue-600"
                          />
                          Medium
                        </label>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={alertFilters.low}
                            onChange={() => handleFilterChange("low")}
                            className="mr-2 text-blue-600"
                          />
                          Low
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {filteredAlerts.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-2 sm:p-3 rounded-lg border text-xs sm:text-sm ${
                      alert.severity === "high"
                        ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300"
                        : alert.severity === "medium"
                        ? "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300"
                        : "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-xs opacity-75 flex-shrink-0">
                        Threshold: {alert.threshold}
                      </div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs">
                      <div className="opacity-75">
                        {formatDate(alert.timestamp, timeFormat)}
                      </div>
                      <div className="opacity-75">
                        {alert.acknowledged ? "Acknowledged" : "Unacknowledged"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 sm:p-6 text-gray-500 dark:text-gray-400 text-sm">
                No alerts found for the selected time range and filters.
              </div>
            )}
          </div>

          {/* Alert Statistics - Improved grid for mobile */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 transition-colors duration-300">
            <h2 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 dark:text-white">
              Alert Statistics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <div className="p-2 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total Alerts
                </h3>
                <div className="text-xl sm:text-2xl font-bold">
                  {filteredAlerts.length}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  In selected period
                </div>
              </div>

              <div className="p-2 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  High Severity
                </h3>
                <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                  {filteredAlerts.filter((a) => a.severity === "high").length}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Critical issues
                </div>
              </div>

              <div className="p-2 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Medium Severity
                </h3>
                <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {filteredAlerts.filter((a) => a.severity === "medium").length}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Warning issues
                </div>
              </div>

              <div className="p-2 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unacknowledged
                </h3>
                <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {filteredAlerts.filter((a) => !a.acknowledged).length}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Require attention
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// PropTypes
History.propTypes = {
  dataHistory: PropTypes.shape({
    temperature: PropTypes.array.isRequired,
    pH: PropTypes.array.isRequired,
    turbidity: PropTypes.array.isRequired,
    waterLevel: PropTypes.array.isRequired,
  }),
  thresholds: PropTypes.shape({
    temperature: PropTypes.shape({
      low: PropTypes.number,
      high: PropTypes.number,
    }),
    pH: PropTypes.shape({ low: PropTypes.number, high: PropTypes.number }),
    turbidity: PropTypes.shape({
      low: PropTypes.number,
      high: PropTypes.number,
    }),
    waterLevel: PropTypes.shape({
      low: PropTypes.number,
      high: PropTypes.number,
    }),
  }).isRequired,
  windowWidth: PropTypes.number,
};
History.defaultProps = {
  dataHistory: {
    temperature: [],
    pH: [],
    turbidity: [],
    waterLevel: [],
  },
  windowWidth: null,
};
