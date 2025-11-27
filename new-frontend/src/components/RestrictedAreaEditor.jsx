import React, { useState, useEffect, useRef } from 'react';
import { Polygon, useMapEvents } from 'react-leaflet';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * RestrictedAreaEditor - Draw custom restricted zones on the map
 */
export default function RestrictedAreaEditor({ onAreaCreated, onClose }) {
  const [points, setPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [areaName, setAreaName] = useState('');

  // Handle map clicks to add points
  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        if (isDrawing) {
          const newPoint = [e.latlng.lat, e.latlng.lng];
          setPoints(prev => [...prev, newPoint]);
        }
      }
    });
    return null;
  };

  const handleStartDrawing = () => {
    setPoints([]);
    setIsDrawing(true);
  };

  const handleFinishDrawing = () => {
    setIsDrawing(false);
  };

  const handleUndo = () => {
    setPoints(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPoints([]);
    setIsDrawing(false);
  };

  const handleSave = async () => {
    if (points.length < 3) {
      alert('Please draw at least 3 points to create an area');
      return;
    }

    if (!areaName.trim()) {
      alert('Please enter a name for the restricted area');
      return;
    }

    try {
      // Close the polygon by adding first point at the end
      const closedPoints = [...points, points[0]];
      
      // Convert to GeoJSON format [lng, lat]
      const coordinates = closedPoints.map(p => [p[1], p[0]]);
      
      const polygonGeoJSON = {
        type: 'Polygon',
        coordinates: [coordinates]
      };

      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/restricted-areas`,
        {
          name: areaName,
          polygon_json: JSON.stringify(polygonGeoJSON)
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert(`Restricted area "${areaName}" created successfully!`);
      if (onAreaCreated) onAreaCreated();
      handleClear();
      setAreaName('');
      if (onClose) onClose();
    } catch (error) {
      console.error('Error creating restricted area:', error);
      alert('Failed to create restricted area. Please try again.');
    }
  };

  return (
    <>
      <MapClickHandler />
      
      {/* Drawing Instructions Panel */}
      <div className="absolute top-20 left-4 bg-gray-900 bg-opacity-95 p-4 rounded-lg shadow-xl z-[1000] border-2 border-blue-500 max-w-sm">
        <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
          <span>🗺️</span>
          <span>Draw Restricted Area</span>
        </h3>

        {/* Name Input */}
        <div className="mb-3">
          <label className="block text-sm text-gray-300 mb-1">Area Name:</label>
          <input
            type="text"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            placeholder="e.g., Military Base Alpha"
            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Instructions */}
        <div className="mb-3 p-2 bg-gray-800 rounded text-xs text-gray-300">
          <p className="mb-1">📍 <strong>Step 1:</strong> Click "Start Drawing"</p>
          <p className="mb-1">📍 <strong>Step 2:</strong> Click on map to add points</p>
          <p className="mb-1">📍 <strong>Step 3:</strong> Click "Finish" when done</p>
          <p>📍 <strong>Step 4:</strong> Save the area</p>
        </div>

        {/* Drawing Status */}
        <div className="mb-3 text-center">
          {isDrawing ? (
            <div className="text-green-400 font-semibold animate-pulse">
              ✏️ Drawing Mode Active - Click on map
            </div>
          ) : (
            <div className="text-gray-400">
              {points.length} point(s) added
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="space-y-2">
          {!isDrawing ? (
            <button
              onClick={handleStartDrawing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
            >
              ✏️ Start Drawing
            </button>
          ) : (
            <button
              onClick={handleFinishDrawing}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition"
            >
              ✓ Finish Drawing
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleUndo}
              disabled={points.length === 0}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-2 px-3 rounded transition text-sm"
            >
              ↶ Undo
            </button>
            <button
              onClick={handleClear}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded transition text-sm"
            >
              ✕ Clear
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={points.length < 3 || !areaName.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded transition"
          >
            💾 Save Restricted Area
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Draw the polygon preview */}
      {points.length > 0 && (
        <Polygon
          positions={points}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.3,
            weight: 3,
            dashArray: '10, 5'
          }}
        />
      )}

      {/* Draw points as markers */}
      {points.map((point, index) => (
        <div key={index}>
          {/* Small circle marker at each point */}
          <div
            style={{
              position: 'absolute',
              width: '10px',
              height: '10px',
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
              border: '2px solid white',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              pointerEvents: 'none'
            }}
          />
        </div>
      ))}
    </>
  );
}
