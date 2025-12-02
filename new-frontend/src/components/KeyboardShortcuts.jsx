import { useEffect, useCallback } from 'react';

/**
 * Keyboard shortcuts hook for the application
 * 
 * Shortcuts:
 * - Space: Pause/Resume simulation
 * - R: Reset simulation
 * - A: Toggle add aircraft mode
 * - T: Toggle theme
 * - M: Toggle map/radar view
 * - Escape: Close modals / Cancel placement mode
 * - F: Focus search
 * - 1-4: Quick filter by severity
 */

export function useKeyboardShortcuts({
  onTogglePause,
  onReset,
  onToggleAddMode,
  onToggleTheme,
  onToggleView,
  onEscape,
  onFocusSearch,
  onFilterSeverity,
  enabled = true
}) {
  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      event.target.tagName === 'INPUT' ||
      event.target.tagName === 'TEXTAREA' ||
      event.target.isContentEditable
    ) {
      // Still allow Escape in inputs
      if (event.key === 'Escape' && onEscape) {
        onEscape();
        event.target.blur();
      }
      return;
    }

    // Handle keyboard shortcuts
    switch (event.key.toLowerCase()) {
      case ' ': // Space - Pause/Resume
        event.preventDefault();
        onTogglePause?.();
        break;
        
      case 'r': // R - Reset
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          onReset?.();
        }
        break;
        
      case 'a': // A - Add aircraft
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          onToggleAddMode?.();
        }
        break;
        
      case 't': // T - Toggle theme
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          onToggleTheme?.();
        }
        break;
        
      case 'm': // M - Toggle map/radar
        event.preventDefault();
        onToggleView?.();
        break;
        
      case 'escape': // Escape - Close/Cancel
        event.preventDefault();
        onEscape?.();
        break;
        
      case 'f': // F - Focus search
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          onFocusSearch?.();
        }
        break;
        
      case '1': // 1 - Filter Critical
        event.preventDefault();
        onFilterSeverity?.('CRITICAL');
        break;
        
      case '2': // 2 - Filter High
        event.preventDefault();
        onFilterSeverity?.('HIGH');
        break;
        
      case '3': // 3 - Filter Medium
        event.preventDefault();
        onFilterSeverity?.('MEDIUM');
        break;
        
      case '4': // 4 - Filter Low
        event.preventDefault();
        onFilterSeverity?.('LOW');
        break;
        
      case '0': // 0 - Clear filter
        event.preventDefault();
        onFilterSeverity?.(null);
        break;
        
      default:
        break;
    }
  }, [onTogglePause, onReset, onToggleAddMode, onToggleTheme, onToggleView, onEscape, onFocusSearch, onFilterSeverity]);

  useEffect(() => {
    if (!enabled) return;
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Keyboard shortcuts help panel component
 */
export function KeyboardShortcutsHelp({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', action: 'Pause/Resume simulation' },
    { key: 'R', action: 'Reset simulation' },
    { key: 'A', action: 'Toggle add aircraft mode' },
    { key: 'T', action: 'Cycle through themes' },
    { key: 'M', action: 'Toggle map/radar view' },
    { key: 'F', action: 'Focus search field' },
    { key: 'Esc', action: 'Close modal / Cancel' },
    { key: '1', action: 'Filter: Critical alerts' },
    { key: '2', action: 'Filter: High alerts' },
    { key: '3', action: 'Filter: Medium alerts' },
    { key: '4', action: 'Filter: Low alerts' },
    { key: '0', action: 'Clear alert filter' },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            ⌨️ Keyboard Shortcuts
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-2">
          {shortcuts.map(({ key, action }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-gray-300">{action}</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded text-sm font-mono text-green-400 min-w-[60px] text-center">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        
        <p className="text-gray-500 text-sm mt-4 text-center">
          Press <kbd className="px-1 bg-gray-700 rounded">?</kbd> to toggle this help
        </p>
      </div>
    </div>
  );
}

export default useKeyboardShortcuts;
