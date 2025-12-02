import React, { useEffect, useRef, useState, useMemo } from 'react';

/**
 * RadarSweep - Rotating radar sweep animation with blips and fade trails
 * Displays aircraft as radar blips with decay effect
 * Dynamically centers on the marked restricted area
 * Enhanced detection for planes in restricted zones
 */
export default function RadarSweep({ flights, restrictedArea, width = 400, height = 400 }) {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const blipsRef = useRef(new Map()); // track blip fade timestamps
  const trailsRef = useRef(new Map()); // track position history for trails

  // Calculate center and bounds from restricted area polygon
  const radarConfig = useMemo(() => {
    if (restrictedArea && restrictedArea.polygon_json) {
      try {
        const polygon = typeof restrictedArea.polygon_json === 'string' 
          ? JSON.parse(restrictedArea.polygon_json) 
          : restrictedArea.polygon_json;
        
        if (polygon.coordinates && polygon.coordinates[0]) {
          const coords = polygon.coordinates[0];
          // Calculate centroid and bounds of polygon
          let sumLat = 0, sumLon = 0;
          let minLat = Infinity, maxLat = -Infinity;
          let minLon = Infinity, maxLon = -Infinity;
          
          coords.forEach(coord => {
            const lon = coord[0]; // GeoJSON uses [lon, lat]
            const lat = coord[1];
            sumLon += lon;
            sumLat += lat;
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLon = Math.min(minLon, lon);
            maxLon = Math.max(maxLon, lon);
          });
          
          const centerLat = sumLat / coords.length;
          const centerLon = sumLon / coords.length;
          
          // Calculate the range to show (with padding)
          const latRange = (maxLat - minLat) * 2.5;
          const lonRange = (maxLon - minLon) * 2.5;
          const range = Math.max(latRange, lonRange, 0.1); // minimum range
          
          return {
            lat: centerLat,
            lon: centerLon,
            range: range,
            polygonCoords: coords
          };
        }
      } catch (e) {
        console.error('Error parsing restricted area polygon:', e);
      }
    }
    // Default to Salem if no restricted area
    return { lat: 11.65, lon: 78.15, range: 0.5, polygonCoords: null };
  }, [restrictedArea]);

  // Rotation animation - smoother and faster
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 3) % 360); // 3 degrees per frame for smoother sweep
    }, 40); // 25 FPS
    return () => clearInterval(interval);
  }, []);

  // Draw radar
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    // Clear canvas with dark background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);

    // Draw radar grid circles
    ctx.strokeStyle = '#1a4d2e';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius / 5) * i, 0, Math.PI * 2);
      ctx.stroke();
      
      // Add distance labels
      ctx.fillStyle = '#1a4d2e';
      ctx.font = '9px monospace';
      const distance = ((radarConfig.range / 5) * i * 111).toFixed(0); // km approximation
      ctx.fillText(`${distance}km`, centerX + 5, centerY - (radius / 5) * i + 12);
    }

    // Draw crosshairs with angles
    ctx.strokeStyle = '#1a4d2e';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();
    
    // Draw diagonal lines
    ctx.strokeStyle = 'rgba(26, 77, 46, 0.5)';
    ctx.beginPath();
    const diag = radius * 0.707;
    ctx.moveTo(centerX - diag, centerY - diag);
    ctx.lineTo(centerX + diag, centerY + diag);
    ctx.moveTo(centerX + diag, centerY - diag);
    ctx.lineTo(centerX - diag, centerY + diag);
    ctx.stroke();

    // Draw cardinal directions
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', centerX, 15);
    ctx.fillText('S', centerX, height - 5);
    ctx.fillText('E', width - 10, centerY + 4);
    ctx.fillText('W', 10, centerY + 4);

    // Helper function to convert lat/lon to radar coordinates
    const latLonToRadar = (lat, lon) => {
      const deltaLat = lat - radarConfig.lat;
      const deltaLon = lon - radarConfig.lon;
      
      // Normalize to radar range
      const normalizedLat = deltaLat / (radarConfig.range / 2);
      const normalizedLon = deltaLon / (radarConfig.range / 2);
      
      // Convert to screen coordinates (north is up)
      const x = centerX + normalizedLon * radius;
      const y = centerY - normalizedLat * radius;
      
      return { x, y };
    };

    // Draw restricted zone polygon on radar
    if (radarConfig.polygonCoords && radarConfig.polygonCoords.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.lineWidth = 2;
      
      radarConfig.polygonCoords.forEach((coord, index) => {
        const { x, y } = latLonToRadar(coord[1], coord[0]); // GeoJSON is [lon, lat]
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Draw pulsing border for restricted zone
      const pulseIntensity = 0.3 + 0.2 * Math.sin(Date.now() / 300);
      ctx.strokeStyle = `rgba(239, 68, 68, ${pulseIntensity})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // Draw sweep line with gradient trail
    const sweepAngle = (rotation * Math.PI) / 180;
    
    // Sweep trail (fading arc behind the sweep)
    for (let i = 0; i < 30; i++) {
      const trailAngle = sweepAngle - (i * Math.PI / 180) * 2;
      const alpha = 0.15 * (1 - i / 30);
      ctx.strokeStyle = `rgba(34, 197, 94, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.sin(trailAngle) * radius,
        centerY - Math.cos(trailAngle) * radius
      );
      ctx.stroke();
    }
    
    // Main sweep line
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.sin(sweepAngle) * radius,
      centerY - Math.cos(sweepAngle) * radius
    );
    ctx.stroke();

    // Draw blips (aircraft) with improved detection
    const now = Date.now();
    let detectedCount = 0;
    let restrictedCount = 0;
    
    if (Array.isArray(flights)) {
      flights.forEach(flight => {
        const key = flight.transponder_id || flight.id || `unknown_${Math.random()}`;
        if (!key) return;

        // Convert lat/lon to radar coordinates
        const { x, y } = latLonToRadar(flight.latitude, flight.longitude);

        // Check if within radar display bounds
        const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        if (distFromCenter > radius * 1.1) return; // Skip if too far

        // Track position history for trails
        const trails = trailsRef.current.get(key) || [];
        trails.push({ x, y, time: now });
        // Keep only last 10 positions
        while (trails.length > 10) trails.shift();
        trailsRef.current.set(key, trails);

        // Update blip timestamp when sweep passes over it
        const blipAngle = ((Math.atan2(x - centerX, centerY - y) * 180 / Math.PI) + 360) % 360;
        const angleDiff = Math.abs(blipAngle - rotation);
        if (angleDiff < 20 || angleDiff > 340) {
          blipsRef.current.set(key, now);
        }

        // Fade blip based on time since last sweep
        const lastSeen = blipsRef.current.get(key) || now;
        const age = now - lastSeen;
        const maxAge = 4000; // 4 seconds fade for better visibility
        const opacity = Math.max(0.2, 1 - age / maxAge); // Minimum 20% opacity

        detectedCount++;

        // Determine color based on status
        let color;
        let blipSize = 5;
        let isAlert = false;
        
        if (flight.in_restricted_area) {
          color = '#ef4444'; // Red for restricted zone violation
          blipSize = 7;
          isAlert = true;
          restrictedCount++;
        } else if (flight.is_unknown || !flight.transponder_id) {
          color = '#f59e0b'; // Orange for unknown
          blipSize = 6;
        } else if (flight.classification === 'high_performance' || flight.classification === 'fighter') {
          color = '#f59e0b'; // Orange for high performance
        } else {
          color = '#22c55e'; // Green for normal
        }

        // Draw position trail
        if (trails.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${color === '#ef4444' ? '239, 68, 68' : color === '#f59e0b' ? '245, 158, 11' : '34, 197, 94'}, 0.3)`;
          ctx.lineWidth = 2;
          trails.forEach((pos, idx) => {
            if (idx === 0) ctx.moveTo(pos.x, pos.y);
            else ctx.lineTo(pos.x, pos.y);
          });
          ctx.stroke();
        }

        // Draw blip with glow
        ctx.save();
        
        // Outer glow
        ctx.shadowBlur = isAlert ? 20 : 15;
        ctx.shadowColor = color;
        
        // Blip body
        ctx.fillStyle = color.replace(')', `, ${opacity})`).replace('#', 'rgba(').replace(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, (m, r, g, b) => 
          `${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}`);
        ctx.beginPath();
        ctx.arc(x, y, blipSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner bright core
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
        ctx.beginPath();
        ctx.arc(x, y, blipSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();

        // Draw alert ring for restricted zone violations
        if (isAlert) {
          const pulseSize = blipSize + 5 + Math.sin(now / 150) * 3;
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + Math.sin(now / 150) * 0.3})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
          ctx.stroke();
          
          // Draw warning indicator
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('!', x, y - blipSize - 8);
        }

        // Draw ID label for visible blips
        if (opacity > 0.5 && distFromCenter < radius * 0.9) {
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
          ctx.font = '9px monospace';
          ctx.textAlign = 'left';
          const label = flight.transponder_id || 'UNK';
          ctx.fillText(label.substring(0, 7), x + blipSize + 3, y + 3);
        }
      });
    }

    // Draw center indicator
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw center crosshair
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY);
    ctx.lineTo(centerX + 8, centerY);
    ctx.moveTo(centerX, centerY - 8);
    ctx.lineTo(centerX, centerY + 8);
    ctx.stroke();

    // Update stats in DOM (will be picked up by parent)
    canvas.dataset.detected = detectedCount;
    canvas.dataset.restricted = restrictedCount;

  }, [flights, rotation, restrictedArea, radarConfig, width, height]);

  // Count alerts
  const alertCount = useMemo(() => {
    if (!Array.isArray(flights)) return 0;
    return flights.filter(f => f.in_restricted_area).length;
  }, [flights]);

  return (
    <div className="radar-sweep-container" style={{ position: 'relative', width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: '2px solid #1a4d2e',
          borderRadius: '8px',
          background: '#0a0e1a'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          color: '#22c55e',
          fontFamily: 'monospace',
          fontSize: '10px',
          textShadow: '0 0 5px #22c55e'
        }}
      >
        <div>RADAR ACTIVE</div>
        <div style={{ fontSize: '9px', opacity: 0.7 }}>
          {radarConfig.lat.toFixed(3)}°N, {radarConfig.lon.toFixed(3)}°E
        </div>
      </div>
      
      {/* Contacts counter */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          color: '#22c55e',
          fontFamily: 'monospace',
          fontSize: '11px'
        }}
      >
        <span style={{ color: '#3b82f6' }}>●</span> {Array.isArray(flights) ? flights.length : 0} CONTACTS
      </div>
      
      {/* Alert indicator */}
      {alertCount > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            color: '#ef4444',
            fontFamily: 'monospace',
            fontSize: '11px',
            fontWeight: 'bold',
            animation: 'pulse 1s infinite',
            textShadow: '0 0 10px #ef4444'
          }}
        >
          ⚠ {alertCount} IN ZONE
        </div>
      )}
      
      {/* Range indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          color: '#1a4d2e',
          fontFamily: 'monospace',
          fontSize: '9px'
        }}
      >
        RANGE: {(radarConfig.range * 111).toFixed(0)}km
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
