import { useEffect, useRef } from 'react';

/**
 * Notification Manager - Handles browser notifications and toast alerts
 */

// Request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Show browser notification
export function showBrowserNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  const notification = new Notification(title, {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: options.tag || 'default',
    requireInteraction: options.requireInteraction || false,
    ...options,
  });

  // Auto-close after 5 seconds unless requireInteraction is true
  if (!options.requireInteraction) {
    setTimeout(() => notification.close(), 5000);
  }

  return notification;
}

// Show intrusion notification
export function showIntrusionNotification(flight, zone) {
  return showBrowserNotification('⚠️ Zone Intrusion Detected!', {
    body: `Aircraft ${flight?.transponder_id || 'Unknown'} has entered ${zone?.name || 'a restricted zone'}`,
    tag: `intrusion-${flight?.transponder_id}`,
    requireInteraction: true,
  });
}

/**
 * Toast notification component
 */
export function Toast({ message, type = 'info', onClose, duration = 5000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const typeStyles = {
    info: 'bg-blue-600 border-blue-400',
    success: 'bg-green-600 border-green-400',
    warning: 'bg-yellow-600 border-yellow-400',
    error: 'bg-red-600 border-red-400',
  };

  const icons = {
    info: 'ℹ️',
    success: '✓',
    warning: '⚠️',
    error: '✕',
  };

  return (
    <div 
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${typeStyles[type]} 
        text-white shadow-lg animate-slide-in`}
    >
      <span className="text-lg">{icons[type]}</span>
      <p className="flex-1 text-sm">{message}</p>
      <button 
        onClick={onClose}
        className="opacity-70 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Toast container for multiple notifications
 */
export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
          duration={toast.duration}
        />
      ))}
    </div>
  );
}

/**
 * Hook for managing notifications
 */
export function useNotifications(enabled = true) {
  const previousAlertsRef = useRef(new Set());
  const hasPermissionRef = useRef(false);

  // Request permission on mount
  useEffect(() => {
    if (enabled) {
      requestNotificationPermission().then(granted => {
        hasPermissionRef.current = granted;
      });
    }
  }, [enabled]);

  const notifyNewAlert = (alert, flight) => {
    if (!enabled || !hasPermissionRef.current) return;

    const alertKey = `${alert.id || alert.transponder_id}-${alert.detected_at}`;
    
    if (!previousAlertsRef.current.has(alertKey)) {
      previousAlertsRef.current.add(alertKey);
      
      // Limit stored keys to prevent memory leak
      if (previousAlertsRef.current.size > 100) {
        const iterator = previousAlertsRef.current.values();
        previousAlertsRef.current.delete(iterator.next().value);
      }

      showBrowserNotification(
        `${getSeverityEmoji(alert.severity)} ${alert.alert_type || 'Alert'}`,
        {
          body: `Aircraft ${alert.transponder_id || 'Unknown'}: ${alert.message || 'Zone intrusion detected'}`,
          tag: alertKey,
        }
      );
    }
  };

  return { notifyNewAlert };
}

function getSeverityEmoji(severity) {
  switch (severity) {
    case 'CRITICAL': return '🚨';
    case 'HIGH': return '⚠️';
    case 'MEDIUM': return '🔔';
    case 'LOW': return '📢';
    default: return 'ℹ️';
  }
}

export default {
  requestNotificationPermission,
  showBrowserNotification,
  showIntrusionNotification,
  Toast,
  ToastContainer,
  useNotifications,
};
