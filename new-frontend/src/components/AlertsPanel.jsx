import React from 'react';

export default function AlertsPanel({ alerts, onAcknowledge }) {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100 border-red-500 text-red-900';
      case 'MEDIUM':
        return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case 'LOW':
        return 'bg-blue-100 border-blue-500 text-blue-900';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);

  return (
    <div className="h-full flex flex-col bg-gray-800 text-white">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Alert Center</h2>
        <p className="text-sm text-gray-400">
          {unacknowledgedAlerts.length} unacknowledged alert(s)
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No alerts</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded border-l-4 ${
                alert.acknowledged
                  ? 'bg-gray-700 border-gray-600 opacity-60'
                  : getSeverityColor(alert.severity)
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${
                    alert.severity === 'HIGH'
                      ? 'bg-red-600 text-white'
                      : alert.severity === 'MEDIUM'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {alert.severity}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <p className="text-sm font-semibold mb-1">{alert.message}</p>
              <p className="text-xs text-gray-600">
                Transponder: {alert.transponder_id || 'UNKNOWN'}
              </p>

              {!alert.acknowledged ? (
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-2 rounded"
                >
                  Acknowledge
                </button>
              ) : (
                <p className="text-xs text-gray-600 mt-2">
                  ✓ Acknowledged at {new Date(alert.acknowledged_at).toLocaleTimeString()}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
