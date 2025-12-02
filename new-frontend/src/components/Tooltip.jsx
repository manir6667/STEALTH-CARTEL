import { useState, useRef, useEffect } from 'react';

/**
 * Tooltip component for displaying flight information on hover
 */

export function Tooltip({ children, content, position = 'top', delay = 200 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getPositionStyles = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      {isVisible && content && (
        <div
          className={`absolute z-50 ${getPositionStyles()} animate-fade-in`}
        >
          <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg border border-gray-700 whitespace-nowrap">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Flight Info Tooltip - Displays detailed flight information
 */
export function FlightInfoTooltip({ flight, children }) {
  if (!flight) return children;

  const content = (
    <div className="min-w-[200px] space-y-1">
      <div className="flex items-center gap-2 border-b border-gray-700 pb-1 mb-1">
        <span className="text-lg">
          {flight.aircraft_type?.includes('helicopter') ? '🚁' : 
           flight.aircraft_type?.includes('drone') ? '🤖' : '✈️'}
        </span>
        <span className="font-bold text-blue-400">
          {flight.transponder_id || 'Unknown'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="text-gray-400">Type:</div>
        <div className="text-white">{flight.aircraft_type || 'Unknown'}</div>
        
        <div className="text-gray-400">Altitude:</div>
        <div className="text-white">{flight.altitude?.toLocaleString() || '?'} ft</div>
        
        <div className="text-gray-400">Speed:</div>
        <div className="text-white">{flight.groundspeed || '?'} kts</div>
        
        <div className="text-gray-400">Heading:</div>
        <div className="text-white">{flight.track || '?'}°</div>
        
        <div className="text-gray-400">Position:</div>
        <div className="text-white">
          {flight.latitude?.toFixed(4)}, {flight.longitude?.toFixed(4)}
        </div>
      </div>
      
      {flight.in_restricted_area && (
        <div className="mt-2 pt-1 border-t border-red-900 flex items-center gap-2 text-red-400 text-xs">
          <span>⚠️</span>
          <span>In Restricted Zone</span>
        </div>
      )}
      
      {flight.threat_level && flight.threat_level !== 'Low' && (
        <div className={`mt-1 flex items-center gap-2 text-xs ${
          flight.threat_level === 'Critical' ? 'text-red-400' :
          flight.threat_level === 'High' ? 'text-orange-400' :
          'text-yellow-400'
        }`}>
          <span>🎯</span>
          <span>Threat: {flight.threat_level}</span>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={content} position="right" delay={300}>
      {children}
    </Tooltip>
  );
}

/**
 * Simple info tooltip for buttons and controls
 */
export function InfoTooltip({ text, children }) {
  return (
    <Tooltip content={text} position="top" delay={500}>
      {children}
    </Tooltip>
  );
}

export default Tooltip;
