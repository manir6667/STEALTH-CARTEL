import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * VirtualList - A virtualized list component for rendering large datasets efficiently
 * Only renders items that are visible in the viewport plus a buffer
 */

export default function VirtualList({
  items = [],
  itemHeight = 60,
  containerHeight = 400,
  renderItem,
  overscan = 3,
  className = '',
  emptyMessage = 'No items to display',
  onEndReached,
  endReachedThreshold = 200,
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  // Handle scroll
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setScrollTop(scrollTop);

    // Check if we've reached the end
    if (onEndReached && scrollHeight - scrollTop - clientHeight < endReachedThreshold) {
      onEndReached();
    }
  }, [onEndReached, endReachedThreshold]);

  // Scroll to item
  const scrollToItem = useCallback((index, behavior = 'smooth') => {
    if (containerRef.current) {
      const targetScrollTop = index * itemHeight;
      containerRef.current.scrollTo({
        top: targetScrollTop,
        behavior
      });
    }
  }, [itemHeight]);

  // Scroll to top
  const scrollToTop = useCallback((behavior = 'smooth') => {
    scrollToItem(0, behavior);
  }, [scrollToItem]);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    scrollToItem(items.length - 1, behavior);
  }, [scrollToItem, items.length]);

  if (items.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center text-gray-500 ${className}`}
        style={{ height: containerHeight }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
          {visibleItems.map((item, index) => (
            <div
              key={item.id || startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * VirtualFlightList - Optimized flight list using virtualization
 */
export function VirtualFlightList({
  flights = [],
  onFlightClick,
  selectedFlightId,
  containerHeight = 400,
  className = ''
}) {
  const renderFlight = useCallback((flight, index) => {
    const isSelected = flight.id === selectedFlightId;
    const threatColor = {
      'Critical': 'border-red-500 bg-red-900/20',
      'High': 'border-orange-500 bg-orange-900/20',
      'Medium': 'border-yellow-500 bg-yellow-900/20',
      'Low': 'border-green-500 bg-green-900/20'
    }[flight.threat_level] || 'border-gray-600 bg-gray-800/50';

    return (
      <div
        className={`mx-2 p-2 rounded-lg border-l-4 cursor-pointer transition-all hover:scale-[1.02] ${threatColor} ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={() => onFlightClick?.(flight)}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-white">
            {flight.transponder_id || 'UNKNOWN'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            flight.classification === 'commercial' ? 'bg-blue-600' :
            flight.classification === 'military' ? 'bg-red-600' :
            flight.classification === 'private' ? 'bg-green-600' :
            flight.classification === 'drone' ? 'bg-purple-600' :
            'bg-gray-600'
          }`}>
            {flight.classification || 'unknown'}
          </span>
        </div>
        <div className="text-xs text-gray-400 mt-1 flex justify-between">
          <span>Alt: {flight.altitude?.toLocaleString() || '?'} ft</span>
          <span>Spd: {flight.groundspeed || '?'} kts</span>
        </div>
      </div>
    );
  }, [selectedFlightId, onFlightClick]);

  return (
    <VirtualList
      items={flights}
      itemHeight={70}
      containerHeight={containerHeight}
      renderItem={renderFlight}
      className={className}
      emptyMessage="No flights detected"
      overscan={5}
    />
  );
}

/**
 * VirtualAlertList - Optimized alert list using virtualization
 */
export function VirtualAlertList({
  alerts = [],
  onAcknowledge,
  containerHeight = 400,
  className = ''
}) {
  const renderAlert = useCallback((alert, index) => {
    const severityColors = {
      'CRITICAL': 'border-red-500 bg-red-900/30',
      'HIGH': 'border-orange-500 bg-orange-900/30',
      'MEDIUM': 'border-yellow-500 bg-yellow-900/30',
      'LOW': 'border-blue-500 bg-blue-900/30'
    };

    const severityBadgeColors = {
      'CRITICAL': 'bg-red-600',
      'HIGH': 'bg-orange-600',
      'MEDIUM': 'bg-yellow-600',
      'LOW': 'bg-blue-600'
    };

    return (
      <div
        className={`mx-2 p-2 rounded-lg border-l-4 ${
          alert.acknowledged ? 'opacity-50' : ''
        } ${severityColors[alert.severity] || 'border-gray-600 bg-gray-800/50'}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs px-2 py-0.5 rounded ${severityBadgeColors[alert.severity] || 'bg-gray-600'}`}>
            {alert.severity}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(alert.timestamp || alert.created_at).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-sm text-white truncate">{alert.message}</p>
        {!alert.acknowledged && onAcknowledge && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAcknowledge(alert.id);
            }}
            className="mt-1 w-full text-xs bg-green-600 hover:bg-green-700 text-white py-1 rounded transition-colors"
          >
            Acknowledge
          </button>
        )}
      </div>
    );
  }, [onAcknowledge]);

  return (
    <VirtualList
      items={alerts}
      itemHeight={85}
      containerHeight={containerHeight}
      renderItem={renderAlert}
      className={className}
      emptyMessage="No alerts"
      overscan={3}
    />
  );
}

/**
 * VirtualIncidentList - Optimized incident history using virtualization
 */
export function VirtualIncidentList({
  incidents = [],
  onIncidentClick,
  containerHeight = 400,
  className = ''
}) {
  const renderIncident = useCallback((incident, index) => {
    const severityColors = {
      'CRITICAL': 'bg-red-500',
      'HIGH': 'bg-orange-500',
      'MEDIUM': 'bg-yellow-500',
      'LOW': 'bg-green-500'
    };

    return (
      <div
        className="mx-2 p-2 border-b border-gray-700/50 hover:bg-gray-800/50 cursor-pointer transition-colors"
        onClick={() => onIncidentClick?.(incident)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${severityColors[incident.severity] || 'bg-gray-500'}`} />
          <span className="text-xs text-gray-500 flex-shrink-0">
            {new Date(incident.detected_at || incident.created_at).toLocaleString()}
          </span>
          <span className="text-sm text-white truncate flex-1">
            {incident.alert_type || incident.message || 'Intrusion'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            incident.status === 'resolved' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}>
            {incident.status || 'active'}
          </span>
        </div>
      </div>
    );
  }, [onIncidentClick]);

  return (
    <VirtualList
      items={incidents}
      itemHeight={50}
      containerHeight={containerHeight}
      renderItem={renderIncident}
      className={className}
      emptyMessage="No incidents recorded"
      overscan={5}
    />
  );
}

/**
 * useVirtualScroll - Hook for custom virtual scroll implementations
 */
export function useVirtualScroll({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 3
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const totalHeight = itemCount * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );
  const visibleCount = endIndex - startIndex + 1;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const scrollToIndex = useCallback((index, behavior = 'smooth') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * itemHeight,
        behavior
      });
    }
  }, [itemHeight]);

  return {
    containerRef,
    startIndex,
    endIndex,
    visibleCount,
    totalHeight,
    offsetY,
    handleScroll,
    scrollToIndex
  };
}
