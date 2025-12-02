import React, { useState } from 'react';
import { flightsAPI } from '../services/api';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8001/api';

export default function FlightSimulatorControl() {
  const [numFlights, setNumFlights] = useState(1);
  const [aircraftType, setAircraftType] = useState('');
  const [heading, setHeading] = useState(0); // 0-360 degrees (0 = North)
  const [speed, setSpeed] = useState(300); // knots
  const [activeFlights, setActiveFlights] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationInterval, setSimulationInterval] = useState(null);
  const [message, setMessage] = useState('');

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

  const startSimulation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/simulator/start`,
        {
          num_flights: numFlights,
          aircraft_type: aircraftType || null,
          use_active_restricted_area: true,
          custom_heading: heading,
          custom_speed: speed
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setActiveFlights(response.data.active_flights);
      setMessage(`✓ Started ${numFlights} flight(s) at ${speed} kts, heading ${heading}°`);
    } catch (error) {
      setMessage(`✗ Error: ${error.response?.data?.detail || error.message}`);
    }
  };

  const runSimulation = async () => {
    if (isSimulating) {
      // Stop simulation
      if (simulationInterval) {
        clearInterval(simulationInterval);
        setSimulationInterval(null);
      }
      setIsSimulating(false);
      setMessage('⏸ Simulation paused');
      return;
    }

    // Start simulation
    setIsSimulating(true);
    setMessage('▶ Simulation running...');

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        // Use combined endpoint to move BOTH auto-simulated AND manual flights
        const response = await axios.post(
          `${API_BASE_URL}/simulator/send-all-combined`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const totalActive = response.data.auto_flights + response.data.manual_flights;
        setActiveFlights(totalActive);
        
        if (totalActive === 0) {
          clearInterval(interval);
          setIsSimulating(false);
          setMessage('✓ All flights completed');
        }
      } catch (error) {
        console.error('Error sending telemetry:', error);
      }
    }, 1000); // Send updates every 1 second for smooth movement

    setSimulationInterval(interval);
  };

  const clearSimulation = async () => {
    try {
      if (simulationInterval) {
        clearInterval(simulationInterval);
        setSimulationInterval(null);
      }
      setIsSimulating(false);

      const token = localStorage.getItem('token');
      
      // Clear simulator flights
      await axios.delete(
        `${API_BASE_URL}/simulator/clear`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Clear manual flights
      await axios.delete(
        `${API_BASE_URL}/simulator/manual/clear`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Clear all flight records from database
      const response = await axios.delete(
        `${API_BASE_URL}/flights/clear-all`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setActiveFlights(0);
      setMessage('✓ Cleared all flights and simulation data');
    } catch (error) {
      setMessage(`✗ Error: ${error.response?.data?.detail || error.message}`);
    }
  };

  const previewTrajectory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/simulator/preview-trajectory`,
        {
          num_flights: 1,
          aircraft_type: aircraftType || null,
          use_active_restricted_area: true
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('Preview trajectory:', response.data);
      setMessage(`Preview: ${response.data.aircraft_type} at ${response.data.speed.toFixed(0)} kts, ${response.data.altitude.toFixed(0)} ft`);
    } catch (error) {
      setMessage(`✗ Error: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3 shadow-lg">
      <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
        <span>✈️</span>
        <span>Flight Simulator</span>
      </h3>

      <div className="space-y-2">
        {/* Compact Row: Flights + Type */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Flights</label>
            <input
              type="number"
              min="1"
              max="10"
              value={numFlights}
              onChange={(e) => setNumFlights(parseInt(e.target.value))}
              className="w-full bg-gray-700 text-white text-sm px-2 py-1.5 rounded border border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              value={aircraftType}
              onChange={(e) => setAircraftType(e.target.value)}
              className="w-full bg-gray-700 text-white text-sm px-2 py-1.5 rounded border border-gray-600"
            >
              <option value="">Random</option>
              <option value="commercial">Commercial</option>
              <option value="private">Private</option>
              <option value="military">Military</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        {/* Direction Control */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Direction (Heading)</label>
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1">
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
          </div>
          <div className="flex items-center gap-2 mt-1">
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
          <label className="block text-xs text-gray-400 mb-1">Speed (knots)</label>
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
              className="w-20 bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 text-center"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Slow (50)</span>
            <span>Fast (900)</span>
          </div>
        </div>

        {/* Active Flights Counter */}
        <div className="bg-gray-900 rounded p-2 text-center">
          <span className="text-xs text-gray-400">Active: </span>
          <span className="text-xl font-bold text-blue-400">{activeFlights}</span>
        </div>

        {/* Control Buttons - Compact */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={startSimulation}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded transition text-sm"
          >
            ➕ Add
          </button>

          <button
            onClick={runSimulation}
            className={`font-semibold py-2 px-3 rounded transition text-sm ${
              isSimulating
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {isSimulating ? '⏸ Pause' : '▶ Run'}
          </button>
        </div>

        <button
          onClick={clearSimulation}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 rounded transition text-sm"
        >
          🗑️ Clear All
        </button>

        {/* Status Message */}
        {message && (
          <div className="bg-gray-900 rounded p-2 text-xs text-gray-300 border border-gray-700">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
