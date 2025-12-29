import { useEffect, useState, useCallback } from 'react';

/**
 * Service Worker Registration and Management
 */

// Register service worker
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('Service Worker registered:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available
          console.log('New version available!');
          dispatchEvent(new CustomEvent('sw-update-available'));
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Unregister service worker
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.unregister();
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
}

// Skip waiting and activate new service worker
export function skipWaiting() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
}

// Clear all caches
export function clearCache() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
  }
}

// Get cache status
export async function getCacheStatus() {
  return new Promise((resolve) => {
    if (!navigator.serviceWorker.controller) {
      resolve({});
      return;
    }

    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      if (event.data.type === 'CACHE_STATUS') {
        resolve(event.data.status);
      }
    };

    navigator.serviceWorker.controller.postMessage(
      { type: 'GET_CACHE_STATUS' },
      [channel.port2]
    );

    // Timeout after 3 seconds
    setTimeout(() => resolve({}), 3000);
  });
}

/**
 * useServiceWorker - Hook for managing service worker
 */
export function useServiceWorker() {
  const [registration, setRegistration] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    // Register service worker
    registerServiceWorker().then(setRegistration);

    // Listen for updates
    const handleUpdate = () => setUpdateAvailable(true);
    window.addEventListener('sw-update-available', handleUpdate);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const update = useCallback(() => {
    skipWaiting();
    window.location.reload();
  }, []);

  return {
    registration,
    updateAvailable,
    isOnline,
    update,
    clearCache
  };
}

/**
 * useOfflineStatus - Hook for offline detection and status
 */
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Dispatch event when coming back online
        dispatchEvent(new CustomEvent('app-online'));
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      dispatchEvent(new CustomEvent('app-offline'));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}

/**
 * OfflineIndicator - Visual component showing offline status
 */
export function OfflineIndicator({ className = '' }) {
  const { isOnline } = useOfflineStatus();

  if (isOnline) return null;

  return (
    <div className={`fixed bottom-4 left-4 z-50 ${className}`}>
      <div className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
        <span className="text-lg">📡</span>
        <span className="font-medium">You're offline</span>
        <span className="text-sm opacity-80">Some features may be limited</span>
      </div>
    </div>
  );
}

/**
 * UpdatePrompt - Component to show when new version is available
 */
export function UpdatePrompt({ className = '' }) {
  const { updateAvailable, update } = useServiceWorker();

  if (!updateAvailable) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <span className="text-lg">🔄</span>
        <div>
          <p className="font-medium">Update Available</p>
          <p className="text-sm opacity-80">A new version is ready</p>
        </div>
        <button
          onClick={update}
          className="ml-2 px-3 py-1 bg-white text-blue-600 rounded font-medium hover:bg-gray-100 transition-colors"
        >
          Update
        </button>
      </div>
    </div>
  );
}

/**
 * CacheStatusDisplay - Debug component showing cache status
 */
export function CacheStatusDisplay({ show = false }) {
  const [status, setStatus] = useState({});

  useEffect(() => {
    if (show) {
      getCacheStatus().then(setStatus);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-gray-800 text-white p-4 rounded-lg shadow-lg text-sm">
      <h4 className="font-bold mb-2">Cache Status</h4>
      {Object.entries(status).map(([name, count]) => (
        <div key={name} className="flex justify-between gap-4">
          <span className="text-gray-400">{name}:</span>
          <span>{count} items</span>
        </div>
      ))}
      <button
        onClick={() => {
          clearCache();
          setTimeout(() => getCacheStatus().then(setStatus), 500);
        }}
        className="mt-2 w-full px-2 py-1 bg-red-600 rounded text-xs hover:bg-red-700"
      >
        Clear Cache
      </button>
    </div>
  );
}
