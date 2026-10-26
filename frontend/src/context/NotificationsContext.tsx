import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from './AuthContext';
import {
  getNotifications,
  getUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/api';
import { initNotifications, presentLocalNotification } from '../services/push';
import type { AppNotification } from '../services/api';

interface NotificationsContextValue {
  items: AppNotification[];
  unread: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const prevUnread = useRef(0);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        getNotifications(),
        getUnreadNotifications(),
      ]);
      setItems(list);
      setUnread(count.count);
    } catch {
      // silencioso: no bloquear la app
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      // Cierre de sesión: limpiar notificaciones y contadores del usuario
      // anterior (el badge de la campana no debe heredarse entre cuentas).
      void (async () => {
        await Promise.resolve();
        setItems([]);
        setUnread(0);
        prevUnread.current = 0;
      })();
      return;
    }
    let cancelled = false;
    void initNotifications();

    const loadAll = async () => {
      try {
        const [list, count] = await Promise.all([
          getNotifications(),
          getUnreadNotifications(),
        ]);
        if (!cancelled) {
          if (count.count > prevUnread.current && list.length > 0) {
            await presentLocalNotification(list[0].title, list[0].body);
          }
          prevUnread.current = count.count;
          setItems(list);
          setUnread(count.count);
        }
      } catch {
        // ignore
      }
    };
    const loadCount = async () => {
      try {
        const count = await getUnreadNotifications();
        if (!cancelled) setUnread(count.count);
      } catch {
        // ignore
      }
    };

    void loadAll();
    const timer = setInterval(loadCount, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session]);

  const markRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({ items, unread, loading, refresh, markRead, markAllRead }),
    [items, unread, loading, refresh, markRead, markAllRead],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications debe usarse dentro de <NotificationsProvider>');
  }
  return ctx;
}
