import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform, useColorScheme } from 'react-native';
import { colorScheme as nativewindColorScheme } from 'nativewind';

import { getStoredItem, removeStoredItem, setStoredItem } from '../services/storage';
import { setColorSchemeForInline } from '../theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme_preference';

interface ThemeContextValue {
  preference: ThemePreference;
  theme: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemRaw = useColorScheme();
  const system: ResolvedTheme = systemRaw === 'dark' ? 'dark' : 'light';
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await getStoredItem(STORAGE_KEY);
      if (!cancelled && (raw === 'light' || raw === 'dark' || raw === 'system')) {
        setPreference(raw);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const theme: ResolvedTheme = preference === 'system' ? system : preference;

  useEffect(() => {
    nativewindColorScheme.set(preference);
    setColorSchemeForInline(theme);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [preference, theme]);

  const setPreferenceSafe = useCallback((p: ThemePreference) => {
    setPreference(p);
    if (p === 'system') {
      removeStoredItem(STORAGE_KEY).catch(() => {});
    } else {
      setStoredItem(STORAGE_KEY, p).catch(() => {});
    }
  }, []);

  const toggle = useCallback(() => {
    setPreferenceSafe(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setPreferenceSafe]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, theme, setPreference: setPreferenceSafe, toggle }),
    [preference, theme, setPreferenceSafe, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeCtx(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeCtx debe usarse dentro de <ThemeProvider>');
  }
  return ctx;
}