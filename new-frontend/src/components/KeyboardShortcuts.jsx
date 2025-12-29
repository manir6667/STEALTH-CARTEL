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
 * - S: Open settings
 * - H or ?: Show keyboard shortcuts help
 * - G: Toggle analytics dashboard
 * - I: Toggle incident history
 * - Z: Toggle zone editor
 * - Ctrl+S: Save settings (prevent default)
 * - 1-4: Quick filter by severity
 * - 0: Clear filters
 * - Arrow Up/Down: Navigate flight list
 * - Enter: Select focused item
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
  onOpenSettings,
  onShowHelp,
  onToggleAnalytics,
  onToggleHistory,
  onToggleZoneEditor,
  onNavigateUp,
  onNavigateDown,
  onSelect,
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

      case 's': // S - Settings (without Ctrl) or Save (with Ctrl)
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault(); // Prevent browser save dialog
        } else {
          event.preventDefault();
          onOpenSettings?.();
        }
        break;

      case 'h': // H - Help
      case '?': // ? - Help
        event.preventDefault();
        onShowHelp?.();
        break;

      case 'g': // G - Analytics
        event.preventDefault();
        onToggleAnalytics?.();
        break;

      case 'i': // I - Incident history
        event.preventDefault();
        onToggleHistory?.();
        break;

      case 'z': // Z - Zone editor
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          onToggleZoneEditor?.();
        }
        break;

      case 'arrowup': // Arrow Up - Navigate up
        event.preventDefault();
        onNavigateUp?.();
        break;

      case 'arrowdown': // Arrow Down - Navigate down
        event.preventDefault();
        onNavigateDown?.();
        break;

      case 'enter': // Enter - Select
        event.preventDefault();
        onSelect?.();
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
  }, [onTogglePause, onReset, onToggleAddMode, onToggleTheme, onToggleView, onEscape, onFocusSearch, onFilterSeverity, onOpenSettings, onShowHelp, onToggleAnalytics, onToggleHistory, onToggleZoneEditor, onNavigateUp, onNavigateDown, onSelect]);

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

  const shortcutCategories = [
    {
      title: '🎮 Simulation Control',
      shortcuts: [
        { key: 'Space', action: 'Pause/Resume simulation' },
        { key: 'R', action: 'Reset simulation' },
        { key: 'A', action: 'Toggle add aircraft mode' },
      ]
    },
    {
      title: '👁️ View Controls',
      shortcuts: [
        { key: 'M', action: 'Cycle through views (Split/Radar/Map)' },
        { key: 'T', action: 'Cycle through themes' },
        { key: 'G', action: 'Toggle analytics dashboard' },
        { key: 'I', action: 'Toggle incident history' },
        { key: 'Z', action: 'Toggle zone editor' },
      ]
    },
    {
      title: '🔍 Search & Filter',
      shortcuts: [
        { key: 'F', action: 'Focus search field' },
        { key: '1', action: 'Filter: Critical alerts only' },
        { key: '2', action: 'Filter: High severity only' },
        { key: '3', action: 'Filter: Medium severity only' },
        { key: '4', action: 'Filter: Low severity only' },
        { key: '0', action: 'Clear all filters' },
      ]
    },
    {
      title: '⚙️ General',
      shortcuts: [
        { key: 'S', action: 'Open settings' },
        { key: 'H / ?', action: 'Show this help panel' },
        { key: 'Esc', action: 'Close modal / Cancel action' },
        { key: '↑ / ↓', action: 'Navigate through lists' },
        { key: 'Enter', action: 'Select focused item' },
      ]
    }
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 shadow-2xl border border-gray-700 max-h-[80vh] overflow-y-auto animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-gray-800 pb-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            ⌨️ Keyboard Shortcuts
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-6">
          {shortcutCategories.map((category) => (
            <div key={category.title}>
              <h3 className="text-sm font-semibold text-gray-400 mb-2 border-b border-gray-700 pb-1">
                {category.title}
              </h3>
              <div className="space-y-1">
                {category.shortcuts.map(({ key, action }) => (
                  <div key={key} className="flex items-center justify-between py-1.5 hover:bg-gray-700/30 px-2 rounded transition-colors">
                    <span className="text-gray-300 text-sm">{action}</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs font-mono text-green-400 min-w-[50px] text-center border border-gray-600">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-gray-500 text-sm text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-green-400 font-mono text-xs">H</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-green-400 font-mono text-xs">?</kbd> anytime to toggle this help
          </p>
          <p className="text-gray-600 text-xs text-center mt-2">
            Shortcuts are disabled when typing in input fields
          </p>
        </div>
      </div>
    </div>
  );
}

export default useKeyboardShortcuts;
