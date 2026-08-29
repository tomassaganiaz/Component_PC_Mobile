import api from './api';
import { Order } from '../types';

export const orderService = {
  async getMyOrders(): Promise<Order[]> {
    const { data } = await api.get<Order[]>('/orders');
    return data;
  },

  async getById(id: string): Promise<Order> {
    const { data } = await api.get<Order>(`/orders/${id}`);
    return data;
  },

  async create(productId: string, shippingAddress?: string, paymentMethod?: string): Promise<Order> {
    const { data } = await api.post<Order>('/orders', {
      productId,
      shippingAddress,
      paymentMethod,
    });
    return data;
  },

  async cancel(id: string): Promise<Order> {
    const { data } = await api.post<Order>(`/orders/${id}/cancel`);
    return data;
  },
};
