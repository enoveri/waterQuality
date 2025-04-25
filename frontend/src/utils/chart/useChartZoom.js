/**
 * Custom hook for managing Chart.js zoom and pan functionality
 */

import { useState, useRef, useCallback } from "react";

export function useChartZoom() {
  // Track zoom state for dynamic time unit adjustment
  const [zoomState, setZoomState] = useState({
    isZoomed: false,
    scale: 1,
    min: null,
    max: null,
  });

  // State for chart view boundaries
  const [chartViewState, setChartViewState] = useState({
    min: null,
    max: null,
  });

  // Chart reference to access chart instance methods
  const chartRef = useRef(null);

  // Handle chart zoom and pan events
  const handleChartZoom = useCallback(() => {
    if (chartRef.current) {
      const chart = chartRef.current;
      setZoomState({
        isZoomed: true,
        scale: chart.getZoomLevel ? chart.getZoomLevel() : 1,
        min: chart.scales.x.min,
        max: chart.scales.x.max,
      });

      setChartViewState({
        min: chart.scales.x.min,
        max: chart.scales.x.max,
      });
    }
  }, []);

  const handleChartPan = useCallback(() => {
    if (chartRef.current) {
      const chart = chartRef.current;
      setZoomState((prev) => ({
        ...prev,
        isZoomed: true,
        min: chart.scales.x.min,
        max: chart.scales.x.max,
      }));

      setChartViewState({
        min: chart.scales.x.min,
        max: chart.scales.x.max,
      });
    }
  }, []);

  // Zoom and pan handlers for buttons
  const handleZoomIn = useCallback((startDate, endDate) => {
    if (chartRef.current) {
      const chart = chartRef.current;

      // If chart hasn't been zoomed yet, create initial zoom state
      if (!chart.scales.x.min && !chart.scales.x.max) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Set initial range to the full date range
        chart.zoomScale(
          "x",
          {
            min: start.getTime(),
            max: end.getTime(),
          },
          "none"
        );
      }

      // Use the chart's zoom plugin directly
      chart.zoom(1.5); // Zoom in by 50% for more noticeable effect

      // After zooming, update our state with the new bounds
      setZoomState({
        isZoomed: true,
        scale: chart.getZoomLevel ? chart.getZoomLevel() : 1.5,
        min: chart.scales.x.min,
        max: chart.scales.x.max,
      });

      setChartViewState({
        min: chart.scales.x.min,
        max: chart.scales.x.max,
      });
    }
  }, []);

  const handleZoomOut = useCallback((startDate, endDate) => {
    if (chartRef.current) {
      const chart = chartRef.current;

      // If chart hasn't been zoomed yet, create initial zoom state
      if (!chart.scales.x.min && !chart.scales.x.max) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Set initial range to the full date range
        chart.zoomScale(
          "x",
          {
            min: start.getTime(),
            max: end.getTime(),
          },
          "none"
        );
      }

      // Use the chart's zoom plugin directly
      chart.zoom(0.6); // Zoom out by 40% for more noticeable effect

      // After zooming, update our state with the new bounds
      setZoomState({
        isZoomed: true,
        scale: chart.getZoomLevel ? chart.getZoomLevel() : 0.6,
        min: chart.scales.x.min,
        max: chart.scales.x.max,
      });

      setChartViewState({
        min: chart.scales.x.min,
        max: chart.scales.x.max,
      });
    }
  }, []);

  const handlePanLeft = useCallback((startDate, endDate) => {
    if (chartRef.current) {
      const chart = chartRef.current;
      let xAxis = chart.scales.x;

      // If chart hasn't been zoomed yet, create initial zoom state
      if (!xAxis.min && !xAxis.max) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Set initial range to the full date range
        chart.zoomScale(
          "x",
          {
            min: start.getTime(),
            max: end.getTime(),
          },
          "none"
        );

        // Get updated axis after setting initial state
        xAxis = chart.scales.x;
      }

      // Calculate the current range
      const min = xAxis.min;
      const max = xAxis.max;
      const range = max - min;

      // Pan left by 30% of the current view for more noticeable effect
      const offset = range * 0.3;

      // Use the chart's pan method directly
      chart.pan({ x: offset }); // Positive value pans left in Chart.js

      // After panning, update our state with the new bounds
      setZoomState((prev) => ({
        ...prev,
        isZoomed: true,
        min: chart.scales.x.min,
        max: chart.scales.x.max,
      }));

      setChartViewState({
        min: chart.scales.x.min,
        max: chart.scales.x.max,
      });
    }
  }, []);

  const handlePanRight = useCallback((startDate, endDate) => {
    if (chartRef.current) {
      const chart = chartRef.current;
      let xAxis = chart.scales.x;

      // If chart hasn't been zoomed yet, create initial zoom state
      if (!xAxis.min && !xAxis.max) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Set initial range to the full date range
        chart.zoomScale(
          "x",
          {
            min: start.getTime(),
            max: end.getTime(),
          },
          "none"
        );

        // Get updated axis after setting initial state
        xAxis = chart.scales.x;
      }

      // Calculate the current range
      const min = xAxis.min;
      const max = xAxis.max;
      const range = max - min;

      // Pan right by 30% of the current view for more noticeable effect
      const offset = range * 0.3;

      // Use the chart's pan method directly
      chart.pan({ x: -offset }); // Negative value pans right in Chart.js

      // After panning, update our state with the new bounds
      setZoomState((prev) => ({
        ...prev,
        isZoomed: true,
        min: chart.scales.x.min,
        max: chart.scales.x.max,
      }));

      setChartViewState({
        min: chart.scales.x.min,
        max: chart.scales.x.max,
      });
    }
  }, []);

  const handleResetZoom = useCallback(() => {
    if (chartRef.current) {
      const chart = chartRef.current;

      // Use the zoom plugin's reset method directly
      chart.resetZoom();

      // Reset our view state
      setZoomState({
        isZoomed: false,
        scale: 1,
        min: null,
        max: null,
      });

      setChartViewState({
        min: null,
        max: null,
      });
    }
  }, []);

  // Generate event handlers for chart zoom plugin
  const getZoomPluginOptions = useCallback(
    () => ({
      pan: {
        enabled: true,
        mode: "x",
        modifierKey: null,
        overScaleMode: "x",
        panCursor: "grab",
        // Enhanced pan complete handler to update state
        onPanComplete: function (ctx) {
          // Update zoom state to reflect current view
          const chart = ctx.chart;
          const { min, max } = chart.scales.x;

          setZoomState((prev) => ({
            ...prev,
            isZoomed: true,
            min,
            max,
          }));

          // Update chart view state
          setChartViewState({
            min,
            max,
          });

          // Force update to sync scrollbar
          chart.update("none");
        },
        onPan: handleChartPan,
        // Increased pan distance for better UX
        speed: 0.3, // 30% pan distance (increased from 25%)
        drag: {
          enabled: true,
          backgroundColor: "rgba(75, 192, 192, 0.1)",
          borderColor: "rgba(75, 192, 192, 0.4)",
          borderWidth: 1,
          threshold: 10, // More sensitive drag detection
        },
      },
      zoom: {
        wheel: {
          enabled: true,
          speed: 0.1,
          modifierKey: "ctrl",
        },
        pinch: {
          enabled: true,
        },
        mode: "x",
        overScaleMode: "x",
        // Enhanced zoom complete handler to update state
        onZoomComplete: function (ctx) {
          // Update zoom state to reflect current view
          const chart = ctx.chart;
          const { min, max } = chart.scales.x;
          const scale = chart.getZoomLevel();

          setZoomState({
            isZoomed: scale > 1,
            scale,
            min,
            max,
          });

          // Update chart view state
          setChartViewState({
            min,
            max,
          });

          // Force update to sync scrollbar
          chart.update("none");
        },
        onZoom: handleChartZoom,
        // Improved zoom sensitivity
        sensitivity: 3,
      },
      limits: {
        x: { min: "original", max: "original" },
        // Add scale limits to prevent excessive zooming
        scale: { min: 0.1, max: 50 },
      },
      // Add animation settings for smoother transitions
      animations: {
        pan: { duration: 300, easing: "easeOutQuad" },
        zoom: { duration: 300, easing: "easeOutCubic" },
      },
    }),
    [handleChartPan, handleChartZoom]
  );

  // Return values and functions for use in components
  return {
    chartRef,
    zoomState,
    chartViewState,
    handleZoomIn,
    handleZoomOut,
    handlePanLeft,
    handlePanRight,
    handleResetZoom,
    getZoomPluginOptions,
  };
}
