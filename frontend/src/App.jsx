import { Thermometer, Droplets } from 'lucide-react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext, useMemo } from 'react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { MetricCard } from './components/MetricCard'
import { Chart } from './components/Chart'
import { AlertsSection } from './components/AlertsSection'
import { SensorHealth } from './components/SensorHealth'
import { MiniChart } from './components/MiniChart'
import { AdvancedCharts } from './components/AdvancedCharts'
import { History } from './components/History'
import { useESP32Data } from './hooks/useESP32Data'

// Create Theme Context
export const ThemeContext = createContext(null)

// Create Settings Context for units and time formats
export const SettingsContext = createContext(null)

// Mock sensor data - in real app, this would come from your backend
const SENSORS = [
  {
    id: 'temp-1',
    name: 'Temperature Sensor',
    isOnline: true,
    lastUpdate: '2 sec ago'
  },
  {
    id: 'ph-1',
    name: 'pH Sensor',
    isOnline: true,
    lastUpdate: '5 sec ago'
  },
  {
    id: 'turb-1',
    name: 'Turbidity Sensor',
    isOnline: true,
    lastUpdate: '3 sec ago'
  },
  {
    id: 'level-1',
    name: 'Water Level Sensor',
    isOnline: true,
    lastUpdate: '1 sec ago'
  }
]

// Dashboard component (main view)
function Dashboard({ data, dataHistory, error, thresholds, getStatus, getOverallStatus, units }) {
  // Format value with the correct unit
  const formatValue = (value, type) => {
    switch (type) {
      case 'temperature':
        return `${value.toFixed(1)}${units.temperature === 'C' ? '°C' : '°F'}`
      case 'pH':
        return value.toFixed(1)
      case 'turbidity':
        return `${value.toFixed(2)}`
      case 'waterLevel':
        return `${value.toFixed(0)}`
      default:
        return value.toString()
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-3 sm:mb-4 md:mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">Water Quality Dashboard</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 rounded mb-3 sm:mb-4 md:mb-6 text-sm dark:bg-red-900 dark:border-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <AlertsSection data={data} thresholds={thresholds} />
      
      <SensorHealth sensors={SENSORS} />

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4 mb-3 sm:mb-4 md:mb-6">
        <MetricCard 
          title="Temperature" 
          value={formatValue(data.temperature, 'temperature')}
          icon={Thermometer}
          status={getStatus(data.temperature, 'temperature')}
          unit=""
        />
        <MetricCard 
          title="pH" 
          value={formatValue(data.pH, 'pH')}
          icon={Droplets}
          status={getStatus(data.pH, 'pH')}
          unit=""
        />
        <MetricCard 
          title="Turbidity" 
          value={formatValue(data.turbidity, 'turbidity')}
          icon={Droplets}
          status={getStatus(data.turbidity, 'turbidity')}
          unit={units.turbidity}
        />
        <MetricCard 
          title="Overall Quality" 
          value={getOverallStatus().charAt(0).toUpperCase() + getOverallStatus().slice(1)}
          icon={Droplets}
          status={getOverallStatus()}
          unit=""
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4 mb-3 sm:mb-4 md:mb-6">
        <MiniChart
          data={dataHistory.temperature}
          label="Temperature"
          color="#ef4444"
          unit={units.temperature === 'C' ? '°C' : '°F'}
        />
        <MiniChart
          data={dataHistory.pH}
          label="pH"
          color="#3b82f6"
          unit=""
        />
        <MiniChart
          data={dataHistory.turbidity}
          label="Turbidity"
          color="#10b981"
          unit={units.turbidity}
        />
        <MiniChart
          data={dataHistory.waterLevel}
          label="Water Level"
          color="#8b5cf6"
          unit={units.waterLevel}
        />
      </div>

      <Chart data={data} units={units} />
    </>
  )
}

// Charts component
function Charts({ dataHistory, units }) {
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Advanced Analytics</h1>
      </div>
      <AdvancedCharts dataHistory={dataHistory} units={units} />
    </>
  )
}

// Settings component 
function Settings({ thresholds, setThresholds, currentData, notifications, setNotifications }) {
  const { theme, setTheme } = useContext(ThemeContext)
  const { units, setUnits, timeFormat, setTimeFormat, timezone, setTimezone } = useContext(SettingsContext)
  const [activeTab, setActiveTab] = useState('appearance')
  
  // Handle theme mode change
  const handleThemeChange = (mode) => {
    setTheme({...theme, mode})
  }
  
  // Handle accent color change
  const handleAccentChange = (accentColor) => {
    setTheme({...theme, accentColor})
  }
  
  // Handle unit change
  const handleUnitChange = (type, value) => {
    setUnits(prev => ({
      ...prev,
      [type]: value
    }))
  }
  
  // Handle time format change
  const handleTimeFormatChange = (format) => {
    setTimeFormat(format)
  }
  
  // Handle timezone change
  const handleTimezoneChange = (tz) => {
    setTimezone(tz)
  }
  
  // Handle notification changes
  const handleNotificationToggle = (channel) => {
    setNotifications({
      ...notifications,
      [channel]: {
        ...notifications[channel],
        enabled: !notifications[channel].enabled
      }
    })
  }
  
  // Handle notification level toggle
  const handleLevelToggle = (channel, level) => {
    const levels = notifications[channel].levels
    const newLevels = levels.includes(level) 
      ? levels.filter(l => l !== level)
      : [...levels, level]
    
    setNotifications({
      ...notifications,
      [channel]: {
        ...notifications[channel],
        levels: newLevels
      }
    })
  }
  
  // Handle recipients change
  const handleRecipientsChange = (channel, recipients) => {
    setNotifications({
      ...notifications,
      [channel]: {
        ...notifications[channel],
        recipients
      }
    })
  }
  
  // Predefined accent colors
  const accentColors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Pink', value: '#ec4899' },
  ]
  
  // Generate timezone options
  const timezoneOptions = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' }
  ]
  
  // Current time preview
  const currentTimePreview = useMemo(() => {
    const now = new Date()
    let options = {}
    
    if (timeFormat === '12h') {
      options = { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true }
    } else {
      options = { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }
    }
    
    try {
      return new Intl.DateTimeFormat('en-US', { 
        ...options,
        timeZone: timezone 
      }).format(now)
    } catch (error) {
      return new Intl.DateTimeFormat('en-US', options).format(now)
    }
  }, [timezone, timeFormat])
  
  // Demo value based on units
  const demoTemperature = units.temperature === 'C' ? 25 : 77
  const demoTemperatureUnit = units.temperature === 'C' ? '°C' : '°F'
  
  // Tab configuration
  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'units', label: 'Units & Time', icon: '⏱️' },
    { id: 'thresholds', label: 'Thresholds', icon: '📊' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' }
  ]
  
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold dark:text-white">Settings</h1>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
          {tabs.map(tab => (
            <li key={tab.id} className="mr-2">
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center justify-center px-4 py-3 rounded-t-lg ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                    : 'hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 transition-colors duration-300">
            <h2 className="text-lg font-medium mb-4 dark:text-white">Theme Mode</h2>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <ThemeButton 
                label="Light Mode" 
                active={theme.mode === 'light'} 
                onClick={() => handleThemeChange('light')}
                icon="☀️"
              />
              <ThemeButton 
                label="Dark Mode" 
                active={theme.mode === 'dark'} 
                onClick={() => handleThemeChange('dark')}
                icon="🌙"
              />
              <ThemeButton 
                label="System Default" 
                active={theme.mode === 'system'} 
                onClick={() => handleThemeChange('system')}
                icon="💻"
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose your preferred color scheme for the interface.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 transition-colors duration-300">
            <h2 className="text-lg font-medium mb-4 dark:text-white">Accent Color</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-3">
              {accentColors.map(color => (
                <button
                  key={color.value}
                  className={`p-3 rounded-lg flex flex-col items-center justify-center ${
                    theme.accentColor === color.value 
                      ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => handleAccentChange(color.value)}
                  style={{ 
                    ...(theme.accentColor === color.value 
                        ? { ringColor: color.value } 
                        : {}
                    ) 
                  }}
                >
                  <div 
                    className="w-6 h-6 rounded-full mb-1" 
                    style={{ backgroundColor: color.value }}
                  ></div>
                  <span className="text-xs">{color.name}</span>
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This color will be used for various interface elements like buttons, links and charts.
            </p>
          </div>
        </div>
      )}
      
      {/* Units & Time Tab */}
      {activeTab === 'units' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 transition-colors duration-300">
            <h2 className="text-lg font-medium mb-4 dark:text-white">Timezone & Time Format</h2>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => handleTimezoneChange(e.target.value)}
                  className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                >
                  {timezoneOptions.map(tz => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                    Time Format
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center text-sm dark:text-gray-300">
                      <input
                        type="radio"
                        className="mr-2 h-4 w-4 text-blue-500"
                        checked={timeFormat === '24h'}
                        onChange={() => handleTimeFormatChange('24h')}
                      />
                      24-hour (23:59)
                    </label>
                    <label className="flex items-center text-sm dark:text-gray-300">
                      <input
                        type="radio"
                        className="mr-2 h-4 w-4 text-blue-500"
                        checked={timeFormat === '12h'}
                        onChange={() => handleTimeFormatChange('12h')}
                      />
                      12-hour (11:59 PM)
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium mb-2 dark:text-gray-200">Time Preview</h4>
                <div className="flex flex-col space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Current time in selected timezone and format:
                  </div>
                  <div className="text-xl font-mono dark:text-white">{currentTimePreview}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    This is how dates and times will appear in charts, logs, and alerts.
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 transition-colors duration-300">
            <h2 className="text-lg font-medium mb-4 dark:text-white">Measurement Units</h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              {/* Temperature Unit */}
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <label className="font-medium dark:text-white">Temperature</label>
                  <div className="relative inline-block w-16 h-8">
                    <input
                      type="checkbox"
                      id="toggle-temp"
                      className="sr-only"
                      checked={units.temperature === 'F'}
                      onChange={() => handleUnitChange('temperature', units.temperature === 'C' ? 'F' : 'C')}
                    />
                    <div 
                      className="absolute inset-0 rounded-full overflow-hidden flex border border-gray-200 dark:border-gray-600"
                    >
                      <div className={`w-1/2 h-full flex items-center justify-center text-xs ${units.temperature === 'C' ? 'bg-blue-100 font-semibold dark:bg-blue-900' : 'bg-white dark:bg-gray-700'}`}>°C</div>
                      <div className={`w-1/2 h-full flex items-center justify-center text-xs ${units.temperature === 'F' ? 'bg-blue-100 font-semibold dark:bg-blue-900' : 'bg-white dark:bg-gray-700'}`}>°F</div>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Example: {demoTemperature}{demoTemperatureUnit}
                </div>
              </div>
              
              {/* Turbidity Unit */}
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <label className="font-medium dark:text-white">Turbidity</label>
                  <select
                    value={units.turbidity}
                    onChange={(e) => handleUnitChange('turbidity', e.target.value)}
                    className="text-sm p-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                  >
                    <option value="NTU">NTU</option>
                    <option value="FNU">FNU</option>
                    <option value="FTU">FTU</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Example: 1.5 {units.turbidity}
                </div>
              </div>
              
              {/* Water Level Unit */}
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <label className="font-medium dark:text-white">Water Level</label>
                  <select
                    value={units.waterLevel}
                    onChange={(e) => handleUnitChange('waterLevel', e.target.value)}
                    className="text-sm p-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                  >
                    <option value="cm">cm</option>
                    <option value="m">m</option>
                    <option value="in">in</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Example: {units.waterLevel === 'cm' || units.waterLevel === 'm' ? '35 ' : '13.8 '}{units.waterLevel}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Thresholds Tab */}
      {activeTab === 'thresholds' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 transition-colors duration-300">
            <h2 className="text-lg font-medium mb-4 dark:text-white">Parameter Thresholds</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Adjust warning and critical thresholds for water quality parameters. These thresholds determine when alerts are triggered.
            </p>
            
            <div className="space-y-6">
              {/* Temperature Threshold */}
              <ThresholdSlider 
                title="Temperature (°C)"
                type="temperature"
                thresholds={thresholds}
                setThresholds={setThresholds}
                min={0}
                max={40}
                step={0.5}
                currentValue={currentData.temperature}
                unit="°C"
              />
              
              {/* pH Threshold */}
              <ThresholdSlider 
                title="pH Level"
                type="pH"
                thresholds={thresholds}
                setThresholds={setThresholds}
                min={0}
                max={14}
                step={0.1}
                currentValue={currentData.pH}
                unit=""
              />
              
              {/* Turbidity Threshold */}
              <ThresholdSlider 
                title="Turbidity (NTU)"
                type="turbidity"
                thresholds={thresholds}
                setThresholds={setThresholds}
                min={0}
                max={10}
                step={0.1}
                currentValue={currentData.turbidity}
                unit="NTU"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 transition-colors duration-300">
            <h2 className="text-lg font-medium mb-4 dark:text-white">Notification Channels</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Configure how and when you want to be notified about water quality alerts.
            </p>
            
            <div className="space-y-4">
              {/* Email Notifications */}
              <div className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors duration-300`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-base font-medium dark:text-white">Email Notifications</h3>
                  <div className="relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      id="toggle-email"
                      className="sr-only"
                      checked={notifications.email.enabled}
                      onChange={() => handleNotificationToggle('email')}
                    />
                    <label
                      htmlFor="toggle-email"
                      className={`absolute inset-0 rounded-full cursor-pointer transition-colors duration-300 ${
                        notifications.email.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span 
                        className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${
                          notifications.email.enabled ? 'transform translate-x-6' : ''
                        }`} 
                      />
                    </label>
                  </div>
                </div>
                
                {notifications.email.enabled && (
                  <div className="space-y-3 mt-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                        Recipients (comma separated)
                      </label>
                      <input
                        type="text"
                        value={notifications.email.recipients}
                        onChange={(e) => handleRecipientsChange('email', e.target.value)}
                        placeholder="example@example.com"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                        Alert Levels
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center text-sm dark:text-gray-300">
                          <input
                            type="checkbox"
                            className="mr-2 h-4 w-4 text-blue-500"
                            checked={notifications.email.levels.includes('critical')}
                            onChange={() => handleLevelToggle('email', 'critical')}
                          />
                          Critical
                        </label>
                        <label className="flex items-center text-sm dark:text-gray-300">
                          <input
                            type="checkbox"
                            className="mr-2 h-4 w-4 text-blue-500"
                            checked={notifications.email.levels.includes('warning')}
                            onChange={() => handleLevelToggle('email', 'warning')}
                          />
                          Warning
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* SMS Notifications */}
              <div className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors duration-300`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-base font-medium dark:text-white">SMS Notifications</h3>
                  <div className="relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      id="toggle-sms"
                      className="sr-only"
                      checked={notifications.sms.enabled}
                      onChange={() => handleNotificationToggle('sms')}
                    />
                    <label
                      htmlFor="toggle-sms"
                      className={`absolute inset-0 rounded-full cursor-pointer transition-colors duration-300 ${
                        notifications.sms.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span 
                        className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${
                          notifications.sms.enabled ? 'transform translate-x-6' : ''
                        }`} 
                      />
                    </label>
                  </div>
                </div>
                
                {notifications.sms.enabled && (
                  <div className="space-y-3 mt-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                        Phone Numbers (comma separated)
                      </label>
                      <input
                        type="text"
                        value={notifications.sms.recipients}
                        onChange={(e) => handleRecipientsChange('sms', e.target.value)}
                        placeholder="+1234567890"
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                        Alert Levels
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center text-sm dark:text-gray-300">
                          <input
                            type="checkbox"
                            className="mr-2 h-4 w-4 text-blue-500"
                            checked={notifications.sms.levels.includes('critical')}
                            onChange={() => handleLevelToggle('sms', 'critical')}
                          />
                          Critical
                        </label>
                        <label className="flex items-center text-sm dark:text-gray-300">
                          <input
                            type="checkbox"
                            className="mr-2 h-4 w-4 text-blue-500"
                            checked={notifications.sms.levels.includes('warning')}
                            onChange={() => handleLevelToggle('sms', 'warning')}
                          />
                          Warning
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Push Notifications */}
              <div className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors duration-300`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-base font-medium dark:text-white">Push Notifications</h3>
                  <div className="relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      id="toggle-push"
                      className="sr-only"
                      checked={notifications.push.enabled}
                      onChange={() => handleNotificationToggle('push')}
                    />
                    <label
                      htmlFor="toggle-push"
                      className={`absolute inset-0 rounded-full cursor-pointer transition-colors duration-300 ${
                        notifications.push.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span 
                        className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${
                          notifications.push.enabled ? 'transform translate-x-6' : ''
                        }`} 
                      />
                    </label>
                  </div>
                </div>
                
                {notifications.push.enabled && (
                  <div className="space-y-3 mt-3">
                    <div>
                      <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                        Alert Levels
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center text-sm dark:text-gray-300">
                          <input
                            type="checkbox"
                            className="mr-2 h-4 w-4 text-blue-500"
                            checked={notifications.push.levels.includes('critical')}
                            onChange={() => handleLevelToggle('push', 'critical')}
                          />
                          Critical
                        </label>
                        <label className="flex items-center text-sm dark:text-gray-300">
                          <input
                            type="checkbox"
                            className="mr-2 h-4 w-4 text-blue-500"
                            checked={notifications.push.levels.includes('warning')}
                            onChange={() => handleLevelToggle('push', 'warning')}
                          />
                          Warning
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Theme Button Component
function ThemeButton({ label, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border ${
        active 
          ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700' 
          : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-300'
      } transition-colors duration-300 flex flex-col items-center`}
    >
      <span className="text-xl mb-1">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

// Threshold Slider Component
function ThresholdSlider({ title, type, thresholds, setThresholds, min, max, step, currentValue, unit }) {
  const updateThreshold = (field, value) => {
    setThresholds(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: parseFloat(value)
      }
    }))
  }
  
  // Calculate status based on thresholds for preview
  const getStatus = () => {
    const { low, high } = thresholds[type]
    
    if (type === 'turbidity') {
      if (currentValue > high) return 'poor'
      if (currentValue > high * 0.75) return 'moderate'
      return 'good'
    }
    
    if (currentValue > high || currentValue < low) return 'poor'
    
    // Moderate ranges
    const moderateHigh = type === 'pH' ? high - 0.5 : high - 2
    const moderateLow = type === 'pH' ? low + 0.5 : low + 2
    
    if (currentValue > moderateHigh || currentValue < moderateLow) return 'moderate'
    return 'good'
  }
  
  const status = getStatus()
  const lowValue = thresholds[type].low
  const highValue = thresholds[type].high
  
  // Calculate positions for markers
  const lowPosition = ((lowValue - min) / (max - min)) * 100
  const highPosition = ((highValue - min) / (max - min)) * 100
  const currentPosition = ((currentValue - min) / (max - min)) * 100

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors duration-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-medium dark:text-white flex items-center">
          {title}
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            Current: {currentValue.toFixed(1)}{unit}
          </span>
        </h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          status === 'good' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
          status === 'moderate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {status === 'good' ? 'Good' : status === 'moderate' ? 'Warning' : 'Critical'}
        </div>
      </div>
      
      {/* Slider track with colored zones */}
      <div className="relative h-6 mb-3">
        {/* Slider backdrop */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="relative w-full h-full">
            {/* Good zone */}
            <div 
              className="absolute h-full bg-green-100 dark:bg-green-900"
              style={{ 
                left: `${lowPosition}%`, 
                right: `${100 - highPosition}%` 
              }}
            ></div>
            
            {/* Warning zones */}
            <div className="absolute left-0 h-full bg-yellow-100 dark:bg-yellow-900" style={{ width: `${lowPosition}%` }}></div>
            <div className="absolute right-0 h-full bg-yellow-100 dark:bg-yellow-900" style={{ width: `${100 - highPosition}%` }}></div>
            
            {/* Critical indicator (current value marker) */}
            <div 
              className="absolute top-0 w-1.5 h-full bg-blue-500"
              style={{ left: `calc(${currentPosition}% - 3px)` }}
            ></div>
          </div>
        </div>
        
        {/* Threshold markers */}
        <div 
          className="absolute top-0 w-1.5 h-full bg-red-500"
          style={{ left: `calc(${lowPosition}% - 3px)` }}
        ></div>
        <div 
          className="absolute top-0 w-1.5 h-full bg-red-500"
          style={{ left: `calc(${highPosition}% - 3px)` }}
        ></div>
      </div>
      
      {/* Separate sliders for min/max */}
      <div className="grid grid-cols-2 gap-4 mt-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-medium dark:text-gray-300">
              Low: {lowValue}{unit}
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">{min}{unit}</span>
          </div>
          <input 
            type="range"
            min={min}
            max={max}
            step={step}
            value={lowValue}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value)
              if (newValue < highValue) {
                updateThreshold('low', newValue)
              }
            }}
            className="w-full accent-blue-500"
          />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-medium dark:text-gray-300">
              High: {highValue}{unit}
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">{max}{unit}</span>
          </div>
          <input 
            type="range"
            min={min}
            max={max}
            step={step}
            value={highValue}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value)
              if (newValue > lowValue) {
                updateThreshold('high', newValue)
              }
            }}
            className="w-full accent-blue-500"
          />
        </div>
      </div>
    </div>
  )
}

function App() {
  // Default thresholds
  const [thresholds, setThresholds] = useState({
    temperature: {
      low: 22,
      high: 28
    },
    pH: {
      low: 6.0,
      high: 8.0
    },
    turbidity: {
      low: 0,
      high: 2.0
    }
  })

  // Theme settings
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    return savedTheme ? JSON.parse(savedTheme) : { 
      mode: 'light', 
      accentColor: '#3b82f6' // Default to blue
    }
  })
  
  // Units and time format settings
  const [units, setUnits] = useState(() => {
    const savedUnits = localStorage.getItem('units')
    return savedUnits ? JSON.parse(savedUnits) : {
      temperature: 'C',
      turbidity: 'NTU',
      waterLevel: 'cm'
    }
  })
  
  const [timeFormat, setTimeFormat] = useState(() => {
    const savedFormat = localStorage.getItem('timeFormat')
    return savedFormat || '24h'
  })
  
  const [timezone, setTimezone] = useState(() => {
    const savedTimezone = localStorage.getItem('timezone')
    try {
      // Check if timezone is valid
      Intl.DateTimeFormat(undefined, { timeZone: savedTimezone })
      return savedTimezone
    } catch (e) {
      // Default to browser timezone or UTC
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    }
  })
  
  // Track window size for responsive layout
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Notification settings
  const [notifications, setNotifications] = useState(() => {
    const savedNotifications = localStorage.getItem('notifications')
    return savedNotifications ? JSON.parse(savedNotifications) : {
      email: {
        enabled: false,
        recipients: '',
        levels: ['critical']
      },
      sms: {
        enabled: false,
        recipients: '',
        levels: ['critical']
      },
      push: {
        enabled: true,
        levels: ['critical', 'warning']
      }
    }
  })

  // Apply theme effects
  useEffect(() => {
    // Store theme in localStorage
    localStorage.setItem('theme', JSON.stringify(theme))
    
    // Apply theme to document
    if (theme.mode === 'dark' || (theme.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // Apply accent color
    document.documentElement.style.setProperty('--accent-color', theme.accentColor)
    document.documentElement.style.setProperty('--accent-color-light', `${theme.accentColor}33`)
  }, [theme])

  // Store units settings in localStorage
  useEffect(() => {
    localStorage.setItem('units', JSON.stringify(units))
  }, [units])
  
  // Store time format in localStorage
  useEffect(() => {
    localStorage.setItem('timeFormat', timeFormat)
  }, [timeFormat])
  
  // Store timezone in localStorage
  useEffect(() => {
    localStorage.setItem('timezone', timezone)
  }, [timezone])

  // Store notifications in localStorage
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications))
  }, [notifications])

  const { data, dataHistory, isConnected, error } = useESP32Data()

  // Helper function to determine status based on values
  const getStatus = (value, type) => {
    switch (type) {
      case 'temperature':
        return value > thresholds.temperature.high || value < thresholds.temperature.low ? 'poor' : 
               value > (thresholds.temperature.high - 2) || value < (thresholds.temperature.low + 2) ? 'moderate' : 'good'
      case 'turbidity':
        return value > thresholds.turbidity.high ? 'poor' : 
               value > (thresholds.turbidity.high * 0.75) ? 'moderate' : 'good'
      case 'pH':
        return value > thresholds.pH.high || value < thresholds.pH.low ? 'poor' :
               value > (thresholds.pH.high - 0.5) || value < (thresholds.pH.low + 0.5) ? 'moderate' : 'good'
      default:
        return 'good'
    }
  }

  // Calculate overall status
  const getOverallStatus = () => {
    const tempStatus = getStatus(data.temperature, 'temperature')
    const turbStatus = getStatus(data.turbidity, 'turbidity')
    const phStatus = getStatus(data.pH, 'pH')
    
    if (tempStatus === 'poor' || turbStatus === 'poor' || phStatus === 'poor') return 'poor'
    if (tempStatus === 'moderate' || turbStatus === 'moderate' || phStatus === 'moderate') return 'moderate'
    return 'good'
  }

  // Convert measurement units
  const convertedData = useMemo(() => {
    const result = { ...data }
    
    // Convert temperature from C to F if needed
    if (units.temperature === 'F') {
      result.temperature = (data.temperature * 9/5) + 32
    }
    
    // Add other conversions here if needed
    
    return result
  }, [data, units])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <SettingsContext.Provider value={{ 
        units, setUnits, 
        timeFormat, setTimeFormat, 
        timezone, setTimezone 
      }}>
        <Router>
          <div className="min-h-screen w-full overflow-x-hidden flex flex-col relative transition-colors duration-300" 
               style={{ backgroundColor: theme.mode === 'dark' ? 'rgb(17, 24, 39)' : 'rgb(248, 250, 252)', color: theme.mode === 'dark' ? 'white' : 'rgb(17, 24, 39)' }}>
            <Sidebar />
            <div className="flex flex-col ml-0 md:ml-20 w-full md:w-[calc(100%-5rem)]">
              <Header isConnected={isConnected} error={error} />
              
              <main className="pt-16 p-2 sm:p-3 md:p-5 max-w-full">
                <div className="container mx-auto px-0 sm:px-2">
                  <Routes>
                    <Route 
                      path="/" 
                      element={
                        <Dashboard 
                          data={convertedData}
                          dataHistory={dataHistory}
                          error={error}
                          thresholds={thresholds}
                          getStatus={getStatus}
                          getOverallStatus={getOverallStatus}
                          units={units}
                        />
                      } 
                    />
                    <Route 
                      path="/history" 
                      element={
                        <History 
                          dataHistory={dataHistory} 
                          thresholds={thresholds}
                          windowWidth={windowWidth}
                        />
                      } 
                    />
                    <Route 
                      path="/charts" 
                      element={<Charts dataHistory={dataHistory} units={units} />} 
                    />
                    <Route 
                      path="/settings" 
                      element={
                        <Settings 
                          thresholds={thresholds} 
                          setThresholds={setThresholds}
                          currentData={convertedData}
                          notifications={notifications}
                          setNotifications={setNotifications}
                        />
                      } 
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </main>
            </div>
          </div>
        </Router>
      </SettingsContext.Provider>
    </ThemeContext.Provider>
  )
}

export default App