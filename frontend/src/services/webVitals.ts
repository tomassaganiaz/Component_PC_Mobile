import { Platform } from 'react-native';

import { track } from './analytics';

/**
 * Mide Core Web Vitals (LCP, INP, CLS, FCP, TTFB) en la web y los reporta
 * a /api/analytics para monitoreo en producción. No hace nada en nativo.
 */
export function initWebVitals(): void {
  if (Platform.OS !== 'web') return;
  try {
    // Import dinámico: en nativo nunca se carga.
    import('web-vitals').then((mod) => {
      const report = (metric: { name: string; value: number; rating?: string }) => {
        track('web_vital', {
          metadata: {
            name: metric.name,
            value: Math.round(metric.value),
            rating: metric.rating ?? 'n/a',
          },
        });
      };
      const wv = mod as unknown as Record<string, (cb: typeof report) => void>;
      wv.onLCP?.(report);
      wv.onINP?.(report);
      wv.onCLS?.(report);
      wv.onFCP?.(report);
      wv.onTTFB?.(report);
    });
  } catch {
    /* noop */
  }
}