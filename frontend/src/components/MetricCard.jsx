export function MetricCard({ title, value, icon: Icon, status }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-emerald-500'
      case 'moderate': return 'text-amber-500'
      case 'poor': return 'text-rose-500'
      default: return 'text-slate-500'
    }
  }

  return (
    <div className="bg-black mt-14 p-6 rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={`text-2xl font-semibold mt-2 ${getStatusColor(status)}`}>
            {value}
          </p>
        </div>
        <div className={`${getStatusColor(status)} opacity-80`}>
          <Icon size={28} />
        </div>
      </div>
    </div>
  )
} 