import { API_URL } from '../config';

const OPTIMIZABLE_HOSTS = ['googleusercontent.com', 'ggpht.com'];

/** Origen del backend (sin el sufijo /api), p. ej. http://192.168.0.10:3000 */
function apiOrigin(): string {
  return API_URL.replace(/\/api\/?$/, '');
}

/**
 * Reescribe URLs de imágenes:
 * - Rutas locales `/static/...` servidas por el backend → se resuelven contra el host de la API.
 * - Hosts conocidos (Google) → pasan por el proxy del backend (resize + WebP + caché).
 * - El resto → se devuelve tal cual.
 */
export function optimizedImageUrl(uri: string | null | undefined, width: number, quality = 72): string {
  if (!uri) return '';

  // Imagen local servida por el backend (ej. /static/products/ryzen7.png)
  if (uri.startsWith('/')) {
    return `${apiOrigin()}${uri}`;
  }

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
