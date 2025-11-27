import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import RestrictedAreaEditor from './RestrictedAreaEditor';

// Animated Marker Component with smooth movement
function AnimatedMarker({ flightId, position, icon, children, eventHandlers }) {
  const markerRef = useRef(null);
  const [internalPosition, setInternalPosition] = useState(position);
  const previousPositionRef = useRef(position);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const [newLat, newLng] = position;
    const [prevLat, prevLng] = previousPositionRef.current;
    
    // Calculate distance moved
    const latDiff = Math.abs(newLat - prevLat);
    const lngDiff = Math.abs(newLng - prevLng);
    
    // Only animate if position changed significantly
    if (latDiff > 0.0001 || lngDiff > 0.0001) {
  // Animate to new position over ~1s to match simulator update rate
  const startTime = Date.now();
  const duration = 1000; // keep in sync with backend/simulator tick
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Linear interpolation
        const currentLat = prevLat + (newLat - prevLat) * progress;
        const currentLng = prevLng + (newLng - prevLng) * progress;
        
        setInternalPosition([currentLat, currentLng]);
        
        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          previousPositionRef.current = position;
        }
      };
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [position[0], position[1]]);

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

export default function MapView({ flights, restrictedArea, allRestrictedAreas, onFlightClick, showAreaEditor, onAreaCreated, onEditorClose }) {
  // Salem, Tamil Nadu coordinates as default
  const [center, setCenter] = useState([11.6643, 78.1460]); 
  const [polygonCoords, setPolygonCoords] = useState([]);
  const [allPolygons, setAllPolygons] = useState([]);
  // Trails removed per request to avoid long guiding lines

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
        className="h-full w-full"
      >
        {/* Auto-fit to restricted polygon so crossings are visible */}
        <FitBoundsOnPolygon polygonCoords={polygonCoords} />
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
