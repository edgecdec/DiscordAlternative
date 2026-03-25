'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { createTheme, type PaletteMode, type Theme } from '@mui/material/styles';

const PRIMARY_MAIN = '#5865F2';
const DARK_BG_DEFAULT = '#121212';
const DARK_BG_PAPER = '#1e1e1e';
const LIGHT_BG_DEFAULT = '#f5f5f5';
const LIGHT_BG_PAPER = '#ffffff';
const STORAGE_KEY = 'themeMode';

interface ThemeModeContextValue {
  mode: PaletteMode;
  toggleMode: () => void;
  theme: Theme;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function buildTheme(mode: PaletteMode): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: PRIMARY_MAIN },
      background: {
        default: mode === 'dark' ? DARK_BG_DEFAULT : LIGHT_BG_DEFAULT,
        paper: mode === 'dark' ? DARK_BG_PAPER : LIGHT_BG_PAPER,
      },
    },
  });
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>('dark');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      setMode(stored);
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const theme = useMemo(() => buildTheme(mode), [mode]);

  const value = useMemo(() => ({ mode, toggleMode, theme }), [mode, toggleMode, theme]);

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return ctx;
}
