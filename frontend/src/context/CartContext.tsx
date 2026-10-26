import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from './AuthContext';
import {
  addToCart,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from '../services/api';
import type { CartItemData } from '../services/api';

interface CartContextValue {
  items: CartItemData[];
  count: number;
  loading: boolean;
  refresh: () => Promise<void>;
  add: (productId: string, quantity?: number) => Promise<void>;
  updateQty: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [items, setItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const cart = await getCart();
      setItems(cart.items);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      // Cierre de sesión: nunca dejar visible el carrito del usuario anterior
      // (el badge y la lista se limpian antes de que cargue el próximo user).
      void (async () => {
        await Promise.resolve();
        setItems([]);
      })();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const cart = await getCart();
        if (!cancelled) setItems(cart.items);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const add = useCallback(async (productId: string, quantity = 1) => {
    const cart = await addToCart(productId, quantity);
    setItems(cart.items);
  }, []);

  const updateQty = useCallback(async (itemId: string, quantity: number) => {
    const cart = await updateCartItem(itemId, quantity);
    setItems(cart.items);
  }, []);

  const remove = useCallback(async (itemId: string) => {
    const cart = await removeCartItem(itemId);
    setItems(cart.items);
  }, []);

  const clear = useCallback(async () => {
    await clearCart();
    setItems([]);
  }, []);

  const count = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({ items, count, loading, refresh, add, updateQty, remove, clear }),
    [items, count, loading, refresh, add, updateQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart debe usarse dentro de <CartProvider>');
  }
  return ctx;
}
