import Constants from 'expo-constants';
import { Platform } from 'react-native';

function defaultHost(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return host;
  }
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  return 'localhost';
}

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${defaultHost()}:3000/api`;