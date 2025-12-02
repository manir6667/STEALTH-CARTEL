import React, { useState, useEffect } from 'react';

export default function ManualFlightPlacer({ onPlacementModeChange }) {
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  const [aircraftType, setAircraftType] = useState('commercial');
  const [speed, setSpeed] = useState(300);
  const [altitude, setAltitude] = useState(30000);
  const [heading, setHeading] = useState(0);
  const [hasTransponder, setHasTransponder] = useState(true);
  const [placedCount, setPlacedCount] = useState(0);
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(true); // Default expanded

  // Direction presets
  const directionPresets = [
    { label: 'N', value: 0 },
    { label: 'NE', value: 45 },
    { label: 'E', value: 90 },
    { label: 'SE', value: 135 },
    { label: 'S', value: 180 },
    { label: 'SW', value: 225 },
    { label: 'W', value: 270 },
    { label: 'NW', value: 315 },
  ];

  useEffect(() => {
    const handlePlacement = () => {
      setPlacedCount(prev => prev + 1);
    };
    window.addEventListener('aircraftPlaced', handlePlacement);
    return () => window.removeEventListener('aircraftPlaced', handlePlacement);
  }, []);

  const togglePlacementMode = () => {
    const newMode = !isPlacementMode;
    setIsPlacementMode(newMode);
    onPlacementModeChange(newMode, {
      aircraftType,
      speed,
      altitude,
      heading,
      hasTransponder
    });
    setMessage(newMode ? '🎯 Click on the map to place aircraft' : '');
  };

  // Update placement config when settings change (while in placement mode)
  useEffect(() => {
    if (isPlacementMode) {
      onPlacementModeChange(true, {
        aircraftType,
        speed,
        altitude,
        heading,
        hasTransponder
      });
    }
  }, [heading, speed, altitude, aircraftType, hasTransponder]);

  return (
    <div className="bg-gray-800 rounded-lg p-3 shadow-lg">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span>🎯</span>
          <span>Manual Placement</span>
        </h3>
        <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Direction Control - Prominent */}
          <div className="bg-gray-900 rounded p-2">
            <label className="block text-xs text-gray-400 mb-2">✈️ Flight Direction</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {directionPresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setHeading(preset.value)}
                  className={`px-2 py-1 text-xs rounded transition ${
                    heading === preset.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="359"
                value={heading}
                onChange={(e) => setHeading(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-mono text-blue-400 w-12">{heading}°</span>
            </div>
          </div>

          {/* Speed Control */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Speed: {speed} kt</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="50"
                max="900"
                step="10"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <input
                type="number"
                min="50"
                max="900"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value) || 300)}
                className="w-16 bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600 text-center"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              value={aircraftType}
              onChange={(e) => setAircraftType(e.target.value)}
              className="w-full bg-gray-700 text-white text-sm px-2 py-1.5 rounded border border-gray-600"
            >
              <option value="commercial">Commercial</option>
              <option value="private">Private</option>
              <option value="military">Military</option>
              <option value="helicopter">Helicopter</option>
              <option value="drone">Drone</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Alt: {(altitude/1000).toFixed(0)}k ft</label>
              <input
                type="range"
                min="1000"
                max="50000"
                step="5000"
                value={altitude}
                onChange={(e) => setAltitude(parseInt(e.target.value))}
                className="w-full h-1.5"
              />
            </div>
            <div className="flex items-center justify-center bg-gray-900 rounded p-2">
              <label className="text-xs text-gray-400 mr-2">Transponder</label>
              <input
                type="checkbox"
                checked={hasTransponder}
                onChange={(e) => setHasTransponder(e.target.checked)}
                className="w-4 h-4"
              />
            </div>
          </div>

          {placedCount > 0 && (
            <div className="bg-gray-900 rounded p-2 text-center">
              <span className="text-xs text-gray-400">Placed: </span>
              <span className="text-lg font-bold text-green-400">{placedCount}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3">
        <button
          onClick={togglePlacementMode}
          className={`w-full font-semibold py-2 px-4 rounded transition text-sm ${
            isPlacementMode
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          } text-white`}
        >
          {isPlacementMode ? '⏹ Stop Placing' : '▶ Start Placing'}
        </button>
      </div>

      {message && (
        <div className={`mt-2 rounded p-2 text-xs border ${
          isPlacementMode 
            ? 'bg-green-900 bg-opacity-30 border-green-700 text-green-200'
            : 'bg-gray-900 border-gray-700 text-gray-300'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}
