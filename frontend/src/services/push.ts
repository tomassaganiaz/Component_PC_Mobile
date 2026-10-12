import { Platform } from 'react-native';

/**
 * Inicializa las notificaciones locales. Se cargan de forma dinámica para no
 * romper el bundle web (expo-notifications no está disponible en web).
 */
export async function initNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const N = await import('expo-notifications');
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    const { status } = await N.getPermissionsAsync();
    if (status !== 'granted') {
      await N.requestPermissionsAsync();
    }
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', {
        name: 'General',
        importance: N.AndroidImportance.DEFAULT,
      });
    }
  } catch {
    // sin notificaciones disponibles
  }
}

/** Muestra una notificación local inmediata. */
export async function presentLocalNotification(
  title: string,
  body: string,
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const N = await import('expo-notifications');
    await N.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // ignore
  }
}
