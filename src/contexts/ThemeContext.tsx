import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

// The `.dark` class is applied before paint by the inline bootstrap script in
// the Astro layout. This hook keeps React state in sync and lets any island
// toggle the theme. There is no Provider: each island shares state via a window
// event + localStorage, so the nav island and page-body islands stay aligned.
const THEME_EVENT = 'forkcast:themechange';

const getStoredTheme = (): Theme => {
  try {
    return (localStorage.getItem('theme') as Theme) || 'system';
  } catch {
    return 'system';
  }
};

const getSystemTheme = (): 'light' | 'dark' =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

const resolveTheme = (theme: Theme): 'light' | 'dark' =>
  theme === 'system' ? getSystemTheme() : theme;

const applyTheme = (theme: Theme) => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark');
  }
};

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    resolveTheme(getStoredTheme()),
  );

  useEffect(() => {
    const sync = () => {
      const next = getStoredTheme();
      setThemeState(next);
      setResolvedTheme(resolveTheme(next));
    };

    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener('storage', sync);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (getStoredTheme() === 'system') {
        setResolvedTheme(getSystemTheme());
        applyTheme('system');
      }
    };
    media.addEventListener('change', handleSystemChange);

    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      window.removeEventListener('storage', sync);
      media.removeEventListener('change', handleSystemChange);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Ignore storage failures (private mode, etc.); the class still applies.
    }
    applyTheme(next);
    setThemeState(next);
    setResolvedTheme(resolveTheme(next));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(THEME_EVENT));
    }
  }, []);

  return { theme, resolvedTheme, setTheme };
}
