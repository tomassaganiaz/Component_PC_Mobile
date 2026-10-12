import { Platform } from 'react-native';

/** ¿El dispositivo soporta biometría (Face ID / huella)? */
export async function biometricSupported(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const LA = await import('expo-local-authentication');
    const hasHardware = await LA.hasHardwareAsync();
    const enrolled = await LA.isEnrolledAsync();
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

/** Lanza el prompt biométrico nativo. Devuelve true si se autenticó. */
export async function authenticateBiometric(reason: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const LA = await import('expo-local-authentication');
    const result = await LA.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Usar contraseña',
      cancelLabel: 'Cancelar',
    });
    return result.success;
  } catch {
    return false;
  }
}
