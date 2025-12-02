import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, Polygon, InfoWindow } from '@react-google-maps/api';

// Google Maps API Key - Replace with your own key
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

// Map container style
const containerStyle = {
  width: '100%',
  height: '100%'
};

// Map options
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
  mapTypeId: 'hybrid', // satellite with labels
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

// Aircraft marker colors
const markerColors = {
  civilian_prop: '#4ade80',
  airliner: '#3b82f6',
  high_performance: '#f59e0b',
  fighter: '#ef4444',
  unknown: '#9ca3af',
  restricted: '#ef4444'
};

// Create SVG marker icon
const createMarkerIcon = (color, size = 12) => {
  return {
    path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale: size
  };
};

// Animated marker component for smooth movement
function AnimatedAircraftMarker({ flight, onClick }) {
  const [position, setPosition] = useState({ 
    lat: flight.latitude, 
    lng: flight.longitude 
  });
  const animationRef = useRef(null);
  const currentPosRef = useRef({ lat: flight.latitude, lng: flight.longitude });
  const targetPosRef = useRef({ lat: flight.latitude, lng: flight.longitude });

  useEffect(() => {
    const newTarget = { lat: flight.latitude, lng: flight.longitude };
    const current = currentPosRef.current;
    
    // Check if position changed
    const latDiff = Math.abs(newTarget.lat - current.lat);
    const lngDiff = Math.abs(newTarget.lng - current.lng);
    
    if (latDiff > 0.00001 || lngDiff > 0.00001) {
      targetPosRef.current = newTarget;
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      const startLat = current.lat;
      const startLng = current.lng;
      const startTime = Date.now();
      const duration = 950;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const ease = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        const interpLat = startLat + (targetPosRef.current.lat - startLat) * ease;
        const interpLng = startLng + (targetPosRef.current.lng - startLng) * ease;
        
        currentPosRef.current = { lat: interpLat, lng: interpLng };
        setPosition({ lat: interpLat, lng: interpLng });
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [flight.latitude, flight.longitude]);

  const color = flight.in_restricted_area 
    ? markerColors.restricted 
    : (markerColors[flight.classification] || markerColors.unknown);

  const icon = window.google ? createMarkerIcon(color, flight.in_restricted_area ? 10 : 8) : null;

  return (
    <Marker
      position={position}
      icon={icon}
      onClick={() => onClick && onClick(flight)}
      title={flight.transponder_id || 'Unknown'}
    />
  );
}

export default function GoogleMapView({ 
  flights, 
  restrictedArea, 
  allRestrictedAreas, 
  onFlightClick, 
  showAreaEditor, 
  onAreaCreated, 
  onEditorClose, 
  isPlacementMode, 
  placementConfig, 
  onPlaceAircraft 
}) {
  // Salem, Tamil Nadu coordinates as default
  const [center, setCenter] = useState({ lat: 11.6643, lng: 78.1460 });
  const [zoom, setZoom] = useState(10);
  const [polygonCoords, setPolygonCoords] = useState([]);
  const [allPolygons, setAllPolygons] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [drawingPolygon, setDrawingPolygon] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const mapRef = useRef(null);

  // Keep only one latest record per aircraft
  const uniqueFlights = useMemo(() => {
    if (!Array.isArray(flights)) return [];
    const byId = new Map();
    for (const f of flights) {
      const key = f.transponder_id || f.id;
      if (!key) continue;
      const t = f.timestamp || f.updated_at || f.created_at || f.time || 0;
      const prev = byId.get(key);
      if (!prev || t >= (prev.t || 0)) {
        byId.set(key, { f, t });
      }
    }
    return Array.from(byId.values()).map(v => v.f);
  }, [flights]);

  // Parse main restricted area
  useEffect(() => {
    if (restrictedArea && restrictedArea.polygon_json) {
      try {
        const geojson = JSON.parse(restrictedArea.polygon_json);
        if (geojson.type === 'Polygon' && geojson.coordinates) {
          // GeoJSON uses [lng, lat], Google Maps uses {lat, lng}
          const coords = geojson.coordinates[0].map(coord => ({
            lat: coord[1],
            lng: coord[0]
          }));
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
              const coords = geojson.coordinates[0].map(coord => ({
                lat: coord[1],
                lng: coord[0]
              }));
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

  // Handle map click for placement or drawing
  const handleMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    if (isPlacementMode && onPlaceAircraft) {
      onPlaceAircraft(lat, lng);
    } else if (showAreaEditor) {
      setDrawingPolygon(prev => [...prev, { lat, lng }]);
      setIsDrawing(true);
    }
  }, [isPlacementMode, onPlaceAircraft, showAreaEditor]);

  // Handle completing polygon drawing
  const handleCompletePolygon = useCallback(() => {
    if (drawingPolygon.length >= 3 && onAreaCreated) {
      // Convert to GeoJSON format
      const geoJsonCoords = drawingPolygon.map(p => [p.lng, p.lat]);
      geoJsonCoords.push(geoJsonCoords[0]); // Close the polygon
      
      const polygonJson = JSON.stringify({
        type: 'Polygon',
        coordinates: [geoJsonCoords]
      });
      
      onAreaCreated({ polygon_json: polygonJson });
      setDrawingPolygon([]);
      setIsDrawing(false);
    }
  }, [drawingPolygon, onAreaCreated]);

  // Handle canceling polygon drawing
  const handleCancelDrawing = useCallback(() => {
    setDrawingPolygon([]);
    setIsDrawing(false);
    if (onEditorClose) onEditorClose();
  }, [onEditorClose]);

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    setIsLoaded(true);
  }, []);

  // Fit bounds to polygon
  useEffect(() => {
    if (mapRef.current && polygonCoords.length > 0 && isLoaded) {
      const bounds = new window.google.maps.LatLngBounds();
      polygonCoords.forEach(coord => bounds.extend(coord));
      mapRef.current.fitBounds(bounds, { padding: 50 });
    }
  }, [polygonCoords, isLoaded]);

  return (
    <div className="h-full w-full relative">
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={zoom}
          options={mapOptions}
          onClick={handleMapClick}
          onLoad={onLoad}
        >
          {/* Main restricted area polygon */}
          {polygonCoords.length > 0 && (
            <Polygon
              paths={polygonCoords}
              options={{
                fillColor: '#ef4444',
                fillOpacity: 0.2,
                strokeColor: '#ef4444',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                strokeDasharray: '8,4'
              }}
            />
          )}

          {/* All user-drawn restricted areas */}
          {allPolygons.map((polygon, index) => (
            <Polygon
              key={polygon.id}
              paths={polygon.coords}
              options={{
                fillColor: index % 2 === 0 ? '#f59e0b' : '#8b5cf6',
                fillOpacity: 0.2,
                strokeColor: index % 2 === 0 ? '#f59e0b' : '#8b5cf6',
                strokeOpacity: 0.8,
                strokeWeight: 3
              }}
            />
          ))}

          {/* Drawing polygon preview */}
          {drawingPolygon.length > 0 && (
            <>
              <Polygon
                paths={drawingPolygon}
                options={{
                  fillColor: '#22c55e',
                  fillOpacity: 0.3,
                  strokeColor: '#22c55e',
                  strokeOpacity: 1,
                  strokeWeight: 2
                }}
              />
              {/* Markers for polygon vertices */}
              {drawingPolygon.map((point, index) => (
                <Marker
                  key={index}
                  position={point}
                  icon={{
                    path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                    fillColor: '#22c55e',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 6
                  }}
                />
              ))}
            </>
          )}

          {/* Flight markers with animation */}
          {uniqueFlights.map((flight) => {
            const key = flight.transponder_id || flight.id;
            return (
              <AnimatedAircraftMarker
                key={key}
                flight={flight}
                onClick={(f) => {
                  setSelectedFlight(f);
                  if (onFlightClick) onFlightClick(f);
                }}
              />
            );
          })}

          {/* Selected flight info window */}
          {selectedFlight && (
            <InfoWindow
              position={{ lat: selectedFlight.latitude, lng: selectedFlight.longitude }}
              onCloseClick={() => setSelectedFlight(null)}
            >
              <div className="p-2 min-w-[150px]">
                <div className="font-bold text-gray-900">
                  {selectedFlight.transponder_id || 'Unknown'}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedFlight.classification || 'Unclassified'}
                </div>
                <div className="text-xs mt-1">
                  <div>Alt: {selectedFlight.altitude?.toFixed(0) || 'N/A'} ft</div>
                  <div>Speed: {selectedFlight.groundspeed?.toFixed(0) || 'N/A'} kt</div>
                </div>
                {selectedFlight.in_restricted_area && (
                  <div className="mt-1 text-red-600 font-bold text-xs">
                    ⚠️ IN RESTRICTED ZONE
                  </div>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>

      {/* Drawing controls overlay */}
      {showAreaEditor && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-10">
          <div className="text-sm mb-2">
            {drawingPolygon.length === 0 
              ? 'Click on map to start drawing restricted area'
              : `${drawingPolygon.length} points - Click to add more`}
          </div>
          <div className="flex gap-2">
            {drawingPolygon.length >= 3 && (
              <button
                onClick={handleCompletePolygon}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
              >
                Complete
              </button>
            )}
            <button
              onClick={handleCancelDrawing}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Placement mode indicator */}
      {isPlacementMode && (
        <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse z-10">
          📍 PLACEMENT MODE - Click to place aircraft
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-gray-900 bg-opacity-90 text-white p-3 rounded-lg text-xs z-10">
        <div className="font-bold mb-2">Aircraft Types</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: markerColors.civilian_prop }}></div>
            <span>Civilian</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: markerColors.airliner }}></div>
            <span>Airliner</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: markerColors.high_performance }}></div>
            <span>High Performance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: markerColors.fighter }}></div>
            <span>Fighter / Alert</span>
          </div>
        </div>
      </div>
    </div>
  );
}
