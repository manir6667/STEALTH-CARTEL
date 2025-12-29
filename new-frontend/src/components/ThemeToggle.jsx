import React from 'react';
import { useTheme, THEMES } from '../context/ThemeContext';

/**
 * ThemeToggle - A sleek theme switcher component with visual indicators
 */
export default function ThemeToggle({ className = '', showLabel = true, size = 'md' }) {
  const { theme, themeName, setTheme, toggleTheme, themes } = useTheme();

  const sizeClasses = {
    sm: 'p-1.5 text-sm',
    md: 'p-2 text-base',
    lg: 'p-3 text-lg'
  };

  const iconSize = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  const themeIcons = {
    dark: '🌙',
    light: '☀️',
    military: '🎖️'
  };

  const themeLabels = {
    dark: 'Dark',
    light: 'Light',
    military: 'Military'
  };

  return (
    <div className={`theme-toggle flex items-center gap-2 ${className}`}>
      {/* Simple Toggle Button */}
      <button
        onClick={toggleTheme}
        className={`${sizeClasses[size]} rounded-lg bg-gray-800/50 hover:bg-gray-700 transition-all duration-300 flex items-center gap-2 border border-gray-700 hover:border-gray-600`}
        title={`Current: ${themeLabels[themeName]} - Click to cycle themes`}
        aria-label={`Toggle theme. Current theme: ${themeName}`}
      >
        <span className={`${iconSize[size]} transition-transform duration-300 hover:scale-110`}>
          {themeIcons[themeName]}
        </span>
        {showLabel && (
          <span className="text-gray-300 font-medium">
            {themeLabels[themeName]}
          </span>
        )}
      </button>
    </div>
  );
}

/**
 * ThemeSelector - A dropdown/grid selector for themes
 */
export function ThemeSelector({ className = '' }) {
  const { themeName, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  const themeIcons = {
    dark: '🌙',
    light: '☀️',
    military: '🎖️'
  };

  const themeDescriptions = {
    dark: 'Classic dark mode for low-light environments',
    light: 'Bright theme for daytime use',
    military: 'Tactical green theme for military operations'
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700"
      >
        <span className="text-xl">{themeIcons[themeName]}</span>
        <span className="text-gray-300">{themes[themeName]?.label || themeName}</span>
        <span className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full mt-2 right-0 z-50 w-72 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden animate-scale-in">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-400">Select Theme</h3>
            </div>
            <div className="p-2">
              {Object.entries(themes).map(([name, themeData]) => (
                <button
                  key={name}
                  onClick={() => {
                    setTheme(name);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    themeName === name 
                      ? 'bg-blue-600/20 border border-blue-500/50' 
                      : 'hover:bg-gray-700/50'
                  }`}
                >
                  <span className="text-2xl">{themeIcons[name]}</span>
                  <div className="text-left flex-1">
                    <div className="font-medium text-white flex items-center gap-2">
                      {themeData.label}
                      {themeName === name && (
                        <span className="text-xs bg-blue-500 px-1.5 py-0.5 rounded">Active</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {themeDescriptions[name]}
                    </div>
                  </div>
                  {/* Color preview */}
                  <div className="flex gap-1">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-600" 
                      style={{ backgroundColor: themeData.colors.background }}
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-600" 
                      style={{ backgroundColor: themeData.colors.primary }}
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-600" 
                      style={{ backgroundColor: themeData.colors.success }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * ThemePill - Compact inline theme indicator with toggle
 */
export function ThemePill() {
  const { themeName, toggleTheme } = useTheme();

  const themeIcons = {
    dark: '🌙',
    light: '☀️',
    military: '🎖️'
  };

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-800/60 hover:bg-gray-700/80 transition-all text-xs border border-gray-700"
      title="Click to change theme"
    >
      <span>{themeIcons[themeName]}</span>
      <span className="text-gray-400 capitalize">{themeName}</span>
    </button>
  );
}
