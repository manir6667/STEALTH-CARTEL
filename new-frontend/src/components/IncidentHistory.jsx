import { useState, useMemo, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Incident History Log - Shows historical alerts with search and filter
 */

function IncidentRow({ incident, isExpanded, onToggle }) {
  const severityColors = {
    CRITICAL: 'bg-red-500',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-yellow-500',
    LOW: 'bg-green-500',
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="border-b border-gray-700/50 last:border-b-0">
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={onToggle}
      >
        {/* Severity indicator */}
        <div className={`w-2 h-2 rounded-full ${severityColors[incident.severity] || 'bg-gray-500'}`} />
        
        {/* Time */}
        <span className="text-xs text-gray-500 w-32 flex-shrink-0">
          {formatTime(incident.detected_at || incident.created_at)}
        </span>
        
        {/* Type/Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">
            {incident.alert_type || incident.message || 'Intrusion Detected'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {incident.transponder_id || incident.flight_id || 'Unknown Aircraft'}
          </p>
        </div>
        
        {/* Status badge */}
        <span className={`px-2 py-0.5 rounded text-xs ${
          incident.status === 'resolved' 
            ? 'bg-green-900/50 text-green-400' 
            : 'bg-red-900/50 text-red-400'
        }`}>
          {incident.status || 'active'}
        </span>
        
        {/* Expand icon */}
        <span className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>
      
      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 bg-gray-800/30">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Aircraft Type:</span>
              <span className="text-gray-300 ml-2">{incident.aircraft_type || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-500">Altitude:</span>
              <span className="text-gray-300 ml-2">{incident.altitude ? `${incident.altitude} ft` : 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-500">Speed:</span>
              <span className="text-gray-300 ml-2">{incident.speed ? `${incident.speed} kts` : 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-500">Zone:</span>
              <span className="text-gray-300 ml-2">{incident.zone_name || 'Restricted Area'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Location:</span>
              <span className="text-gray-300 ml-2">
                {incident.latitude?.toFixed(4) || '?'}, {incident.longitude?.toFixed(4) || '?'}
              </span>
            </div>
          </div>
          
          {incident.message && (
            <p className="mt-2 text-sm text-gray-400 border-l-2 border-gray-600 pl-2">
              {incident.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function IncidentHistory({ alerts = [], flights = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [sortOrder, setSortOrder] = useState('newest');

  // Combine alerts and create incident list
  const incidents = useMemo(() => {
    // Use alerts as incidents, augmented with flight data
    let list = alerts.map(alert => {
      const flight = flights.find(f => 
        f.transponder_id === alert.transponder_id || 
        f.id === alert.flight_id
      );
      return {
        ...alert,
        ...flight,
        id: alert.id || `${alert.transponder_id}-${alert.detected_at}`,
      };
    });

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(incident => 
        incident.transponder_id?.toLowerCase().includes(term) ||
        incident.aircraft_type?.toLowerCase().includes(term) ||
        incident.message?.toLowerCase().includes(term) ||
        incident.zone_name?.toLowerCase().includes(term)
      );
    }

    // Filter by severity
    if (severityFilter !== 'all') {
      list = list.filter(incident => incident.severity === severityFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      list = list.filter(incident => 
        statusFilter === 'active' 
          ? incident.status !== 'resolved'
          : incident.status === 'resolved'
      );
    }

    // Sort
    list.sort((a, b) => {
      const timeA = new Date(a.detected_at || a.created_at || 0).getTime();
      const timeB = new Date(b.detected_at || b.created_at || 0).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [alerts, flights, searchTerm, severityFilter, statusFilter, sortOrder]);

  const handleToggleExpand = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-900/50 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          📋 Incident History
          <span className="text-sm font-normal text-gray-500">
            ({incidents.length} records)
          </span>
        </h2>

        {/* Search */}
        <input
          type="text"
          placeholder="Search incidents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-2"
        />

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Incidents List */}
      <div className="flex-1 overflow-y-auto">
        {incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <span className="text-4xl mb-2">📭</span>
            <p>No incidents found</p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="text-blue-400 text-sm mt-1 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          incidents.map(incident => (
            <IncidentRow
              key={incident.id}
              incident={incident}
              isExpanded={expandedId === incident.id}
              onToggle={() => handleToggleExpand(incident.id)}
            />
          ))
        )}
      </div>

      {/* Footer stats */}
      <div className="p-2 border-t border-gray-700 flex gap-4 text-xs text-gray-500">
        <span>
          🔴 Critical: {alerts.filter(a => a.severity === 'CRITICAL').length}
        </span>
        <span>
          🟠 High: {alerts.filter(a => a.severity === 'HIGH').length}
        </span>
        <span>
          🟡 Medium: {alerts.filter(a => a.severity === 'MEDIUM').length}
        </span>
        <span>
          🟢 Low: {alerts.filter(a => a.severity === 'LOW').length}
        </span>
      </div>
    </div>
  );
}
