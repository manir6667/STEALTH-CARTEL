import React, { useState } from 'react';

/**
 * ControlPanel - Operator console for simulation control
 */
export default function ControlPanel({ 
  onStart, 
  onPause, 
  onReset, 
  isRunning, 
  flights,
  alerts 
}) {
  // Analytics
  const totalDetected = Array.isArray(flights) ? flights.length : 0;
  const threatsDetected = Array.isArray(flights) 
    ? flights.filter(f => f.in_restricted_area || f.threat_level === 'Critical' || f.threat_level === 'High').length 
    : 0;
  const unknownAircraft = Array.isArray(flights) 
    ? flights.filter(f => !f.transponder_id || f.classification === 'unknown').length 
    : 0;
  const totalAlerts = Array.isArray(alerts) ? alerts.length : 0;

  return (
    <div className="control-panel bg-gray-900 text-white p-4 rounded-lg shadow-lg">
      <h2 className="text-lg font-bold mb-4 text-blue-400 flex items-center gap-2">
        <span>⚙️</span>
        <span>Control Panel</span>
      </h2>

      {/* Simulation Controls */}
      <div className="mb-4 p-3 bg-gray-800 rounded">
        <h3 className="text-sm font-semibold mb-3 text-gray-300">Simulation Control</h3>
        <div className="flex gap-2">
          <button
            onClick={onStart}
            disabled={isRunning}
            className={`flex-1 py-2 px-3 rounded font-medium transition ${
              isRunning 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            ▶ Start
          </button>
          <button
            onClick={onPause}
            disabled={!isRunning}
            className={`flex-1 py-2 px-3 rounded font-medium transition ${
              !isRunning 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }`}
          >
            ⏸ Pause
          </button>
          <button
            onClick={onReset}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded font-medium transition"
          >
            ⟳ Reset
          </button>
        </div>
        <div className="mt-2 text-xs text-center">
          <span className={`font-mono ${isRunning ? 'text-green-400' : 'text-gray-500'}`}>
            {isRunning ? '● ACTIVE' : '○ PAUSED'}
          </span>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="mb-4 p-3 bg-gray-800 rounded">
        <h3 className="text-sm font-semibold mb-3 text-gray-300">Analytics Summary</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-900 bg-opacity-30 p-2 rounded text-center">
            <div className="text-2xl font-bold text-blue-400">{totalDetected}</div>
            <div className="text-xs text-gray-400">Detected</div>
          </div>
          <div className="bg-red-900 bg-opacity-30 p-2 rounded text-center">
            <div className="text-2xl font-bold text-red-400">{threatsDetected}</div>
            <div className="text-xs text-gray-400">Threats</div>
          </div>
          <div className="bg-yellow-900 bg-opacity-30 p-2 rounded text-center">
            <div className="text-2xl font-bold text-yellow-400">{unknownAircraft}</div>
            <div className="text-xs text-gray-400">Unknown</div>
          </div>
          <div className="bg-purple-900 bg-opacity-30 p-2 rounded text-center">
            <div className="text-2xl font-bold text-purple-400">{totalAlerts}</div>
            <div className="text-xs text-gray-400">Alerts</div>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="p-3 bg-gray-800 rounded text-center">
        <div className="text-xs text-gray-500 mb-1">System Status</div>
        <div className="text-sm font-mono text-green-400">
          ✓ ALL SYSTEMS OPERATIONAL
        </div>
      </div>
    </div>
  );
}
