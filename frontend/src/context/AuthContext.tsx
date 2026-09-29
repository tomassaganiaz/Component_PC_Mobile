import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getProfile, setAuthToken } from '../services/api';
import { getStoredItem, removeStoredItem, setStoredItem } from '../services/storage';
import type { LoginSuccess } from '../types';

const SESSION_KEY = 'session';

interface AuthContextValue {
  session: LoginSuccess | null;
  restoring: boolean;
  login: (session: LoginSuccess) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<LoginSuccess | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await getStoredItem(SESSION_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as LoginSuccess;
        if (!saved?.access_token || !saved?.user) return;
        await getProfile(saved.access_token);
        if (cancelled) return;
        setAuthToken(saved.access_token);
        setSession(saved);
      } catch {
        if (!cancelled) {
          await removeStoredItem(SESSION_KEY);
          setAuthToken(null);
        }
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (nextSession: LoginSuccess) => {
    setAuthToken(nextSession.access_token);
    setSession(nextSession);
    try {
      await setStoredItem(SESSION_KEY, JSON.stringify(nextSession));
    } catch {
      // sesión en memoria de todos modos
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setSession(null);
    try {
      await removeStoredItem(SESSION_KEY);
    } catch {
      // noop
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, restoring, login, logout }),
    [session, restoring, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}