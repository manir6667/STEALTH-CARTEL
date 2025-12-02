import React, { useState, useEffect, useCallback, useRef } from 'react';
import RadarSweep from './RadarSweep';
import MapView from './MapView';
import AircraftCategoriesMenu from './AircraftCategoriesMenu';
import ControlPanel from './ControlPanel';
import RestrictedAreaEditor from './RestrictedAreaEditor';
import RestrictedAreaManager from './RestrictedAreaManager';
import FlightSimulatorControl from './FlightSimulatorControl';
import ManualFlightPlacer from './ManualFlightPlacer';
import AnalyticsDashboard from './AnalyticsDashboard';
import IncidentHistory from './IncidentHistory';
import SettingsPage from './SettingsPage';
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from './KeyboardShortcuts';
import { useSoundAlerts, playSuccessSound, playClickSound } from './SoundManager';
import { ToastContainer, useNotifications, requestNotificationPermission } from './NotificationManager';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8001/api';

// Check if we're in demo mode (no backend available)
const isDemoMode = () => localStorage.getItem('demoMode') === 'true';

// Demo data for when backend is not available
const generateDemoFlights = () => {
  const types = ['Commercial', 'Private', 'Military', 'Helicopter', 'Drone'];
  const demoFlights = [];
  
  for (let i = 0; i < 8; i++) {
    const baseLat = 11.6643 + (Math.random() - 0.5) * 0.5;
    const baseLng = 78.1460 + (Math.random() - 0.5) * 0.5;
    const inZone = Math.random() > 0.7;
    
    demoFlights.push({
      id: i + 1,
      transponder_id: `DEMO${1000 + i}`,
      latitude: baseLat,
      longitude: baseLng,
      altitude: 15000 + Math.random() * 25000,
      groundspeed: 200 + Math.random() * 400,
      track: Math.random() * 360,
      aircraft_type: types[Math.floor(Math.random() * types.length)],
      classification: ['civilian_prop', 'airliner', 'high_performance', 'fighter'][Math.floor(Math.random() * 4)],
      in_restricted_area: inZone,
      threat_level: inZone ? ['High', 'Critical'][Math.floor(Math.random() * 2)] : 'Low',
      timestamp: new Date().toISOString()
    });
  }
  return demoFlights;
};

const demoRestrictedArea = {
  id: 1,
  name: 'Demo Restricted Zone',
  polygon_json: JSON.stringify({
    type: 'Polygon',
    coordinates: [[
      [78.0, 11.5],
      [78.3, 11.5],
      [78.3, 11.8],
      [78.0, 11.8],
      [78.0, 11.5]
    ]]
  }),
  is_active: true
};

const generateDemoAlerts = (flights) => {
  return flights
    .filter(f => f.in_restricted_area)
    .map((f, i) => ({
      id: i + 1,
      transponder_id: f.transponder_id,
      severity: f.threat_level === 'Critical' ? 'CRITICAL' : 'HIGH',
      alert_type: 'ZONE_INTRUSION',
      message: `Aircraft ${f.transponder_id} detected in restricted airspace`,
      detected_at: new Date().toISOString(),
      status: 'active'
    }));
};

/**
 * SimulationDashboard - Main integrated interface for aircraft detection simulation
 */
export default function SimulationDashboard() {
  const { theme, themeName, toggleTheme } = useTheme();
  
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
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  const [placementConfig, setPlacementConfig] = useState(null);
  const [inDemoMode, setInDemoMode] = useState(isDemoMode());
  
  // New enhanced states
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('app-settings');
    return saved ? JSON.parse(saved) : {
      soundEnabled: true,
      notificationsEnabled: true,
      autoRefresh: true,
      refreshInterval: 1000,
      showFlightTrails: true,
      animationsEnabled: true,
    };
  });
  
  const searchInputRef = useRef(null);
  
  // Sound alerts hook
  useSoundAlerts(flights, settings.soundEnabled);
  
  // Notifications hook
  const { notifyNewAlert } = useNotifications(settings.notificationsEnabled);
  
  // Request notification permission on mount
  useEffect(() => {
    if (settings.notificationsEnabled) {
      requestNotificationPermission();
    }
  }, [settings.notificationsEnabled]);
  
  // Add toast notification
  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);
  
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  // Keyboard shortcuts
  useKeyboardShortcuts({
    onTogglePause: () => {
      setIsRunning(prev => {
        const newState = !prev;
        addToast(newState ? 'Simulation resumed' : 'Simulation paused', 'info');
        playClickSound();
        return newState;
      });
    },
    onReset: () => {
      handleReset();
      addToast('Simulation reset', 'warning');
    },
    onToggleAddMode: () => {
      setIsPlacementMode(prev => !prev);
      playClickSound();
    },
    onToggleTheme: () => {
      toggleTheme();
      playClickSound();
    },
    onToggleView: () => {
      setViewMode(prev => {
        const modes = ['split', 'radar', 'map'];
        const idx = modes.indexOf(prev);
        return modes[(idx + 1) % modes.length];
      });
      playClickSound();
    },
    onEscape: () => {
      if (showSettings) setShowSettings(false);
      else if (showShortcutsHelp) setShowShortcutsHelp(false);
      else if (isPlacementMode) setIsPlacementMode(false);
      else if (showAreaEditor) setShowAreaEditor(false);
    },
    onFocusSearch: () => {
      searchInputRef.current?.focus();
    },
    enabled: !showSettings,
  });

  // Fetch flights
  useEffect(() => {
    if (!isRunning || !settings.autoRefresh) return;

    const fetchFlights = async () => {
      // Demo mode - use generated data
      if (inDemoMode) {
        const demoFlights = generateDemoFlights();
        setFlights(demoFlights);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/flights`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Group by transponder_id and keep only the most recent position for each aircraft
        const flightsData = response.data;
        const latestFlights = {};
        
        flightsData.forEach(flight => {
          const key = flight.transponder_id || `unknown_${flight.id}`;
          if (!latestFlights[key] || new Date(flight.timestamp) > new Date(latestFlights[key].timestamp)) {
            latestFlights[key] = flight;
          }
        });
        
        setFlights(Object.values(latestFlights));
      } catch (error) {
        console.error('Error fetching flights:', error);
        // Fallback to demo mode if backend fails
        if (!inDemoMode) {
          setInDemoMode(true);
          localStorage.setItem('demoMode', 'true');
        }
      }
    };

    fetchFlights();
    const interval = setInterval(fetchFlights, settings.refreshInterval || 1000);
    return () => clearInterval(interval);
  }, [isRunning, settings.autoRefresh, settings.refreshInterval, inDemoMode]);

  // Fetch alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      // Demo mode - generate alerts from flights
      if (inDemoMode) {
        setAlerts(generateDemoAlerts(flights));
        return;
      }

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
  }, [inDemoMode, flights]);

  // Fetch restricted area
  useEffect(() => {
    fetchRestrictedAreas();
  }, [inDemoMode]);

  const fetchRestrictedAreas = async () => {
    // Demo mode - use demo restricted area
    if (inDemoMode) {
      setRestrictedArea(demoRestrictedArea);
      setAllRestrictedAreas([demoRestrictedArea]);
      return;
    }

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

  const handlePlacementModeChange = (isActive, config) => {
    setIsPlacementMode(isActive);
    setPlacementConfig(config);
    if (isActive) {
      setShowAreaEditor(false);
      setShowAreaManager(false);
    }
  };

  const handlePlaceAircraft = async (lat, lng) => {
    if (!isPlacementMode || !placementConfig) return;

    try {
      const token = localStorage.getItem('token');
      
      // Generate transponder ID if needed
      let transponder_id = null;
      if (placementConfig.hasTransponder) {
        const prefix = {
          'commercial': 'COM',
          'private': 'PVT',
          'military': 'MIL',
          'helicopter': 'HEL',
          'drone': 'DRN'
        }[placementConfig.aircraftType] || 'UNK';
        transponder_id = `${prefix}${Math.floor(Math.random() * 9000) + 1000}`;
      }

      // Register manual flight (will create trajectory through zone)
      const registerResponse = await axios.post(
        `${API_BASE_URL}/simulator/manual/register`,
        {
          transponder_id: transponder_id,
          latitude: lat,
          longitude: lng,
          altitude: placementConfig.altitude,
          groundspeed: placementConfig.speed,
          track: placementConfig.heading
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log(`✓ Registered manual flight: ${registerResponse.data.flight_id}`);
      console.log(`  Aircraft will move through restricted zone`);
      
      // Dispatch event to update placement counter
      window.dispatchEvent(new Event('aircraftPlaced'));
    } catch (error) {
      console.error('Error placing aircraft:', error);
    }
  };

  return (
    <div className={`simulation-dashboard min-h-screen text-white p-4 transition-colors duration-300 ${
      themeName === 'dark' ? 'bg-gray-950' : 
      themeName === 'light' ? 'bg-gray-100 text-gray-900' : 
      'bg-[#0c1810]'
    }`}>
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Settings Modal */}
      <SettingsPage 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        settings={settings}
        onSettingsChange={setSettings}
      />
      
      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp 
        isOpen={showShortcutsHelp} 
        onClose={() => setShowShortcutsHelp(false)} 
      />
      
      {/* Header */}
      <div className={`mb-4 p-4 rounded-lg shadow-lg transition-all duration-300 ${
        themeName === 'military' 
          ? 'bg-gradient-to-r from-green-900/80 to-emerald-900/80' 
          : 'bg-gradient-to-r from-blue-900 to-green-900'
      }`}>
        {/* Demo Mode Banner */}
        {inDemoMode && (
          <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-black text-center text-xs py-1 font-medium">
            🎮 DEMO MODE - Simulated data (Backend not connected)
          </div>
        )}
        
        <div className={`flex items-center justify-between ${inDemoMode ? 'mt-6' : ''}`}>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <span>🛡️</span>
              <span>AI-Based Aircraft Detection System</span>
            </h1>
            <p className="text-sm text-gray-300 mt-1">
              Real-Time Air Defense Simulation
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2 mr-4">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`p-2 rounded-lg transition-colors ${
                showAnalytics ? 'bg-blue-600' : 'bg-gray-800/50 hover:bg-gray-700'
              }`}
              title="Analytics Dashboard"
            >
              📊
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-lg transition-colors ${
                showHistory ? 'bg-blue-600' : 'bg-gray-800/50 hover:bg-gray-700'
              }`}
              title="Incident History"
            >
              📋
            </button>
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-colors"
              title="Keyboard Shortcuts (?)"
            >
              ⌨️
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-colors"
              title="Toggle Theme (T)"
            >
              {themeName === 'dark' ? '🌙' : themeName === 'light' ? '☀️' : '🌲'}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-colors"
              title="Settings"
            >
              ⚙️
            </button>
          </div>
          
          <div className="text-right mr-24">
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
        {/* Left Sidebar - Aircraft Categories or Analytics */}
        <div className="col-span-2">
          {showAnalytics ? (
            <AnalyticsDashboard 
              flights={flights}
              alerts={alerts}
              restrictedAreas={allRestrictedAreas}
            />
          ) : showHistory ? (
            <IncidentHistory 
              alerts={alerts}
              flights={flights}
            />
          ) : (
            <AircraftCategoriesMenu 
              flights={flights}
              onFilterChange={handleFilterChange}
            />
          )}
        </div>

        {/* Center - Radar and/or Map */}
        <div className="col-span-7">
          {(viewMode === 'split' || viewMode === 'radar') && (
            <div className="mb-4 flex justify-center">
              <RadarSweep 
                flights={filteredFlights}
                restrictedArea={restrictedArea}
                width={viewMode === 'radar' ? 600 : 400}
                height={viewMode === 'radar' ? 600 : 400}
              />
            </div>
          )}

          {(viewMode === 'split' || viewMode === 'map') && (
            <div className="bg-gray-900 rounded-lg overflow-hidden relative" style={{ height: viewMode === 'map' ? '700px' : '500px' }}>
              {/* Placement Mode Indicator */}
              {isPlacementMode && (
                <div className="absolute top-2 left-2 z-[1000] bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                  📍 PLACEMENT MODE - Click to place aircraft
                </div>
              )}
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
                isPlacementMode={isPlacementMode}
                placementConfig={placementConfig}
                onPlaceAircraft={handlePlaceAircraft}
                showTrails={settings.showFlightTrails}
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
                      <div key={i} className="truncate">{alert.message?.slice(0, 60)}...</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Control Panel */}
        <div className="col-span-3 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Flight Simulator Control - Most Important */}
          <FlightSimulatorControl />
          
          {/* Manual Flight Placer */}
          <ManualFlightPlacer 
            onPlacementModeChange={handlePlacementModeChange}
          />
          
          {/* Control Panel */}
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
