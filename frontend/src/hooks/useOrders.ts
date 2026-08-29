import { useState, useEffect } from 'react';
import { Order } from '../types';
import { orderService } from '../services/orderService';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await orderService.getMyOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar órdenes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const createOrder = async (productId: string, shippingAddress?: string) => {
    const order = await orderService.create(productId, shippingAddress);
    setOrders((prev) => [order, ...prev]);
    return order;
  };

  const cancelOrder = async (id: string) => {
    const updatedOrder = await orderService.cancel(id);
    setOrders((prev) =>
      prev.map((order) => (order.id === id ? updatedOrder : order))
    );
    return updatedOrder;
  };

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders,
    createOrder,
    cancelOrder,
  };
}
