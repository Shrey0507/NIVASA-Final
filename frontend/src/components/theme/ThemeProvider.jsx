import { useEffect, useState } from 'react';
import { ThemeContext } from './useTheme';

const getSystemTheme = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'system';
  return localStorage.getItem('nivasa-theme') || 'system';
};

export const ThemeProvider = ({ children, ...props }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  // Apply the resolved theme to <html> whenever the preference changes.
  useEffect(() => {
    const root = document.documentElement;
    const resolved = theme === 'system' ? getSystemTheme() : theme;

    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
  }, [theme]);

  // Persist the preference.
  useEffect(() => {
    localStorage.setItem('nivasa-theme', theme);
  }, [theme]);

  // Follow the OS when the user has chosen "system".
  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = document.documentElement;
      const resolved = mediaQuery.matches ? 'dark' : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
      root.style.colorScheme = resolved;
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const value = {
    theme,
    setTheme,
    resolvedTheme: theme === 'system' ? getSystemTheme() : theme,
  };

  return (
    <ThemeContext.Provider {...props} value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
