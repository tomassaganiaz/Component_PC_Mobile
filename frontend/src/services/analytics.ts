import { API_URL } from '../config';
import { getAuthToken } from './api';

export interface TrackEventData {
  page?: string;
  productId?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Registra un evento de analytics en el backend (fire-and-forget).
 * Nunca lanza: si el backend está caído, se ignora silenciosamente.
 */
export function track(event: string, data: TrackEventData = {}): void {
  const token = getAuthToken();
  try {
    fetch(`${API_URL}/analytics/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ event, ...data }),
      keepalive: true,
    }).catch(() => {
      /* noop */
    });
  } catch {
    /* noop */
  }
}