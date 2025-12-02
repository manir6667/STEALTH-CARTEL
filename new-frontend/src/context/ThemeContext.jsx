import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = {
  dark: {
    name: 'dark',
    label: 'Dark Mode',
    colors: {
      background: '#0a0f1c',
      backgroundSecondary: '#111827',
      surface: '#1f2937',
      surfaceHover: '#374151',
      border: '#374151',
      text: '#ffffff',
      textSecondary: '#9ca3af',
      textMuted: '#6b7280',
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#06b6d4',
      radar: {
        background: 'rgba(0, 20, 0, 0.95)',
        grid: '#004400',
        sweep: 'rgba(0, 255, 0, 0.15)',
        blip: '#00ff00',
        alert: '#ff4444',
        text: '#00ff00'
      }
    }
  },
  light: {
    name: 'light',
    label: 'Light Mode',
    colors: {
      background: '#f3f4f6',
      backgroundSecondary: '#ffffff',
      surface: '#ffffff',
      surfaceHover: '#f9fafb',
      border: '#e5e7eb',
      text: '#111827',
      textSecondary: '#4b5563',
      textMuted: '#9ca3af',
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      info: '#0891b2',
      radar: {
        background: 'rgba(240, 248, 240, 0.95)',
        grid: '#22c55e',
        sweep: 'rgba(34, 197, 94, 0.2)',
        blip: '#166534',
        alert: '#dc2626',
        text: '#166534'
      }
    }
  },
  military: {
    name: 'military',
    label: 'Military Green',
    colors: {
      background: '#0c1810',
      backgroundSecondary: '#132418',
      surface: '#1a3020',
      surfaceHover: '#234028',
      border: '#2d5030',
      text: '#c8e6c9',
      textSecondary: '#81c784',
      textMuted: '#4caf50',
      primary: '#4caf50',
      primaryHover: '#388e3c',
      success: '#81c784',
      warning: '#ffd54f',
      danger: '#ef5350',
      info: '#4fc3f7',
      radar: {
        background: 'rgba(12, 24, 16, 0.98)',
        grid: '#1b5e20',
        sweep: 'rgba(76, 175, 80, 0.2)',
        blip: '#69f0ae',
        alert: '#ff5252',
        text: '#69f0ae'
      }
    }
  }
};

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(() => {
    const saved = localStorage.getItem('app-theme');
    return saved || 'dark';
  });

  const theme = THEMES[themeName] || THEMES.dark;

  useEffect(() => {
    localStorage.setItem('app-theme', themeName);
    
    // Apply CSS variables
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (typeof value === 'object') {
        Object.entries(value).forEach(([subKey, subValue]) => {
          root.style.setProperty(`--color-${key}-${subKey}`, subValue);
        });
      } else {
        root.style.setProperty(`--color-${key}`, value);
      }
    });
    
    // Set body background
    document.body.style.backgroundColor = theme.colors.background;
    document.body.style.color = theme.colors.text;
  }, [themeName, theme]);

  const toggleTheme = () => {
    const themeNames = Object.keys(THEMES);
    const currentIndex = themeNames.indexOf(themeName);
    const nextIndex = (currentIndex + 1) % themeNames.length;
    setThemeName(themeNames[nextIndex]);
  };

  const setTheme = (name) => {
    if (THEMES[name]) {
      setThemeName(name);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme, toggleTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
