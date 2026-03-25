'use client';

import { type ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeModeProvider, useThemeMode } from '@/hooks/useThemeMode';

function ThemeApplier({ children }: { children: ReactNode }) {
  const { theme } = useThemeMode();
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export default function ThemeRegistry({ children }: { children: ReactNode }) {
  return (
    <ThemeModeProvider>
      <ThemeApplier>{children}</ThemeApplier>
    </ThemeModeProvider>
  );
}
