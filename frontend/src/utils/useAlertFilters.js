/**
 * Custom hook for managing alert filtering functionality
 */

import { useState, useMemo } from "react";

export function useAlertFilters(alerts, initialFilters = {}) {
  // Default filter settings
  const defaultFilters = {
    temperature: true,
    pH: true,
    turbidity: true,
    waterLevel: true,
    high: true,
    medium: true,
    low: true,
    ...initialFilters,
  };

  // Filter state for alerts
  const [alertFilters, setAlertFilters] = useState(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);

  // Toggle filter panel visibility
  const toggleFilters = () => setShowFilters(!showFilters);

  // Update individual filter
  const updateFilter = (filterName, value) => {
    setAlertFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  // Reset all filters to default state
  const resetFilters = () => {
    setAlertFilters(defaultFilters);
  };

  // Apply filters to alert data
  const getFilteredAlerts = (alerts, startDate, endDate) => {
    if (!alerts) return [];

    return alerts.filter((alert) => {
      // Filter by type
      if (!alertFilters[alert.type]) return false;

      // Filter by severity
      if (!alertFilters[alert.severity]) return false;

      // Filter by date range
      const alertDate = new Date(alert.timestamp);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of the day

      return alertDate >= start && alertDate <= end;
    });
  };

  // Generate filtered alerts using memoization to avoid recalculations
  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    return getFilteredAlerts(alerts, null, null);
  }, [alerts, alertFilters]);

  // Calculate stats for filtered alerts
  const alertStats = useMemo(() => {
    if (!filteredAlerts.length) {
      return {
        total: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        unacknowledged: 0,
      };
    }

    return {
      total: filteredAlerts.length,
      highSeverity: filteredAlerts.filter((a) => a.severity === "high").length,
      mediumSeverity: filteredAlerts.filter((a) => a.severity === "medium")
        .length,
      unacknowledged: filteredAlerts.filter((a) => !a.acknowledged).length,
    };
  }, [filteredAlerts]);

  return {
    alertFilters,
    showFilters,
    toggleFilters,
    updateFilter,
    resetFilters,
    getFilteredAlerts,
    filteredAlerts,
    alertStats,
  };
}
