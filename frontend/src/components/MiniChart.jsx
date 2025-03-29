import { Line } from 'react-chartjs-2'
// Import adapter first before registering components
import { enUS } from 'date-fns/locale'
import 'chartjs-adapter-date-fns'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { useContext } from 'react'
import { SettingsContext } from '../App'

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
)

export function MiniChart({ data, label, color, unit }) {
  const { timeFormat } = useContext(SettingsContext)
  
  // Filter to last 20 entries for mini charts
  const lastItems = data?.slice(-20) || []
  
  const chartData = {
    labels: lastItems.map((_, i) => `${i}`),
    datasets: [
      {
        label: unit ? `${label} (${unit})` : label,
        data: lastItems.map(d => d.value),
        borderColor: color,
        backgroundColor: `${color}33`,
        tension: 0.3,
        fill: true,
        pointRadius: 0
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.75, // Increased aspect ratio for better horizontal coverage
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(1);
              if (unit) label += unit;
            }
            return label;
          },
          title: function(context) {
            try {
              if (!lastItems[context[0].dataIndex]?.timestamp) {
                return '';
              }
              
              // Format time based on user preference
              const timestamp = new Date(lastItems[context[0].dataIndex].timestamp);
              const options = {
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: timeFormat === '12h'
              };
              
              return new Intl.DateTimeFormat('en-US', options).format(timestamp);
            } catch (error) {
              console.error("Error formatting tooltip title:", error);
              return '';
            }
          },
          // Add millisecond precision for detailed view
          afterTitle: function(context) {
            try {
              if (!lastItems[context[0].dataIndex]?.timestamp) {
                return '';
              }
              
              // Show additional milliseconds for more precise time reading
              const timestamp = new Date(lastItems[context[0].dataIndex].timestamp);
              return `.${timestamp.getMilliseconds().toString().padStart(3, '0')}`;
            } catch (error) {
              console.error("Error formatting tooltip after title:", error);
              return '';
            }
          }
        },
        displayColors: true,
        backgroundColor: (ctx) => {
          try {
            return ctx.chart.data.datasets[0].borderColor + 'CC'; // Semi-transparent background matching chart color
          } catch (error) {
            return 'rgba(0,0,0,0.7)';
          }
        },
        padding: 6,
        titleFont: {
          size: 12
        },
        bodyFont: {
          size: 11
        }
      }
    },
    scales: {
      x: {
        display: false,
        bounds: 'data'
      },
      y: {
        display: false,
        beginAtZero: false,
        bounds: 'data'
      }
    },
    elements: {
      line: {
        borderWidth: 1.5
      },
      point: {
        radius: 0,
        hitRadius: 10,
        hoverRadius: 4
      }
    },
    layout: {
      padding: 0 // Remove all padding to maximize chart area
    }
  }

  const value = lastItems.length > 0 
    ? lastItems[lastItems.length - 1].value 
    : 'N/A'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 transition-colors duration-300 overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{label}</h3>
          <div className="flex items-center flex-shrink-0 ml-1">
            <span className="text-lg font-semibold whitespace-nowrap">
              {typeof value === 'number' ? value.toFixed(1) : value}
            </span>
            {unit && <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{unit}</span>}
          </div>
        </div>
        <div className="flex-1 min-h-[70px] -mx-0.5 overflow-hidden">
          <Line data={chartData} options={options} />
        </div>
      </div>
    </div>
  )
} 