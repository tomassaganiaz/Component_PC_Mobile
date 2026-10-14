import { useCallback } from 'react';
import { usePathname } from 'expo-router';
import { track } from '../services/analytics';
import type { TrackEventData } from '../services/analytics';

export function useTrack() {
  const pathname = usePathname();
  const trackEvent = useCallback(
    (event: string, data: Omit<TrackEventData, 'page'> = {}) => {
      track(event, { ...data, page: pathname });
    },
    [pathname],
  );
  return trackEvent;
}