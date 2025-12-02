import { useState, useMemo } from 'react';

/**
 * Analytics Dashboard - Compact and organized layout for sidebar
 */

function StatCard({ title, value, icon, color = 'blue', subtitle }) {
  const colorStyles = {
    blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400' },
    green: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-400' },
    red: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400' },
    yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400' },
    purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-400' },
  };

  const style = colorStyles[color];

  return (
    <div className={`p-3 rounded-lg ${style.bg} border ${style.border}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 truncate">{title}</p>
          <p className={`text-xl font-bold ${style.text}`}>{value}</p>
        </div>
      </div>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function MiniBarChart({ data, color = '#ef4444', label }) {
  const max = Math.max(...data, 1);
  
  return (
    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
      <h4 className="text-xs font-medium text-gray-400 mb-2">{label}</h4>
      <div className="flex items-end gap-0.5 h-12">
        {data.map((value, index) => (
          <div
            key={index}
            className="flex-1 rounded-sm transition-all duration-300 hover:opacity-70"
            style={{
              height: `${Math.max((value / max) * 100, 4)}%`,
              backgroundColor: color,
            }}
            title={`${value} events`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-gray-500">
        <span>12h ago</span>
        <span>Now</span>
      </div>
    </div>
  );
}

function SeverityBars({ alerts }) {
  const distribution = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    alerts.forEach(alert => {
      if (counts[alert.severity] !== undefined) {
        counts[alert.severity]++;
      }
    });
    return counts;
  }, [alerts]);

  const total = Math.max(Object.values(distribution).reduce((a, b) => a + b, 0), 1);
  
  const severityConfig = [
    { key: 'CRITICAL', label: 'Critical', color: '#ef4444', icon: '🔴' },
    { key: 'HIGH', label: 'High', color: '#f97316', icon: '🟠' },
    { key: 'MEDIUM', label: 'Medium', color: '#eab308', icon: '🟡' },
    { key: 'LOW', label: 'Low', color: '#22c55e', icon: '🟢' },
  ];

  return (
    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
      <h4 className="text-xs font-medium text-gray-400 mb-2">Alert Severity</h4>
      <div className="space-y-2">
        {severityConfig.map(({ key, label, color, icon }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs w-4">{icon}</span>
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(distribution[key] / total) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span className="text-xs text-gray-400 w-6 text-right">{distribution[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AircraftTypesList({ flights }) {
  const typeDistribution = useMemo(() => {
    const counts = {};
    flights.forEach(flight => {
      const type = flight.aircraft_type || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [flights]);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  if (typeDistribution.length === 0) {
    return (
      <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
        <h4 className="text-xs font-medium text-gray-400 mb-2">Aircraft Types</h4>
        <p className="text-xs text-gray-500 text-center py-2">No aircraft data</p>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
      <h4 className="text-xs font-medium text-gray-400 mb-2">Aircraft Types</h4>
      <div className="space-y-1.5">
        {typeDistribution.map(([type, count], index) => (
          <div key={type} className="flex items-center gap-2 text-xs">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-gray-300 truncate flex-1">{type}</span>
            <span className="text-gray-500">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemStatus() {
  return (
    <div className="p-3 rounded-lg bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/20">
      <h4 className="text-xs font-medium text-gray-400 mb-2">System Status</h4>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-gray-300">Radar Online</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-gray-300">Tracking Active</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-gray-300">Alerts Enabled</span>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({ flights = [], alerts = [], restrictedAreas = [] }) {
  const [timeRange, setTimeRange] = useState('1h');
  
  // Calculate statistics
  const stats = useMemo(() => {
    const activeFlights = flights.filter(f => f.status === 'active' || !f.status).length;
    const intrusionCount = flights.filter(f => f.in_restricted_area).length;
    const activeAlerts = alerts.filter(a => a.status !== 'resolved').length;
    
    return {
      activeFlights,
      intrusionCount,
      activeAlerts,
      areasMonitored: restrictedAreas.length,
    };
  }, [flights, alerts, restrictedAreas]);

  // Generate hourly data for chart
  const hourlyData = useMemo(() => {
    return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          📊 Analytics
        </h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-2 py-0.5 bg-gray-800 border border-gray-600 rounded text-xs text-white focus:outline-none"
        >
          <option value="1h">1H</option>
          <option value="6h">6H</option>
          <option value="24h">24H</option>
          <option value="7d">7D</option>
        </select>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Stats Grid - 2x2 */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            title="Active Flights"
            value={stats.activeFlights}
            icon="✈️"
            color="blue"
          />
          <StatCard
            title="Intrusions"
            value={stats.intrusionCount}
            icon="⚠️"
            color="red"
          />
          <StatCard
            title="Alerts"
            value={stats.activeAlerts}
            icon="🔔"
            color="yellow"
          />
          <StatCard
            title="Zones"
            value={stats.areasMonitored}
            icon="🎯"
            color="green"
          />
        </div>

        {/* Activity Chart */}
        <MiniBarChart 
          data={hourlyData} 
          color="#ef4444" 
          label="Intrusion Activity (12H)"
        />

        {/* Severity Distribution */}
        <SeverityBars alerts={alerts} />

        {/* Aircraft Types */}
        <AircraftTypesList flights={flights} />

        {/* System Status */}
        <SystemStatus />
      </div>
    </div>
  );
}
