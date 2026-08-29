import api from './api';
import { Product, ProductFilters, Verification } from '../types';

export const productService = {
  async getAll(filters?: ProductFilters): Promise<Product[]> {
    const { data } = await api.get<Product[]>('/products', { params: filters });
    return data;
  },

  async getById(id: string): Promise<Product> {
    const { data } = await api.get<Product>(`/products/${id}`);
    return data;
  },

  async getBySeller(sellerId: string): Promise<Product[]> {
    const { data } = await api.get<Product[]>(`/products/seller/${sellerId}`);
    return data;
  },

  async create(productData: Partial<Product>): Promise<Product> {
    const { data } = await api.post<Product>('/products', productData);
    return data;
  },

  async update(id: string, productData: Partial<Product>): Promise<Product> {
    const { data } = await api.patch<Product>(`/products/${id}`, productData);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },

  async getVerifications(productId: string): Promise<Verification[]> {
    const { data } = await api.get<Verification[]>(`/verifications/product/${productId}`);
    return data;
  },
};
