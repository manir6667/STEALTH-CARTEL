import { useState, useEffect } from 'react';
import { useTheme, THEMES } from '../context/ThemeContext';

/**
 * Settings Page - Application configuration
 */

function SettingSection({ title, children }) {
  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 mb-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-b-0">
      <div className="flex-1">
        <p className="text-white text-sm">{label}</p>
        {description && <p className="text-gray-500 text-xs">{description}</p>}
      </div>
      <div className="ml-4">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        checked ? 'bg-blue-500' : 'bg-gray-600'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function SettingsPage({ isOpen, onClose, settings, onSettingsChange }) {
  const { theme, themeName, setTheme, themes } = useTheme();
  const [localSettings, setLocalSettings] = useState({
    soundEnabled: true,
    notificationsEnabled: true,
    autoRefresh: true,
    refreshInterval: 2000,
    showFlightTrails: true,
    showRadarGrid: true,
    animationsEnabled: true,
    radarRange: 50,
    alertVolume: 50,
    ...settings,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings(prev => ({ ...prev, ...settings }));
    }
  }, [settings]);

  const handleChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange?.(newSettings);
    
    // Persist to localStorage
    localStorage.setItem('app-settings', JSON.stringify(newSettings));
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('app-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLocalSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            ⚙️ Settings
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          
          {/* Appearance */}
          <SettingSection title="Appearance">
            <SettingRow label="Theme" description="Choose your preferred color scheme">
              <select
                value={themeName}
                onChange={(e) => setTheme(e.target.value)}
                className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {Object.entries(themes).map(([key, t]) => (
                  <option key={key} value={key}>{t.label}</option>
                ))}
              </select>
            </SettingRow>
            
            <SettingRow label="Animations" description="Enable smooth animations">
              <Toggle
                checked={localSettings.animationsEnabled}
                onChange={(v) => handleChange('animationsEnabled', v)}
              />
            </SettingRow>
          </SettingSection>

          {/* Audio & Notifications */}
          <SettingSection title="Audio & Notifications">
            <SettingRow label="Sound Alerts" description="Play sounds for alerts and intrusions">
              <Toggle
                checked={localSettings.soundEnabled}
                onChange={(v) => handleChange('soundEnabled', v)}
              />
            </SettingRow>

            <SettingRow label="Alert Volume" description="Volume level for audio alerts">
              <input
                type="range"
                min="0"
                max="100"
                value={localSettings.alertVolume}
                onChange={(e) => handleChange('alertVolume', parseInt(e.target.value))}
                className="w-24"
                disabled={!localSettings.soundEnabled}
              />
              <span className="text-xs text-gray-400 ml-2 w-8">{localSettings.alertVolume}%</span>
            </SettingRow>

            <SettingRow label="Browser Notifications" description="Show desktop notifications for alerts">
              <Toggle
                checked={localSettings.notificationsEnabled}
                onChange={(v) => handleChange('notificationsEnabled', v)}
              />
            </SettingRow>
          </SettingSection>

          {/* Radar & Map */}
          <SettingSection title="Radar & Map">
            <SettingRow label="Show Flight Trails" description="Display aircraft path history">
              <Toggle
                checked={localSettings.showFlightTrails}
                onChange={(v) => handleChange('showFlightTrails', v)}
              />
            </SettingRow>

            <SettingRow label="Show Radar Grid" description="Display grid lines on radar">
              <Toggle
                checked={localSettings.showRadarGrid}
                onChange={(v) => handleChange('showRadarGrid', v)}
              />
            </SettingRow>

            <SettingRow label="Radar Range (km)" description="Detection radius on radar display">
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={localSettings.radarRange}
                onChange={(e) => handleChange('radarRange', parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-xs text-gray-400 ml-2 w-12">{localSettings.radarRange} km</span>
            </SettingRow>
          </SettingSection>

          {/* Data & Refresh */}
          <SettingSection title="Data & Refresh">
            <SettingRow label="Auto Refresh" description="Automatically update flight data">
              <Toggle
                checked={localSettings.autoRefresh}
                onChange={(v) => handleChange('autoRefresh', v)}
              />
            </SettingRow>

            <SettingRow label="Refresh Interval" description="How often to update data">
              <select
                value={localSettings.refreshInterval}
                onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value))}
                className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                disabled={!localSettings.autoRefresh}
              >
                <option value={1000}>1 second</option>
                <option value={2000}>2 seconds</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
              </select>
            </SettingRow>
          </SettingSection>

          {/* Keyboard Shortcuts Info */}
          <SettingSection title="Keyboard Shortcuts">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Pause/Resume</span>
                <kbd className="px-2 py-0.5 bg-gray-700 rounded text-xs">Space</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Reset</span>
                <kbd className="px-2 py-0.5 bg-gray-700 rounded text-xs">R</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Add Aircraft</span>
                <kbd className="px-2 py-0.5 bg-gray-700 rounded text-xs">A</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Toggle Theme</span>
                <kbd className="px-2 py-0.5 bg-gray-700 rounded text-xs">T</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Toggle View</span>
                <kbd className="px-2 py-0.5 bg-gray-700 rounded text-xs">M</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Settings</span>
                <kbd className="px-2 py-0.5 bg-gray-700 rounded text-xs">Esc</kbd>
              </div>
            </div>
          </SettingSection>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-between items-center">
          <button
            onClick={() => {
              localStorage.removeItem('app-settings');
              window.location.reload();
            }}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
