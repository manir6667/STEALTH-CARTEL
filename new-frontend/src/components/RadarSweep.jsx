import React, { useEffect, useRef, useState } from 'react';

/**
 * RadarSweep - Rotating radar sweep animation with blips and fade trails
 * Displays aircraft as radar blips with decay effect
 */
export default function RadarSweep({ flights, restrictedArea, width = 400, height = 400 }) {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const blipsRef = useRef(new Map()); // track blip fade timestamps

  // Rotation animation
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 2) % 360); // 2 degrees per frame
    }, 50); // 20 FPS
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

    // Clear canvas
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);

    // Draw radar circles
    ctx.strokeStyle = '#1a4d2e';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius / 4) * i, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw crosshairs
    ctx.strokeStyle = '#1a4d2e';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();

    // Draw restricted zone as red ring (approximate)
    if (restrictedArea) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw sweep
    const sweepAngle = (rotation * Math.PI) / 180;
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(sweepAngle);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -Math.PI / 6, Math.PI / 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw blips (aircraft)
    const now = Date.now();
    if (Array.isArray(flights)) {
      flights.forEach(flight => {
        const key = flight.transponder_id || flight.id;
        if (!key) return;

        // Map lat/lon to radar coordinates (simplified projection)
        // Center around Salem (11.65, 78.15)
        const deltaLat = (flight.latitude - 11.65) * 100;
        const deltaLon = (flight.longitude - 78.15) * 100;
        const distance = Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon);
        const angle = Math.atan2(deltaLon, deltaLat);

        const x = centerX + Math.sin(angle) * distance * 2;
        const y = centerY - Math.cos(angle) * distance * 2;

        // Update blip timestamp when sweep passes over it
        const blipAngle = ((Math.atan2(x - centerX, centerY - y) * 180 / Math.PI) + 360) % 360;
        const angleDiff = Math.abs(blipAngle - rotation);
        if (angleDiff < 15 || angleDiff > 345) {
          blipsRef.current.set(key, now);
        }

        // Fade blip based on time since last sweep
        const lastSeen = blipsRef.current.get(key) || 0;
        const age = now - lastSeen;
        const maxAge = 3000; // 3 seconds fade
        const opacity = Math.max(0, 1 - age / maxAge);

        if (opacity > 0 && x >= 0 && x <= width && y >= 0 && y <= height) {
          const color = flight.in_restricted_area ? '#ef4444' : 
                        flight.classification === 'fighter' ? '#f59e0b' :
                        flight.classification === 'airliner' ? '#3b82f6' : '#22c55e';
          
          // Draw blip with glow
          ctx.fillStyle = color.replace(')', `, ${opacity})`).replace('rgb', 'rgba');
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();

          // Glow effect
          ctx.shadowBlur = 10;
          ctx.shadowColor = color;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Draw trail
          if (opacity > 0.5) {
            ctx.fillStyle = color.replace(')', `, ${opacity * 0.3})`).replace('rgb', 'rgba');
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }

    // Draw center indicator
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();

  }, [flights, rotation, restrictedArea, width, height]);

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
        className="radar-label"
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          color: '#22c55e',
          fontFamily: 'monospace',
          fontSize: '12px',
          textShadow: '0 0 5px #22c55e'
        }}
      >
        RADAR - SALEM ADS
      </div>
      <div
        className="radar-info"
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          color: '#22c55e',
          fontFamily: 'monospace',
          fontSize: '10px'
        }}
      >
        {Array.isArray(flights) ? flights.length : 0} CONTACTS
      </div>
    </div>
  );
}
