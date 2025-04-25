import { useState, useMemo, useEffect, useContext } from "react";
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
  Filler,
  TimeScale,
} from "chart.js";
import { enUS } from "date-fns/locale";
import "chartjs-adapter-date-fns";
import { Line, Bar, Scatter } from "react-chartjs-2";
import {
  LineChart as LineIcon,
  BarChart as BarIcon,
  Activity,
  Square,
  Grid,
  Calendar,
  ArrowDownUp,
  X,
  RefreshCw,
  Info,
} from "lucide-react";
import regression from "regression";
import { SettingsContext } from "../App";
import { waterQualityService } from "../services/apiService";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

const CHART_TYPES = [
  { id: "line", label: "Line", icon: LineIcon },
  { id: "bar", label: "Bar", icon: BarIcon },
  { id: "area", label: "Area", icon: Square },
  { id: "scatter", label: "Scatter", icon: Grid },
];

const TIME_RANGES = [
  { id: "1m", label: "Last Minute" },
  { id: "5m", label: "Last 5 Minutes" },
  { id: "15m", label: "Last 15 Minutes" },
  { id: "1h", label: "Last Hour" },
  { id: "day", label: "Last 24 Hours" },
  { id: "week", label: "Last Week" },
  { id: "month", label: "Last Month" },
  { id: "year", label: "Last Year" },
  { id: "custom", label: "Custom Range" },
];

export function AdvancedCharts() {
  const { units, timeFormat, timezone } = useContext(SettingsContext);
  const [chartType, setChartType] = useState("scatter");
  const [timeRange, setTimeRange] = useState("5m");
  const [xVariable, setXVariable] = useState("temperature");
  const [yVariable, setYVariable] = useState("pH");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataHistory, setDataHistory] = useState({
    temperature: [],
    pH: [],
    turbidity: [],
    waterLevel: [],
  });

  const [dbMetadata, setDbMetadata] = useState({
    loading: true,
    totalRecords: 0,
    earliestTimestamp: null,
    latestTimestamp: null,
    deviceCount: 0,
    showInfo: true,
  });

  // Reset error when chart parameters change
  useEffect(() => {
    setError(null);
  }, [chartType, timeRange, xVariable, yVariable]);

  // Log chart type changes
  useEffect(() => {
    console.log(`Chart type changed to: ${chartType}`);
  }, [chartType]);

  // Add a useEffect to ensure proper cleanup of chart instances when chart type changes
  useEffect(() => {
    // Clean up function to destroy charts when unmounting or changing chart type
    return () => {
      try {
        // Get all chart instances and destroy them
        const chartElements = document.querySelectorAll('canvas');
        chartElements.forEach(canvas => {
          if (canvas.__chartjs__?.chart) {
            canvas.__chartjs__.chart.destroy();
          }
        });
        
        console.log("[DEBUG] Cleaned up Chart.js instances on chart type change");
      } catch (err) {
        console.error("Error destroying chart instances:", err);
      }
    };
  }, [chartType]);

  // Fetch database metadata on component mount
  useEffect(() => {
    fetchDatabaseMetadata();
  }, []);

  // Define fetchDatabaseMetadata as an async function
  const fetchDatabaseMetadata = async () => {
    try {
      // Try to get all data with limit
      const allDataResponse = await waterQualityService.getAllData({
        fields: "id,timestamp,deviceId", // Only request minimal fields
        limit: 10000 // Limit to avoid huge response
      });
      
      console.log("[DEBUG] Database metadata raw response:", allDataResponse);
      
      // Extract data array from response object - backend returns {success, count, data}
      const allData = allDataResponse.data || [];
      
      if (!Array.isArray(allData) || allData.length === 0) {
        console.log("[DEBUG] No data found in database or invalid response format");
        setDbMetadata({
          loading: false,
          totalRecords: 0,
          earliestTimestamp: null,
          latestTimestamp: null,
          deviceCount: 0,
          showInfo: true,
        });
        return;
      }

      const totalRecords = allData.length;
      console.log(`[DEBUG] Found ${totalRecords} total records in database`);

      // Sort timestamps to find earliest and latest
      const timestamps = allData.map(item => new Date(item.timestamp));
      const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

      const earliestTimestamp = sortedTimestamps[0];
      const latestTimestamp = sortedTimestamps[sortedTimestamps.length - 1];
      
      // Get unique device count
      const uniqueDevices = new Set(allData.map(item => item.deviceId).filter(Boolean));
      const deviceCount = uniqueDevices.size;
      
      console.log(`[DEBUG] Date range: ${earliestTimestamp} to ${latestTimestamp}`);
      console.log(`[DEBUG] Found ${deviceCount} unique devices`);
      
      setDbMetadata({
        loading: false,
        totalRecords,
        earliestTimestamp,
        latestTimestamp,
        deviceCount,
        showInfo: true,
      });
    } catch (err) {
      console.error("[ERROR] Failed to fetch database metadata:", err);
      setDbMetadata({
        loading: false,
        error: err.message || "Failed to fetch database metadata",
        showInfo: true,
      });
    }
  };

  // Fetch data from the database based on time range
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let startDate, endDate;

      if (timeRange === "custom" && customStartDate && customEndDate) {
        startDate = new Date(customStartDate).toISOString();
        endDate = new Date(customEndDate).toISOString();
      } else {
        const now = new Date();
        endDate = now.toISOString();

        const ranges = {
          "1m": 60 * 1000,
          "5m": 5 * 60 * 1000,
          "15m": 15 * 60 * 1000,
          "1h": 60 * 60 * 1000,
          day: 24 * 60 * 60 * 1000,
          week: 7 * 24 * 60 * 60 * 1000,
          month: 30 * 24 * 60 * 60 * 1000,
          year: 365 * 24 * 60 * 60 * 1000,
        };

        const rangeMs = ranges[timeRange] || ranges["day"];
        startDate = new Date(now.getTime() - rangeMs).toISOString();
      }
      
      // Log query parameters
      console.log("[DEBUG] Fetching data with parameters:", {
        startDate,
        endDate,
        timeRange,
        deviceId: "esp32-sample"
      });
      
      // Try direct API endpoint first (better for time ranges)
      let response;
      try {
        console.log("[DEBUG] Trying /data endpoint with time range filter");
        response = await waterQualityService.getAllData({
          startDate,
          endDate,
          deviceId: "esp32-sample",
          limit: 5000 // Larger limit to ensure we get enough data
        });
        console.log("[DEBUG] /data response:", response);
      } catch (err) {
        console.log("[DEBUG] /data endpoint failed, trying /data/range");
        // Fallback to range endpoint if first fails
        response = await waterQualityService.getHistoricalData({
          startDate,
          endDate,
          deviceId: "esp32-sample",
        });
        console.log("[DEBUG] /data/range response:", response);
      }

      // Final fallback - fetch all data if nothing else works
      if (!response || !response.data || response.data.length === 0) {
        console.log("[DEBUG] No data returned for time range, trying to fetch limited data");
        response = await waterQualityService.getAllData({
          deviceId: "esp32-sample",
          limit: 1000
        });
        console.log("[DEBUG] Fallback all data response:", response);
        
        // Since we're using all data, we need to manually filter by time range
        if (response && response.data && response.data.length > 0) {
          console.log("[DEBUG] Manually filtering data by time range");
          const startTime = new Date(startDate).getTime();
          const endTime = new Date(endDate).getTime();
          
          response.data = response.data.filter(item => {
            const itemTime = new Date(item.timestamp).getTime();
            return itemTime >= startTime && itemTime <= endTime;
          });
          
          console.log(`[DEBUG] Filtered to ${response.data.length} items in time range`);
        }
      }

      console.log("[DEBUG] Final API response:", response);
      
      const transformed = transformApiDataToChartFormat(response);
      setDataHistory(transformed);
    } catch (err) {
      console.error("[ERROR] Failed to fetch data:", err);
      setError("Failed to fetch data from the database. " + (err.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to transform API response to chart format
  const transformApiDataToChartFormat = (apiResponse) => {
    console.log("[DEBUG] API Response structure:", JSON.stringify(apiResponse));
    
    // Check if the response has the expected structure
    if (!apiResponse || typeof apiResponse !== 'object') {
      console.error("[ERROR] Invalid API response format:", apiResponse);
      return {
        temperature: [],
        pH: [],
        turbidity: [],
        waterLevel: [],
      };
    }
    
    // Handle the case where API returns {success, count, data} format
    const apiData = apiResponse.data || apiResponse;
    
    if (!Array.isArray(apiData)) {
      console.error("[ERROR] API data is not an array:", apiData);
      return {
        temperature: [],
        pH: [],
        turbidity: [],
        waterLevel: [],
      };
    }
    
    console.log(`[DEBUG] Processing ${apiData.length} data points from API`);
    
    // Initialize result object
    const result = {
      temperature: [],
      pH: [],
      turbidity: [],
      waterLevel: [],
    };
    
    // Process each data point from the API
    apiData.forEach((item, index) => {
      if (index < 3) {
        console.log(`[DEBUG] Sample data point ${index}:`, item);
      }
      
      const timestamp = new Date(item.timestamp);
      
      // Push each metric with its timestamp
      if (item.temperature !== null && item.temperature !== undefined) {
        result.temperature.push({ timestamp, value: item.temperature });
      }
      
      if (item.pH !== null && item.pH !== undefined) {
        result.pH.push({ timestamp, value: item.pH });
      }
      
      if (item.turbidity !== null && item.turbidity !== undefined) {
        result.turbidity.push({ timestamp, value: item.turbidity });
      }
      
      // Check if water_level exists (might have different property name)
      if (item.waterLevel !== null && item.waterLevel !== undefined) {
        result.waterLevel.push({ timestamp, value: item.waterLevel });
      } else if (item.water_level !== null && item.water_level !== undefined) {
        result.waterLevel.push({ timestamp, value: item.water_level });
      }
    });
    
    // Log summary of processed data
    console.log(`[DEBUG] Transformed data summary: 
      Temperature: ${result.temperature.length} points
      pH: ${result.pH.length} points
      Turbidity: ${result.turbidity.length} points
      Water Level: ${result.waterLevel.length} points
    `);
    
    return result;
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  // Add effect to refetch data when variables change for non-scatter charts
  useEffect(() => {
    if (chartType !== "scatter" && (chartType === "line" || chartType === "bar" || chartType === "area")) {
      console.log(`[DEBUG] Variable changed to ${xVariable} for ${chartType} chart, refetching data`);
      fetchData();
    }
  }, [xVariable, chartType]);

  const applyCustomRange = () => {
    if (customStartDate && customEndDate) {
      fetchData();
    }
  };

  const formatHumanDate = (date) => {
    if (!date) return "N/A";

    try {
      const options = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: timeFormat === "12h",
      };

      return new Date(date).toLocaleString("en-US", options);
    } catch (err) {
      return "Invalid date";
    }
  };

  // Format a date using the application's timezone and time format
  const formatFullDate = (date) => {
    if (!date) return "N/A";

    try {
      const options = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: timeFormat === "12h",
        timeZone: timezone || "UTC",
      };

      return new Intl.DateTimeFormat("en-US", options).format(date);
    } catch (err) {
      console.error("Error formatting date:", err);
      return date.toString();
    }
  };

  try {
    const VARIABLES = useMemo(
      () => [
        {
          id: "temperature",
          label: "Temperature",
          unit: units.temperature === "C" ? "°C" : "°F",
          color: "#ef4444",
        },
        { id: "pH", label: "pH", unit: "", color: "#3b82f6" },
        {
          id: "turbidity",
          label: "Turbidity",
          unit: units.turbidity,
          color: "#10b981",
        },
        {
          id: "waterLevel",
          label: "Water Level",
          unit: units.waterLevel,
          color: "#8b5cf6",
        },
      ],
      [units]
    );

    // Initialize custom date range when selected
    useEffect(() => {
      if (timeRange === "custom") {
        setShowCustomRange(true);
        // Set defaults if not already set
        if (!customEndDate) {
          const now = new Date();
          setCustomEndDate(formatDateTime(now));

          // Default start date to 24 hours before
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          setCustomStartDate(formatDateTime(yesterday));
        }
      } else {
        setShowCustomRange(false);
      }
    }, [timeRange]);

    // Format a date using the application's timezone and time format
    const formatDate = (date) => {
      if (!date) return "";

      try {
        // Ensure date is a Date object
        const dateObj = date instanceof Date ? date : new Date(date);

        // Check if date is valid
        if (isNaN(dateObj.getTime())) {
          return "Invalid date";
        }

        const options = {
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
          hour12: timeFormat === "12h",
          timeZone: timezone || "UTC",
        };

        return new Intl.DateTimeFormat("en-US", options).format(dateObj);
      } catch (error) {
        console.error("Error formatting date:", error);
        // Fallback format
        try {
          const dateObj = date instanceof Date ? date : new Date(date);
          return dateObj.toLocaleTimeString();
        } catch (e) {
          return "Date error";
        }
      }
    };

    // Helper to format date for datetime-local input
    const formatDateTime = (date) => {
      return date.toISOString().slice(0, 16);
    };

    // Function to convert units based on user preferences
    const convertUnits = (data) => {
      if (!data) return data;

      const result = { ...data };

      // Convert temperature if needed
      if (units.temperature === "F" && data.temperature) {
        result.temperature = data.temperature.map((item) => ({
          ...item,
          value: (item.value * 9) / 5 + 32,
        }));
      }

      return result;
    };

    // Filter and convert data based on time range and units
    const filteredData = useMemo(() => {
      if (!dataHistory || !dataHistory.temperature) {
        console.log("[DEBUG] No data history available for filtering");
        return {
          temperature: [],
          pH: [],
          turbidity: [],
          waterLevel: [],
        };
      }

      return convertUnits(dataHistory);
    }, [dataHistory, units]);

    // Calculate range statistics - MOVED HERE AFTER filteredData IS DEFINED
    const rangeMetadata = useMemo(() => {
      if (!filteredData || Object.values(filteredData).every(arr => arr.length === 0)) {
        return null;
      }

      // Get all timestamps across all variables to determine range timespan
      const allTimestamps = [];
      Object.values(filteredData).forEach(dataset => {
        dataset.forEach(point => {
          if (point.timestamp) {
            const timestamp = point.timestamp instanceof Date 
              ? point.timestamp 
              : new Date(point.timestamp);
              
            if (!isNaN(timestamp.getTime())) {
              allTimestamps.push(timestamp.getTime());
            }
          }
        });
      });

      if (allTimestamps.length === 0) return null;

      // Calculate range statistics
      const startTime = new Date(Math.min(...allTimestamps));
      const endTime = new Date(Math.max(...allTimestamps));
      const durationMs = endTime - startTime;
      
      // Calculate duration in appropriate units
      let duration, durationUnit;
      if (durationMs < 60 * 1000) { // Less than a minute
        duration = Math.round(durationMs / 1000);
        durationUnit = "seconds";
      } else if (durationMs < 60 * 60 * 1000) { // Less than an hour
        duration = Math.round(durationMs / (60 * 1000));
        durationUnit = "minutes";
      } else if (durationMs < 24 * 60 * 60 * 1000) { // Less than a day
        duration = Math.round(durationMs / (60 * 60 * 1000) * 10) / 10;
        durationUnit = "hours";
      } else { // Days or more
        duration = Math.round(durationMs / (24 * 60 * 60 * 1000) * 10) / 10;
        durationUnit = "days";
      }

      // Count data points for each variable
      const pointCounts = {};
      Object.entries(filteredData).forEach(([key, dataset]) => {
        pointCounts[key] = dataset.length;
      });

      // Get the common sampling interval (if consistent)
      let samplingInterval = "Varied";
      let samplingIntervalUnit = "";
      
      // Look at temperature timestamps as a representative dataset
      if (filteredData.temperature && filteredData.temperature.length > 5) {
        const timestamps = filteredData.temperature
          .map(d => d.timestamp instanceof Date ? d.timestamp.getTime() : new Date(d.timestamp).getTime())
          .sort((a, b) => a - b);
        
        // Calculate intervals between consecutive timestamps
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
          intervals.push(timestamps[i] - timestamps[i-1]);
        }
        
        // Check if intervals are mostly consistent
        const averageInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
        const intervalVariance = intervals
          .map(interval => Math.pow(interval - averageInterval, 2))
          .reduce((sum, val) => sum + val, 0) / intervals.length;
        
        // If relatively consistent (coefficient of variation < 0.2)
        if (Math.sqrt(intervalVariance) / averageInterval < 0.2) {
          if (averageInterval < 2000) { // ms
            samplingInterval = Math.round(averageInterval);
            samplingIntervalUnit = "milliseconds";
          } else if (averageInterval < 120000) { // seconds
            samplingInterval = Math.round(averageInterval / 1000);
            samplingIntervalUnit = "seconds";
          } else if (averageInterval < 7200000) { // minutes
            samplingInterval = Math.round(averageInterval / 60000);
            samplingIntervalUnit = "minutes";
          } else if (averageInterval < 172800000) { // hours
            samplingInterval = Math.round(averageInterval / 3600000);
            samplingIntervalUnit = "hours";
          } else { // days
            samplingInterval = Math.round(averageInterval / 86400000);
            samplingIntervalUnit = "days";
          }
        }
      }
      
      return {
        startTime,
        endTime,
        duration,
        durationUnit,
        pointCounts,
        totalPoints: Object.values(pointCounts).reduce((sum, count) => sum + count, 0),
        samplingInterval,
        samplingIntervalUnit
      };
    }, [filteredData]);

    // Prepare data points for charts
    const dataPoints = useMemo(() => {
      if (!filteredData || !filteredData[xVariable] || !filteredData[yVariable]) {
        console.log("[DEBUG] Missing data for variables:", xVariable, yVariable);
        return [];
      }

      console.log(`[DEBUG] Preparing data points with ${filteredData[xVariable].length} ${xVariable} points and ${filteredData[yVariable].length} ${yVariable} points`);

      // For scatter plots, match timestamps across variables
      if (chartType === "scatter") {
        // Create a map of timestamps to values for the Y variable
        const yValuesMap = new Map(
          filteredData[yVariable].map((item) => [
            item.timestamp instanceof Date
              ? item.timestamp.getTime()
              : new Date(item.timestamp).getTime(),
            item.value,
          ])
        );

        // Match X and Y values based on timestamp
        return filteredData[xVariable]
          .filter((xItem) => {
            const timestamp =
              xItem.timestamp instanceof Date
                ? xItem.timestamp.getTime()
                : new Date(xItem.timestamp).getTime();
            return yValuesMap.has(timestamp);
          })
          .map((xItem) => {
            const timestamp =
              xItem.timestamp instanceof Date
                ? xItem.timestamp.getTime()
                : new Date(xItem.timestamp).getTime();
            return {
              x: xItem.value,
              y: yValuesMap.get(timestamp),
              timestamp:
                xItem.timestamp instanceof Date
                  ? xItem.timestamp
                  : new Date(xItem.timestamp),
            };
          });
      }

      // For time series charts, we just need the values from the selected variable
      return filteredData[xVariable].map((item) => ({
        x:
          item.timestamp instanceof Date
            ? item.timestamp
            : new Date(item.timestamp),
        y: item.value,
      }));
    }, [filteredData, xVariable, yVariable, chartType]);

    console.log(`[DEBUG] Generated ${dataPoints.length} data points for chart`);

    // Calculate statistics
    const stats = useMemo(() => {
      if (dataPoints.length === 0) return null;

      let xValues, yValues;

      if (chartType === "scatter") {
        xValues = dataPoints.map((d) => d.x);
        yValues = dataPoints.map((d) => d.y);
      } else {
        xValues = filteredData[xVariable]?.map((d) => d.value) || [];
        yValues = filteredData[yVariable]?.map((d) => d.value) || [];
      }

      if (xValues.length === 0 || yValues.length === 0) return null;

      // Filter out NaN values
      xValues = xValues.filter((v) => !isNaN(v) && v !== null);
      yValues = yValues.filter((v) => !isNaN(v) && v !== null);

      if (xValues.length === 0 || yValues.length === 0) return null;

      const xMean = xValues.reduce((a, b) => a + b, 0) / xValues.length;
      const yMean = yValues.reduce((a, b) => a + b, 0) / yValues.length;

      const xVariance =
        xValues.reduce((a, b) => a + Math.pow(b - xMean, 2), 0) /
        xValues.length;
      const yVariance =
        yValues.reduce((a, b) => a + Math.pow(b - yMean, 2), 0) /
        yValues.length;

      const xStd = Math.sqrt(xVariance);
      const yStd = Math.sqrt(yVariance);

      // Calculate correlation coefficient with protection against division by zero
      let correlation = 0;
      if (xValues.length === yValues.length && xStd > 0 && yStd > 0) {
        correlation =
          xValues.reduce((acc, _, i) => {
            return acc + (xValues[i] - xMean) * (yValues[i] - yMean);
          }, 0) /
          (xValues.length * xStd * yStd);
      }

      return {
        xMean: xMean.toFixed(2),
        yMean: yMean.toFixed(2),
        xStd: xStd.toFixed(2),
        yStd: yStd.toFixed(2),
        correlation: correlation.toFixed(2),
      };
    }, [dataPoints, filteredData, xVariable, yVariable, chartType]);

    // Calculate regression line for scatter plot
    const regressionLine = useMemo(() => {
      if (chartType !== "scatter" || dataPoints.length < 2) return null;

      try {
        const points = dataPoints.map((d) => [d.x, d.y]);
        const result = regression.linear(points);

        const xValues = points.map((p) => p[0]);
        const xMin = Math.min(...xValues);
        const xMax = Math.max(...xValues);

        return {
          points: [
            { x: xMin, y: result.predict(xMin)[1] },
            { x: xMax, y: result.predict(xMax)[1] },
          ],
          r2: result.r2,
        };
      } catch (error) {
        console.error("Regression calculation error:", error);
        return null;
      }
    }, [dataPoints, chartType]);

    // Prepare chart data
    const chartData = useMemo(() => {
      if (dataPoints.length === 0) {
        console.log("[DEBUG] No data points available for chart");
        return {
          datasets: [],
        };
      }

      console.log(`[DEBUG] Creating chart data for ${chartType} with ${dataPoints.length} points`);

      if (chartType === "scatter") {
        return {
          datasets: [
            {
              label: "Data Points",
              data: dataPoints.map((d) => ({ x: d.x, y: d.y })),
              backgroundColor: VARIABLES.find((v) => v.id === yVariable).color,
              pointRadius: 4,
            },
            regressionLine && {
              label: `Regression Line${
                regressionLine.r2
                  ? ` (R² = ${regressionLine.r2.toFixed(3)})`
                  : ""
              }`,
              data: regressionLine.points,
              type: "line",
              borderColor: "rgba(0, 0, 0, 0.5)",
              borderWidth: 1,
              pointRadius: 0,
              fill: false,
            },
          ].filter(Boolean),
        };
      }

      // For time series charts - properly format data for line, bar, and area charts
      return {
        datasets: [
          {
            label: VARIABLES.find((v) => v.id === xVariable).label,
            data: dataPoints.map((d) => ({
              x: d.x,  // Keep as Date object for proper time scale
              y: d.y,
            })),
            borderColor: VARIABLES.find((v) => v.id === xVariable).color,
            backgroundColor: chartType === "area"
              ? `${VARIABLES.find((v) => v.id === xVariable).color}33`
              : chartType === "bar" 
                ? `${VARIABLES.find((v) => v.id === xVariable).color}CC`
                : VARIABLES.find((v) => v.id === xVariable).color,
            fill: chartType === "area",
            tension: 0.4,
            borderWidth: chartType === "bar" ? 1 : 2,
            pointRadius: chartType === "line" ? 2 : 0,
          },
        ],
      };
    }, [dataPoints, chartType, xVariable, yVariable, regressionLine, VARIABLES]);

    // Function to determine appropriate time units based on time range
    const getTimeConfig = (range, chartType, timeFormat, dataPoints) => {
      // Default config for scatter plots (not time-based)
      if (chartType === "scatter") return {};

      // Calculate actual time span of data points
      let minTime = Infinity;
      let maxTime = -Infinity;
      let timeSpanMs = 0;
      
      if (dataPoints && dataPoints.length > 1) {
        dataPoints.forEach(point => {
          if (point.x instanceof Date) {
            const timestamp = point.x.getTime();
            minTime = Math.min(minTime, timestamp);
            maxTime = Math.max(maxTime, timestamp);
          }
        });
        
        // If we have valid data points, calculate the time span
        if (minTime !== Infinity && maxTime !== -Infinity) {
          timeSpanMs = maxTime - minTime;
          console.log(`[DEBUG] Data time span: ${timeSpanMs}ms (${timeSpanMs / (24 * 60 * 60 * 1000)} days)`);
        }
      }

      // For time-based charts, determine units based on selected range
      let unit = "minute";
      let tooltipFormat = timeFormat === "12h" ? "MMM d, h:mm a" : "MMM d, HH:mm";
      let displayFormats = {
        minute: timeFormat === "12h" ? "h:mm a" : "HH:mm",
        hour: timeFormat === "12h" ? "h:mm a" : "HH:mm",
        day: "MMM d",
        second: "HH:mm:ss",
        millisecond: "HH:mm:ss.SSS",
        week: "MMM d",
        month: "MMM yyyy",
        quarter: "MMM yyyy",
        year: "yyyy"
      };

      // Adjust units based on data time span rather than selected range
      if (timeSpanMs > 0) {
        if (timeSpanMs < 2 * 60 * 1000) { // < 2 minutes
          unit = "second";
          tooltipFormat = "HH:mm:ss";
        } else if (timeSpanMs < 2 * 60 * 60 * 1000) { // < 2 hours
          unit = "minute";
          tooltipFormat = timeFormat === "12h" ? "h:mm a" : "HH:mm";
        } else if (timeSpanMs < 2 * 24 * 60 * 60 * 1000) { // < 2 days
          unit = "hour";
          tooltipFormat = timeFormat === "12h" ? "MMM d, h a" : "MMM d, HH:00";
        } else if (timeSpanMs < 2 * 7 * 24 * 60 * 60 * 1000) { // < 2 weeks
          unit = "day";
          tooltipFormat = "MMM d";
        } else if (timeSpanMs < 2 * 30 * 24 * 60 * 60 * 1000) { // < 2 months
          unit = "week";
          tooltipFormat = "MMM d";
        } else if (timeSpanMs < 2 * 365 * 24 * 60 * 60 * 1000) { // < 2 years
          unit = "month";
          tooltipFormat = "MMM yyyy";
        } else {
          unit = "year";
          tooltipFormat = "yyyy";
        }
        
        console.log(`[DEBUG] Selected time unit based on data span: ${unit}`);
      } else {
        // Fallback to time range selection if data span calculation failed
        if (range === "1m" || range === "5m") {
          unit = "second";
          tooltipFormat = "HH:mm:ss";
        } else if (range === "15m" || range === "1h") {
          unit = "minute";
          tooltipFormat = timeFormat === "12h" ? "h:mm:ss a" : "HH:mm:ss";
        } else if (range === "day") {
          unit = "hour";
        } else if (range === "week" || range === "month") {
          unit = "day";
        } else if (range === "year") {
          unit = "month";
          displayFormats.month = "MMM yyyy";
          tooltipFormat = "MMM yyyy";
        }
      }

      return {
        unit,
        tooltipFormat,
        displayFormats,
      };
    };

    // Chart options with timezone support
    const options = useMemo(() => {
      console.log("[DEBUG] Generating chart options for type:", chartType);
      
      const timeConfig = getTimeConfig(timeRange, chartType, timeFormat, dataPoints);

      const baseOptions = {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.2,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top",
            align: "start",
            labels: {
              boxWidth: 12,
              padding: 6,
              usePointStyle: true,
              font: {
                size: 10,
              },
            },
            margin: 4,
          },
          title: {
            display: true,
            text:
              chartType === "scatter"
                ? `${VARIABLES.find((v) => v.id === yVariable).label} vs ${
                    VARIABLES.find((v) => v.id === xVariable).label
                  }`
                : VARIABLES.find((v) => v.id === yVariable).label,
            font: {
              size: 12,
            },
            padding: {
              top: 8,
              bottom: 8,
            },
          },
          tooltip: {
            callbacks: {
              title: (tooltipItems) => {
                if (chartType === "scatter") {
                  return "";
                }

                try {
                  const item = tooltipItems[0];
                  const dataPoint = dataPoints[item.dataIndex];
                  return dataPoint && dataPoint.x
                    ? formatDate(dataPoint.x)
                    : "";
                } catch (error) {
                  console.error("Error formatting tooltip title:", error);
                  return "";
                }
              },
            },
          },
        },
        layout: {
          padding: 0,
        },
      };

      if (chartType === "scatter") {
        return {
          ...baseOptions,
          scales: {
            x: {
              type: "linear",
              position: "bottom",
              title: {
                display: true,
                text: `${VARIABLES.find((v) => v.id === xVariable).label} ${
                  VARIABLES.find((v) => v.id === xVariable).unit
                }`,
                font: {
                  size: 10,
                },
                padding: 4,
              },
              ticks: {
                maxTicksLimit: 8,
                padding: 3,
                font: {
                  size: 9,
                },
              },
            },
            y: {
              title: {
                display: true,
                text: `${VARIABLES.find((v) => v.id === yVariable).label} ${
                  VARIABLES.find((v) => v.id === yVariable).unit
                }`,
                font: {
                  size: 10,
                },
                padding: 4,
              },
              ticks: {
                maxTicksLimit: 8,
                padding: 3,
                font: {
                  size: 9,
                },
              },
            },
          },
        };
      }

      return {
        ...baseOptions,
        scales: {
          x: {
            type: "time",
            time: {
              unit: timeConfig.unit || "minute",
              displayFormats: timeConfig.displayFormats || {
                minute: timeFormat === "12h" ? "h:mm a" : "HH:mm",
                hour: timeFormat === "12h" ? "h:mm a" : "HH:mm",
                day: "MMM d",
                second: "HH:mm:ss",
                millisecond: "HH:mm:ss.SSS",
              },
              tooltipFormat: timeConfig.tooltipFormat,
            },
            adapters: {
              date: {
                locale: enUS,
              },
            },
            title: {
              display: true,
              text: "Time",
              font: {
                size: 10,
              },
              padding: 4,
            },
            ticks: {
              maxTicksLimit: 6,
              autoSkip: true,
              padding: 3,
              font: {
                size: 9,
              },
            },
          },
          y: {
            title: {
              display: true,
              text: `${VARIABLES.find((v) => v.id === yVariable).label} ${
                VARIABLES.find((v) => v.id === yVariable).unit
              }`,
              font: {
                size: 10,
              },
              padding: 4,
            },
            ticks: {
              maxTicksLimit: 8,
              padding: 3,
              font: {
                size: 9,
              },
            },
          },
        },
      };
    }, [chartType, xVariable, yVariable, VARIABLES, timeFormat, dataPoints, timeRange]);

    // Effect to update chart with appropriate time unit when time range changes
    useEffect(() => {
      if (chartType !== "scatter") {
        try {
          // Use a safer way to access the chart instance
          const chartElements = document.querySelectorAll("canvas");
          for (const canvas of chartElements) {
            if (canvas.__chartjs__?.chart) {
              const chart = canvas.__chartjs__.chart;
              const timeConfig = getTimeConfig(
                timeRange,
                chartType,
                timeFormat,
                dataPoints
              );

              // Update chart time settings if applicable
              if (chart.options?.scales?.x?.time) {
                chart.options.scales.x.time.unit = timeConfig.unit || "minute";
                chart.options.scales.x.time.tooltipFormat =
                  timeConfig.tooltipFormat;

                if (timeConfig.displayFormats) {
                  Object.assign(
                    chart.options.scales.x.time.displayFormats || {},
                    timeConfig.displayFormats
                  );
                }

                // Force update
                chart.update("none");
              }
            }
          }
        } catch (error) {
          console.error("Error updating chart time unit:", error);
          // Don't let errors crash the component
        }
      }
    }, [timeRange, chartType, timeFormat, dataPoints]);

    return (
      <div className="space-y-6">
        {dbMetadata.showInfo && (
          <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 p-4 rounded-lg border border-blue-200 dark:border-blue-800 flex items-start">
            <Info size={20} className="mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-grow">
              <h3 className="font-medium mb-2 flex justify-between items-center">
                <span>Database Information</span>
                <button
                  onClick={() =>
                    setDbMetadata((prev) => ({ ...prev, showInfo: false }))
                  }
                  className="text-blue-400 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-100"
                >
                  <X size={16} />
                </button>
              </h3>

              {dbMetadata.loading ? (
                <p className="text-sm">Loading database information...</p>
              ) : dbMetadata.error ? (
                <p className="text-sm">{dbMetadata.error}</p>
              ) : (
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Total Records:</strong>{" "}
                    {dbMetadata.totalRecords.toLocaleString()}
                  </p>
                  <p>
                    <strong>Data Range:</strong>{" "}
                    {formatHumanDate(dbMetadata.earliestTimestamp)} to{" "}
                    {formatHumanDate(dbMetadata.latestTimestamp)}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Use the selectors below to analyze data within this range.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <h3 className="font-medium mb-2">Error</h3>
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-md text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 transition-colors duration-300">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
            <div>
              <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chart Type
              </h3>
              <div className="flex space-x-1">
                {CHART_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setChartType(type.id)}
                    className={`p-1 rounded-md flex items-center justify-center ${
                      chartType === type.id
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    }`}
                    title={type.label}
                  >
                    <type.icon size={16} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-40">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm py-1"
                >
                  {TIME_RANGES.map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-40">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {chartType === "scatter" ? "X Variable" : "Variable"}
                </label>
                <select
                  value={xVariable}
                  onChange={(e) => setXVariable(e.target.value)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm py-1"
                >
                  {VARIABLES.map((variable) => (
                    <option key={variable.id} value={variable.id}>
                      {variable.label}
                    </option>
                  ))}
                </select>
              </div>

              {chartType === "scatter" && (
                <div className="w-full sm:w-40">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Y Variable
                  </label>
                  <select
                    value={yVariable}
                    onChange={(e) => setYVariable(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm py-1"
                  >
                    {VARIABLES.map((variable) => (
                      <option key={variable.id} value={variable.id}>
                        {variable.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={fetchData}
                disabled={isLoading}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-1"
                title="Refresh Data"
              >
                <RefreshCw
                  size={14}
                  className={isLoading ? "animate-spin" : ""}
                />
                {isLoading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {showCustomRange && (
            <div className="mt-4 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Custom Time Range
                </h3>
                <button
                  onClick={() => {
                    setTimeRange("day");
                    setShowCustomRange(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm py-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm py-1"
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  onClick={applyCustomRange}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Apply Range
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 transition-colors duration-300 overflow-hidden">
          <div className="h-[320px] sm:h-[370px] md:h-[420px]">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <RefreshCw size={36} className="animate-spin mb-4" />
                <p>Loading chart data...</p>
              </div>
            ) : dataPoints && dataPoints.length > 0 ? (
              <>
                {(() => {
                  try {
                    if (chartType === "scatter") {
                      return <Scatter options={options} data={chartData} />;
                    } else if (chartType === "bar") {
                      return <Bar options={options} data={chartData} />;
                    } else {
                      return <Line options={options} data={chartData} />;
                    }
                  } catch (error) {
                    console.error("Error rendering chart:", error);
                    return (
                      <div className="h-full flex flex-col items-center justify-center text-red-500 dark:text-red-400 p-5">
                        <p className="font-medium mb-2">
                          Error rendering chart
                        </p>
                        <p className="text-sm text-center">
                          There was a problem displaying this chart. Please try
                          changing the parameters or refreshing the page.
                        </p>
                      </div>
                    );
                  }
                })()}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-5">
                <Calendar size={36} className="mb-3 opacity-50" />
                <p className="font-medium mb-2">No Data Available</p>
                <p className="text-sm text-center">
                  {chartType === "scatter" ? (
                    <>
                      No matching data points found where both{" "}
                      <span className="font-medium">
                        {VARIABLES.find(v => v.id === xVariable)?.label}
                      </span>{" "}
                      and{" "}
                      <span className="font-medium">
                        {VARIABLES.find(v => v.id === yVariable)?.label}
                      </span>{" "}
                      have values at the same timestamps.
                    </>
                  ) : (
                    <>
                      No data available for{" "}
                      <span className="font-medium">
                        {VARIABLES.find(v => v.id === chartType === "scatter" ? yVariable : xVariable)?.label}
                      </span>{" "}
                      in the selected time range.
                    </>
                  )}
                </p>
                <div className="mt-3 text-xs">
                  {chartType === "scatter" ? 
                    "Try selecting different variables or adjusting the time range." : 
                    "Try selecting a different variable, adjusting the time range, or refreshing the data."}
                </div>
                <button
                  onClick={fetchData}
                  className="mt-4 px-4 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={14} />
                  Refresh Data
                </button>
              </div>
            )}
          </div>
        </div>

        {stats && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors duration-300">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Statistical Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Mean Values
                </div>
                <div className="mt-2 dark:text-white">
                  <p>
                    <span className="font-medium">
                      {VARIABLES.find((v) => v.id === xVariable).label}:
                    </span>{" "}
                    {stats.xMean}{" "}
                    {VARIABLES.find((v) => v.id === xVariable).unit}
                  </p>
                  <p>
                    <span className="font-medium">
                      {VARIABLES.find((v) => v.id === yVariable).label}:
                    </span>{" "}
                    {stats.yMean}{" "}
                    {VARIABLES.find((v) => v.id === yVariable).unit}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Standard Deviation
                </div>
                <div className="mt-2 dark:text-white">
                  <p>
                    <span className="font-medium">
                      {VARIABLES.find((v) => v.id === xVariable).label}:
                    </span>{" "}
                    {stats.xStd}
                  </p>
                  <p>
                    <span className="font-medium">
                      {VARIABLES.find((v) => v.id === yVariable).label}:
                    </span>{" "}
                    {stats.yStd}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Correlation Coefficient
                </div>
                <div className="mt-2 dark:text-white">
                  <p className="font-medium">{stats.correlation}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {stats.correlation > 0.7
                      ? "Strong positive correlation"
                      : stats.correlation < -0.7
                      ? "Strong negative correlation"
                      : stats.correlation > 0.3
                      ? "Moderate positive correlation"
                      : stats.correlation < -0.3
                      ? "Moderate negative correlation"
                      : "Weak or no correlation"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {rangeMetadata && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors duration-300">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 flex items-center">
              <Calendar size={18} className="mr-2 text-gray-500 dark:text-gray-400" />
              Selected Range Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                  <ArrowDownUp size={14} className="mr-1.5" />
                  Time Range
                </div>
                <div className="mt-2 dark:text-white">
                  <p className="text-sm">
                    <span className="font-medium">Start:</span>{" "}
                    {formatFullDate(rangeMetadata.startTime)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">End:</span>{" "}
                    {formatFullDate(rangeMetadata.endTime)}
                  </p>
                  <p className="text-sm mt-1 font-medium text-blue-600 dark:text-blue-400">
                    {rangeMetadata.duration} {rangeMetadata.durationUnit}
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Data Points
                </div>
                <div className="mt-2 dark:text-white">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    {Object.entries(rangeMetadata.pointCounts).map(([key, count]) => (
                      <p key={key} className="text-sm">
                        <span className="font-medium">
                          {VARIABLES.find((v) => v.id === key)?.label || key}:
                        </span>{" "}
                        {count.toLocaleString()}
                      </p>
                    ))}
                  </div>
                  <p className="text-sm mt-2 font-medium text-blue-600 dark:text-blue-400">
                    Total: {rangeMetadata.totalPoints.toLocaleString()} points
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Sampling Details
                </div>
                <div className="mt-2 dark:text-white">
                  <p className="text-sm">
                    <span className="font-medium">Interval:</span>{" "}
                    {typeof rangeMetadata.samplingInterval === 'number' ? 
                      `${rangeMetadata.samplingInterval} ${rangeMetadata.samplingIntervalUnit}` : 
                      rangeMetadata.samplingInterval}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Points/day:</span>{" "}
                    {rangeMetadata.samplingInterval !== "Varied" && rangeMetadata.samplingIntervalUnit === "hours" ? 
                      (24 / rangeMetadata.samplingInterval).toFixed(1) :
                      rangeMetadata.samplingIntervalUnit === "minutes" ?
                      (24 * 60 / rangeMetadata.samplingInterval).toFixed(0) :
                      "Varies"}
                  </p>
                  <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
                    {rangeMetadata.samplingInterval === "Varied" ? 
                      "Data collection intervals are inconsistent" : 
                      "Data collection follows a regular pattern"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } catch (err) {
    console.error("Fatal error in AdvancedCharts:", err);
    return (
      <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-6 rounded-lg border border-red-200 dark:border-red-800">
        <h3 className="text-lg font-medium mb-2">Chart Error</h3>
        <p>
          There was a problem loading the chart component. This might be due to
          invalid data or a configuration issue.
        </p>
        <p className="mt-2 font-mono text-sm">{err.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-md"
        >
          Reload Page
        </button>
      </div>
    );
  }
}
