/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper function to get system preference
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Helper function to resolve theme preference to actual theme
const resolveTheme = (preference: ThemePreference): ResolvedTheme => {
  if (preference === 'system') {
    return getSystemTheme();
  }
  return preference;
};

// Helper function to apply theme to DOM
const applyTheme = (theme: ResolvedTheme) => {
  const root = window.document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('theme') as ThemePreference | null;
    if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
      return saved;
    }
    // Default to system if nothing saved
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(themePreference)
  );

  // Apply theme on mount and when resolved theme changes
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system preference changes when themePreference is 'system'
  useEffect(() => {
    if (themePreference !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Update resolved theme when system preference changes
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
    };

    // Check initial value
    handleChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [themePreference]);

  // Update resolved theme when preference changes (if not system)
  useEffect(() => {
    if (themePreference !== 'system') {
      setResolvedTheme(themePreference);
    }
  }, [themePreference]);

  // Persist preference to localStorage (only manual overrides, not system)
  useEffect(() => {
    if (themePreference === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', themePreference);
    }
  }, [themePreference]);

  const setThemePreference = (theme: ThemePreference) => {
    setThemePreferenceState(theme);
  };

  const toggleTheme = () => {
    // Cycle through: system -> light -> dark -> system
    setThemePreferenceState(prev => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  };

  return (
    <ThemeContext.Provider value={{ themePreference, resolvedTheme, setThemePreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};