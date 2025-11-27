import React, { useState, useEffect } from 'react';
import RadarSweep from './RadarSweep';
import MapView from './MapView';
import AircraftCategoriesMenu from './AircraftCategoriesMenu';
import ControlPanel from './ControlPanel';
import RestrictedAreaEditor from './RestrictedAreaEditor';
import RestrictedAreaManager from './RestrictedAreaManager';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * SimulationDashboard - Main integrated interface for aircraft detection simulation
 */
export default function SimulationDashboard() {
  const [flights, setFlights] = useState([]);
  const [filteredFlights, setFilteredFlights] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [restrictedArea, setRestrictedArea] = useState(null);
  const [allRestrictedAreas, setAllRestrictedAreas] = useState([]);
  const [isRunning, setIsRunning] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [viewMode, setViewMode] = useState('split'); // 'split', 'radar', 'map'
  const [weather, setWeather] = useState({ condition: 'Clear', visibility_km: 15 });
  const [dayNight, setDayNight] = useState('Day');
  const [showAreaEditor, setShowAreaEditor] = useState(false);
  const [showAreaManager, setShowAreaManager] = useState(false);

  // Fetch flights
  useEffect(() => {
    if (!isRunning) return;

    const fetchFlights = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/flights`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setFlights(response.data);
      } catch (error) {
        console.error('Error fetching flights:', error);
      }
    };

    fetchFlights();
    const interval = setInterval(fetchFlights, 2000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Fetch alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/alerts`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setAlerts(response.data);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch restricted area
  useEffect(() => {
    fetchRestrictedAreas();
  }, []);

  const fetchRestrictedAreas = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch active restricted area
      const activeResponse = await axios.get(`${API_BASE_URL}/restricted-areas/active`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setRestrictedArea(activeResponse.data);
      
      // Fetch all restricted areas
      const allResponse = await axios.get(`${API_BASE_URL}/restricted-areas/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setAllRestrictedAreas(allResponse.data || []);
    } catch (error) {
      console.error('Error fetching restricted areas:', error);
    }
  };

  // Apply filters
  useEffect(() => {
    if (Object.keys(selectedFilters).length === 0) {
      setFilteredFlights(flights);
      return;
    }

    const filtered = flights.filter(flight => {
      const cls = flight.classification || 'unknown';
      return selectedFilters[cls] !== false;
    });

    setFilteredFlights(filtered);
  }, [flights, selectedFilters]);

  // Simulate weather changes
  useEffect(() => {
    const weatherInterval = setInterval(() => {
      const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Rain'];
      const newCondition = conditions[Math.floor(Math.random() * conditions.length)];
      const visibility = {
        'Clear': 15,
        'Partly Cloudy': 10,
        'Cloudy': 7,
        'Rain': 3
      }[newCondition];
      setWeather({ condition: newCondition, visibility_km: visibility });
    }, 30000); // Change every 30 seconds

    return () => clearInterval(weatherInterval);
  }, []);

  // Day/night cycle
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) {
      setDayNight('Day');
    } else if ((hour >= 18 && hour < 20) || (hour >= 5 && hour < 6)) {
      setDayNight('Twilight');
    } else {
      setDayNight('Night');
    }
  }, []);

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = async () => {
    setIsRunning(false);
    setFlights([]);
    setAlerts([]);
    // In a real system, would call API to reset simulation
  };

  const handleFilterChange = (filters) => {
    setSelectedFilters(filters);
  };

  return (
    <div className="simulation-dashboard min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="mb-4 bg-gradient-to-r from-blue-900 to-green-900 p-4 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span>🛡️</span>
              <span>AI-Based Aircraft Detection System</span>
            </h1>
            <p className="text-sm text-gray-300 mt-1">
              Salem Air Defense Zone - Real-Time Simulation
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-300">
              Weather: <span className="font-semibold text-blue-300">{weather.condition}</span>
            </div>
            <div className="text-sm text-gray-300">
              Time: <span className="font-semibold text-yellow-300">{dayNight}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Visibility: {weather.visibility_km} km
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="mb-4 flex gap-2 justify-center items-center flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('split')}
            className={`px-4 py-2 rounded font-medium transition ${
              viewMode === 'split' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Split View
          </button>
          <button
            onClick={() => setViewMode('radar')}
            className={`px-4 py-2 rounded font-medium transition ${
              viewMode === 'radar' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Radar Only
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded font-medium transition ${
              viewMode === 'map' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Map Only
          </button>
        </div>

        {/* Restricted Area Controls */}
        <div className="flex gap-2 ml-4 border-l border-gray-600 pl-4">
          <button
            onClick={() => {
              setShowAreaEditor(!showAreaEditor);
              if (showAreaManager) setShowAreaManager(false);
            }}
            className={`px-4 py-2 rounded font-medium transition flex items-center gap-2 ${
              showAreaEditor 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <span>🗺️</span>
            <span>{showAreaEditor ? 'Close Editor' : 'Draw Zone'}</span>
          </button>
          <button
            onClick={() => {
              setShowAreaManager(!showAreaManager);
              if (showAreaEditor) setShowAreaEditor(false);
            }}
            className={`px-4 py-2 rounded font-medium transition flex items-center gap-2 ${
              showAreaManager 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <span>📋</span>
            <span>{showAreaManager ? 'Close Manager' : 'Manage Zones'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Sidebar - Aircraft Categories */}
        <div className="col-span-2">
          <AircraftCategoriesMenu 
            flights={flights}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Center - Radar and/or Map */}
        <div className="col-span-8">
          {(viewMode === 'split' || viewMode === 'radar') && (
            <div className="mb-4 flex justify-center">
              <RadarSweep 
                flights={filteredFlights}
                restrictedArea={restrictedArea}
                width={viewMode === 'radar' ? 600 : 500}
                height={viewMode === 'radar' ? 600 : 500}
              />
            </div>
          )}

          {(viewMode === 'split' || viewMode === 'map') && (
            <div className="bg-gray-900 rounded-lg overflow-hidden relative" style={{ height: viewMode === 'map' ? '700px' : '500px' }}>
              <MapView 
                flights={filteredFlights}
                restrictedArea={restrictedArea}
                allRestrictedAreas={allRestrictedAreas}
                onFlightClick={(flight) => console.log('Flight clicked:', flight)}
                showAreaEditor={showAreaEditor}
                onAreaCreated={() => {
                  setShowAreaEditor(false);
                  fetchRestrictedAreas();
                }}
                onEditorClose={() => setShowAreaEditor(false)}
              />
            </div>
          )}

          {/* Alert Banner */}
          {alerts.length > 0 && (
            <div className="mt-4 bg-red-900 bg-opacity-50 border-2 border-red-500 rounded-lg p-3 animate-pulse">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚨</span>
                <div>
                  <div className="font-bold text-red-300">ACTIVE ALERTS: {alerts.length}</div>
                  <div className="text-sm text-red-200">
                    {alerts.slice(0, 3).map((alert, i) => (
                      <div key={i}>{alert.message}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Control Panel */}
        <div className="col-span-2 space-y-4">
          <ControlPanel 
            onStart={handleStart}
            onPause={handlePause}
            onReset={handleReset}
            isRunning={isRunning}
            flights={filteredFlights}
            alerts={alerts}
          />
          
          {/* Restricted Area Manager */}
          {showAreaManager && (
            <RestrictedAreaManager 
              onUpdate={() => {
                // Refresh restricted areas when updated
                fetchRestrictedAreas();
              }}
            />
          )}
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="mt-4 bg-gray-900 p-3 rounded-lg text-center text-sm">
        <span className="text-gray-400">System Status:</span>
        <span className={`ml-2 font-bold ${isRunning ? 'text-green-400' : 'text-yellow-400'}`}>
          {isRunning ? '● ACTIVE SURVEILLANCE' : '○ PAUSED'}
        </span>
        <span className="ml-4 text-gray-400">|</span>
        <span className="ml-4 text-gray-400">Aircraft Tracked:</span>
        <span className="ml-2 font-bold text-blue-400">{filteredFlights.length}</span>
        <span className="ml-4 text-gray-400">|</span>
        <span className="ml-4 text-gray-400">Threats:</span>
        <span className="ml-2 font-bold text-red-400">
          {filteredFlights.filter(f => f.threat_level === 'Critical' || f.threat_level === 'High').length}
        </span>
      </div>
    </div>
  );
}
