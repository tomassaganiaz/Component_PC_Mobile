import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getLocales } from 'expo-localization';

import { getStoredItem, removeStoredItem, setStoredItem } from '../services/storage';
import { translations, locales, type Locale } from './translations';

const STORAGE_KEY = 'locale';

export type TParams = Record<string, string | number>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TParams) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (date: string | Date) => string;
  formatNumber: (value: number) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : `{${k}}`));
}

function deviceLocale(): Locale {
  try {
    const code = getLocales?.()[0]?.languageCode;
    if (code && (locales as readonly string[]).includes(code)) return code as Locale;
  } catch {
    /* noop */
  }
  return 'es';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(deviceLocale);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await getStoredItem(STORAGE_KEY);
      if (!cancelled && raw && (locales as readonly string[]).includes(raw)) {
        setLocaleState(raw as Locale);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (next === deviceLocale()) {
      removeStoredItem(STORAGE_KEY).catch(() => {});
    } else {
      setStoredItem(STORAGE_KEY, next).catch(() => {});
    }
  }, []);

  const t = useCallback(
    (key: string, params?: TParams) => {
      const dict = translations[locale] ?? translations.es;
      return interpolate(dict[key] ?? translations.es[key] ?? key, params);
    },
    [locale],
  );

  const formatCurrency = useCallback(
    (amount: number, currency = 'USD') => {
      try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
      } catch {
        return `$${amount.toFixed(2)}`;
      }
    },
    [locale],
  );

  const formatDate = useCallback(
    (date: string | Date) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      try {
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d);
      } catch {
        return d.toLocaleDateString();
      }
    },
    [locale],
  );

  const formatNumber = useCallback(
    (value: number) => {
      try {
        return new Intl.NumberFormat(locale).format(value);
      } catch {
        return String(value);
      }
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, formatCurrency, formatDate, formatNumber }),
    [locale, setLocale, t, formatCurrency, formatDate, formatNumber],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n debe usarse dentro de <I18nProvider>');
  }
  return ctx;
}

export { locales };
export type { Locale };