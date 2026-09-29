import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const IS_WEB = Platform.OS === 'web';
const PREFIX = 'techshield.';

function webStorage(): Storage {
  return globalThis.localStorage;
}

export async function getStoredItem(key: string): Promise<string | null> {
  const fullKey = PREFIX + key;
  if (IS_WEB) {
    return webStorage().getItem(fullKey);
  }
  return SecureStore.getItemAsync(fullKey);
}

export async function setStoredItem(key: string, value: string): Promise<void> {
  const fullKey = PREFIX + key;
  if (IS_WEB) {
    webStorage().setItem(fullKey, value);
    return;
  }
  await SecureStore.setItemAsync(fullKey, value);
}

export async function removeStoredItem(key: string): Promise<void> {
  const fullKey = PREFIX + key;
  if (IS_WEB) {
    webStorage().removeItem(fullKey);
    return;
  }
  await SecureStore.deleteItemAsync(fullKey);
}