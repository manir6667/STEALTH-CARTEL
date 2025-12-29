import React from 'react';

/**
 * Skeleton Components - Loading placeholders for better UX
 * These replace spinners with animated placeholder shapes that match content layout
 */

// Base skeleton with shimmer effect
export function Skeleton({ className = '', animate = true }) {
  return (
    <div 
      className={`bg-gray-700/50 rounded ${animate ? 'animate-pulse' : ''} ${className}`}
    />
  );
}

// Text line skeleton
export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`} 
        />
      ))}
    </div>
  );
}

// Avatar/Icon skeleton
export function SkeletonAvatar({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <Skeleton className={`${sizes[size]} rounded-full ${className}`} />
  );
}

// Card skeleton with title and content
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <SkeletonAvatar size="md" />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

// Flight card skeleton - matches FlightDetail layout
export function SkeletonFlightCard({ className = '' }) {
  return (
    <div className={`bg-gray-800/50 rounded-lg p-3 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

// Alert card skeleton
export function SkeletonAlertCard({ className = '' }) {
  return (
    <div className={`bg-gray-800/50 rounded-lg p-3 border-l-4 border-gray-600 ${className}`}>
      <div className="flex items-start gap-3">
        <Skeleton className="w-16 h-5 rounded" />
        <div className="flex-1">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}

// Analytics stat skeleton
export function SkeletonStat({ className = '' }) {
  return (
    <div className={`bg-gray-800/30 rounded-lg p-3 ${className}`}>
      <Skeleton className="h-8 w-16 mx-auto mb-2" />
      <Skeleton className="h-3 w-12 mx-auto" />
    </div>
  );
}

// Table row skeleton
export function SkeletonTableRow({ columns = 4, className = '' }) {
  return (
    <div className={`flex items-center gap-4 p-3 border-b border-gray-700/50 ${className}`}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 flex-1 ${i === 0 ? 'max-w-[100px]' : ''}`} 
        />
      ))}
    </div>
  );
}

// Flight list skeleton
export function SkeletonFlightList({ count = 5, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonFlightCard key={i} />
      ))}
    </div>
  );
}

// Alert list skeleton
export function SkeletonAlertList({ count = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonAlertCard key={i} />
      ))}
    </div>
  );
}

// Control panel skeleton
export function SkeletonControlPanel({ className = '' }) {
  return (
    <div className={`bg-gray-900 rounded-lg p-4 ${className}`}>
      <Skeleton className="h-6 w-32 mb-4" />
      
      {/* Buttons */}
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-10 flex-1 rounded" />
        <Skeleton className="h-10 flex-1 rounded" />
        <Skeleton className="h-10 flex-1 rounded" />
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>
    </div>
  );
}

// Radar skeleton
export function SkeletonRadar({ size = 400, className = '' }) {
  return (
    <div 
      className={`bg-gray-900 rounded-full flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="relative w-full h-full">
        {/* Concentric circles */}
        <div className="absolute inset-[10%] rounded-full border border-gray-700/30" />
        <div className="absolute inset-[25%] rounded-full border border-gray-700/30" />
        <div className="absolute inset-[40%] rounded-full border border-gray-700/30" />
        <div className="absolute inset-[55%] rounded-full border border-gray-700/30" />
        
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-gray-700/50 animate-pulse" />
        </div>
        
        {/* Sweep line animation */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ animation: 'spin 4s linear infinite' }}
        >
          <div className="w-1/2 h-0.5 bg-gradient-to-r from-transparent via-gray-600/50 to-gray-500/80 origin-left" />
        </div>
      </div>
    </div>
  );
}

// Map skeleton
export function SkeletonMap({ height = 500, className = '' }) {
  return (
    <div 
      className={`bg-gray-800 rounded-lg overflow-hidden relative ${className}`}
      style={{ height }}
    >
      {/* Grid pattern to simulate map tiles */}
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-px bg-gray-700/20">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="bg-gray-800 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
        ))}
      </div>
      
      {/* Center marker */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-4xl opacity-20">🗺️</div>
      </div>
      
      {/* Loading indicator */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-gray-900/80 px-3 py-2 rounded">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-400">Loading map...</span>
      </div>
    </div>
  );
}

// Dashboard skeleton - full page loading state
export function SkeletonDashboard() {
  return (
    <div className="min-h-screen bg-gray-950 p-4 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <Skeleton className="w-10 h-10 rounded-lg" />
            <Skeleton className="w-10 h-10 rounded-lg" />
          </div>
        </div>
      </div>

      {/* View mode buttons */}
      <div className="flex gap-2 justify-center mb-4">
        <Skeleton className="h-10 w-28 rounded" />
        <Skeleton className="h-10 w-28 rounded" />
        <Skeleton className="h-10 w-28 rounded" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left sidebar */}
        <div className="col-span-2">
          <SkeletonCard className="mb-4" />
          <SkeletonFlightList count={3} />
        </div>

        {/* Center - Radar and Map */}
        <div className="col-span-7">
          <div className="flex justify-center mb-4">
            <SkeletonRadar size={400} />
          </div>
          <SkeletonMap height={400} />
        </div>

        {/* Right sidebar */}
        <div className="col-span-3 space-y-4">
          <SkeletonControlPanel />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
