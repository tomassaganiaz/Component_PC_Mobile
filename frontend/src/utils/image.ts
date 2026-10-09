import { API_URL } from '../config';

const OPTIMIZABLE_HOSTS = ['googleusercontent.com', 'ggpht.com'];

/**
 * Reescribe URLs de imágenes de hosts conocidos (Google) para que pasen por el
 * proxy del backend, que las redimensiona a WebP y las cachea (menor LCP).
 * Si no aplica, devuelve la URL original.
 */
export function optimizedImageUrl(uri: string | null | undefined, width: number, quality = 72): string {
  if (!uri) return '';
  try {
    const parsed = new URL(uri);
    const host = parsed.hostname.toLowerCase();
    const optimizable = OPTIMIZABLE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
    if (!optimizable) return uri;
    return `${API_URL}/media/image?url=${encodeURIComponent(uri)}&w=${Math.round(width)}&q=${quality}`;
  } catch {
    return uri;
  }
}