import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Expo Go no soporta el push remoto de expo-notifications en Android: importar
 * el módulo allí lanza un error. Detectamos Expo Go para no cargarlo.
 */
function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

/**
 * Inicializa las notificaciones locales. Se cargan de forma dinámica y sólo en
 * builds nativos (se omite en web y en Expo Go).
 */
export async function initNotifications(): Promise<void> {
  if (Platform.OS === 'web' || isExpoGo()) return;
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

/** Muestra una notificación local inmediata (omite web y Expo Go). */
export async function presentLocalNotification(
  title: string,
  body: string,
): Promise<void> {
  if (Platform.OS === 'web' || isExpoGo()) return;
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
