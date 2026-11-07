'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
});

const STORAGE_KEY = 'iqtisodai-theme';
const LIGHT_DEFAULT_MIGRATION = 'iqtisodai-light-default-v1';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  // Make the refreshed finance workspace open in light mode once.
  // A later manual theme choice is still remembered.
  useEffect(() => {
    const migrated = localStorage.getItem(LIGHT_DEFAULT_MIGRATION) === '1';
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (!migrated) {
      localStorage.setItem(STORAGE_KEY, 'light');
      localStorage.setItem(LIGHT_DEFAULT_MIGRATION, '1');
      setTheme('light');
      document.documentElement.classList.remove('dark');
      return;
    }
    const initial: Theme = saved === 'dark' ? 'dark' : 'light';
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
