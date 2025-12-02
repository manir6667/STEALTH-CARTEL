import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import RestrictedAreaEditor from './RestrictedAreaEditor';

// Map click handler for manual aircraft placement
function MapClickHandler({ onPlaceAircraft }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onPlaceAircraft(lat, lng);
    },
  });
  return null;
}

// Animated Marker Component with smooth movement
function AnimatedMarker({ flightId, position, icon, children, eventHandlers }) {
  const markerRef = useRef(null);
  const [internalPosition, setInternalPosition] = useState(position);
  const animationFrameRef = useRef(null);
  const targetPositionRef = useRef(position);
  const currentPositionRef = useRef(position);
  const lastUpdateTimeRef = useRef(Date.now());

  useEffect(() => {
    const [newLat, newLng] = position;
    const [currentLat, currentLng] = currentPositionRef.current;
    
    // Calculate distance moved
    const latDiff = Math.abs(newLat - currentLat);
    const lngDiff = Math.abs(newLng - currentLng);
    
    // Update target position - always animate FROM current position TO new position
    targetPositionRef.current = position;
    
    // Only start new animation if position changed significantly
    if (latDiff > 0.00001 || lngDiff > 0.00001) {
      // Cancel any existing animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Capture the current interpolated position as the starting point
      const startLat = currentPositionRef.current[0];
      const startLng = currentPositionRef.current[1];
      const startTime = Date.now();
      const duration = 950; // Slightly less than 1s update interval for smooth overlap
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing function for more natural movement
        const easeProgress = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        // Linear interpolation from start to target
        const [targetLat, targetLng] = targetPositionRef.current;
        const interpLat = startLat + (targetLat - startLat) * easeProgress;
        const interpLng = startLng + (targetLng - startLng) * easeProgress;
        
        // Update both the displayed position and the current position ref
        currentPositionRef.current = [interpLat, interpLng];
        setInternalPosition([interpLat, interpLng]);
        
        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
      lastUpdateTimeRef.current = Date.now();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [position[0], position[1]]);

  // Initialize position on mount
  useEffect(() => {
    currentPositionRef.current = position;
    setInternalPosition(position);
  }, []);

  return (
    <Marker
      ref={markerRef}
      position={internalPosition}
      icon={icon}
      eventHandlers={eventHandlers}
    >
      {children}
    </Marker>
  );
}

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons for different aircraft types with animation
const createIcon = (color) => {
  return L.divIcon({
    className: 'custom-aircraft-icon',
    html: `<div style="
      background-color: ${color};
      width: 10px;
      height: 10px;
      border-radius: 50%;
      /* minimal dot: no border, no glow */
    "></div>
    `,
    iconSize: [10, 10]
  });
};

const icons = {
  civilian_prop: createIcon('#4ade80'),
  airliner: createIcon('#3b82f6'),
  high_performance: createIcon('#f59e0b'),
  fighter: createIcon('#ef4444'),
  unknown: createIcon('#9ca3af')
};

// Fit the map to the restricted polygon when it loads/changes
function FitBoundsOnPolygon({ polygonCoords }) {
  const map = useMap();
  useEffect(() => {
    if (polygonCoords && polygonCoords.length > 0) {
      map.fitBounds(polygonCoords, { padding: [30, 30] });
    }
  }, [polygonCoords, map]);
  return null;
}

export default function MapView({ flights, restrictedArea, allRestrictedAreas, onFlightClick, showAreaEditor, onAreaCreated, onEditorClose, isPlacementMode, placementConfig, onPlaceAircraft, showTrails = true }) {
  // Salem, Tamil Nadu coordinates as default
  const [center, setCenter] = useState([11.6643, 78.1460]); 
  const [polygonCoords, setPolygonCoords] = useState([]);
  const [allPolygons, setAllPolygons] = useState([]);
  const [flightTrails, setFlightTrails] = useState({}); // Store trail history for each flight

  // Keep only one latest record per aircraft (single moving dot)
  const uniqueFlights = useMemo(() => {
    if (!Array.isArray(flights)) return [];
    const byId = new Map();
    for (const f of flights) {
      const key = f.transponder_id || f.id;
      if (!key) continue;
      // choose the most recent by known timestamp fields if present
      const t = f.timestamp || f.updated_at || f.created_at || f.time || 0;
      const prev = byId.get(key);
      if (!prev) {
        byId.set(key, { f, t });
      } else {
        const pt = prev.t || 0;
        if (t >= pt) byId.set(key, { f, t });
      }
      // if no timestamp, later items override earlier (natural order)
      if (!('timestamp' in f || 'updated_at' in f || 'created_at' in f || 'time' in f)) {
        byId.set(key, { f, t: Date.now() });
      }
    }
    return Array.from(byId.values()).map(v => v.f);
  }, [flights]);

  // Update flight trails when flights change
  useEffect(() => {
    if (!showTrails) return;
    
    setFlightTrails(prev => {
      const newTrails = { ...prev };
      const maxTrailLength = 20; // Keep last 20 positions
      
      uniqueFlights.forEach(flight => {
        const key = flight.transponder_id || flight.id;
        if (!key || !flight.latitude || !flight.longitude) return;
        
        const position = [flight.latitude, flight.longitude];
        
        if (!newTrails[key]) {
          newTrails[key] = [position];
        } else {
          const lastPos = newTrails[key][newTrails[key].length - 1];
          // Only add if position changed significantly
          const dist = Math.sqrt(
            Math.pow(position[0] - lastPos[0], 2) + 
            Math.pow(position[1] - lastPos[1], 2)
          );
          if (dist > 0.0001) {
            newTrails[key] = [...newTrails[key], position].slice(-maxTrailLength);
          }
        }
      });
      
      // Remove trails for flights that no longer exist
      const activeKeys = new Set(uniqueFlights.map(f => f.transponder_id || f.id));
      Object.keys(newTrails).forEach(key => {
        if (!activeKeys.has(key)) {
          delete newTrails[key];
        }
      });
      
      return newTrails;
    });
  }, [uniqueFlights, showTrails]);

  useEffect(() => {
    if (restrictedArea && restrictedArea.polygon_json) {
      try {
        const geojson = JSON.parse(restrictedArea.polygon_json);
        if (geojson.type === 'Polygon' && geojson.coordinates) {
          // GeoJSON uses [lng, lat], Leaflet uses [lat, lng]
          const coords = geojson.coordinates[0].map(coord => [coord[1], coord[0]]);
          setPolygonCoords(coords);
          // Center map on restricted area
          if (coords.length > 0) {
            setCenter(coords[0]);
          }
        }
      } catch (e) {
        console.error('Error parsing restricted area polygon:', e);
      }
    }
  }, [restrictedArea]);

  // Parse all restricted areas
  useEffect(() => {
    if (allRestrictedAreas && Array.isArray(allRestrictedAreas)) {
      const polygons = allRestrictedAreas
        .filter(area => area.polygon_json && area.is_active)
        .map(area => {
          try {
            const geojson = JSON.parse(area.polygon_json);
            if (geojson.type === 'Polygon' && geojson.coordinates) {
              const coords = geojson.coordinates[0].map(coord => [coord[1], coord[0]]);
              return { id: area.id, name: area.name, coords, is_active: area.is_active };
            }
          } catch (e) {
            console.error('Error parsing restricted area:', e);
          }
          return null;
        })
        .filter(Boolean);
      setAllPolygons(polygons);
    }
  }, [allRestrictedAreas]);

  return (
    <div className="h-full w-full">
      <MapContainer
        center={center}
        zoom={10}
        minZoom={2}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
        className="h-full w-full"
      >
        {/* Auto-fit to restricted polygon so crossings are visible */}
        <FitBoundsOnPolygon polygonCoords={polygonCoords} />
        {/* Map click handler for manual placement */}
        {isPlacementMode && onPlaceAircraft && (
          <MapClickHandler onPlaceAircraft={onPlaceAircraft} />
        )}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Restricted area polygon (minimal style) */}
        {polygonCoords.length > 0 && (
          <Polygon
            positions={polygonCoords}
            pathOptions={{
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '8,4'
            }}
          />
        )}

        {/* All restricted areas (user-drawn zones) */}
        {allPolygons.map((polygon, index) => (
          <Polygon
            key={polygon.id}
            positions={polygon.coords}
            pathOptions={{
              color: index % 2 === 0 ? '#f59e0b' : '#8b5cf6', // Alternate orange/purple
              fillColor: index % 2 === 0 ? '#f59e0b' : '#8b5cf6',
              fillOpacity: 0.2,
              weight: 3,
              dashArray: '10,5'
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold">{polygon.name}</div>
                <div className="text-xs text-gray-600">Custom Restricted Zone</div>
              </div>
            </Popup>
          </Polygon>
        ))}

        {/* Trails removed: markers will move smoothly without guide lines */}

        {/* Flight trails - show path history */}
        {showTrails && Object.entries(flightTrails).map(([key, trail]) => {
          if (trail.length < 2) return null;
          const flight = uniqueFlights.find(f => (f.transponder_id || f.id) === key);
          const color = flight?.in_restricted_area ? '#ef4444' : '#3b82f6';
          return (
            <Polyline
              key={`trail-${key}`}
              positions={trail}
              pathOptions={{
                color: color,
                weight: 2,
                opacity: 0.6,
                dashArray: '4,4',
              }}
            />
          );
        })}

        {/* Flight markers with animation (single dot per aircraft) */}
        {uniqueFlights.map((flight) => {
          const key = flight.transponder_id || flight.id;
          const icon = flight.in_restricted_area
            ? icons.fighter // force red when violating
            : (icons[flight.classification] || icons.unknown);
          return (
            <AnimatedMarker
              key={key}
              flightId={key}
              position={[flight.latitude, flight.longitude]}
              icon={icon}
              eventHandlers={onFlightClick ? { click: () => onFlightClick(flight) } : undefined}
            >
              {/* Minimal mode: no popup to keep map clean */}
            </AnimatedMarker>
          );
        })}

        {/* Restricted Area Editor - rendered inside MapContainer */}
        {showAreaEditor && (
          <RestrictedAreaEditor
            onAreaCreated={onAreaCreated}
            onClose={onEditorClose}
          />
        )}
      </MapContainer>

      {/* Legend removed for minimal look */}
    </div>
  );
}
