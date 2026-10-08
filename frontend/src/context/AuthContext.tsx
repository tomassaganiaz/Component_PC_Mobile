import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getProfile,
  logoutSession,
  setAuthTokens,
  setRefreshTokensCallback,
} from '../services/api';
import { track } from '../services/analytics';
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

  const persist = useCallback(async (next: LoginSuccess) => {
    try {
      await setStoredItem(SESSION_KEY, JSON.stringify(next));
    } catch {
      // sesión en memoria de todos modos
    }
  }, []);

  // El layer de API rota el par y avisa acá para persistir el nuevo refresh.
  useEffect(() => {
    setRefreshTokensCallback((access, refresh) => {
      setSession((prev) => {
        if (!prev) return prev;
        const next = { ...prev, access_token: access, refresh_token: refresh };
        persist(next);
        return next;
      });
    });
    return () => setRefreshTokensCallback(null);
  }, [persist]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await getStoredItem(SESSION_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as LoginSuccess;
        if (!saved?.access_token || !saved?.user) return;
        setAuthTokens(saved.access_token, saved.refresh_token);
        await getProfile(); // valida y, si expiró, rota el refresh internamente
        if (cancelled) return;
        setSession(saved);
      } catch {
        if (!cancelled) {
          await removeStoredItem(SESSION_KEY);
          setAuthTokens(null, null);
        }
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (nextSession: LoginSuccess) => {
      setAuthTokens(nextSession.access_token, nextSession.refresh_token);
      setSession(nextSession);
      track('login', { page: '/login', metadata: { userId: nextSession.user.id } });
      await persist(nextSession);
    },
    [persist],
  );

  const logout = useCallback(async () => {
    track('logout', { page: '/profile' });
    const refresh = session?.refresh_token;
    setAuthTokens(null, null);
    setSession(null);
    try {
      if (refresh) await logoutSession(refresh); // revoca en el backend
    } catch {
      // noop
    }
    try {
      await removeStoredItem(SESSION_KEY);
    } catch {
      // noop
    }
  }, [session]);

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