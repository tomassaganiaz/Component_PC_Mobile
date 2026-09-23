import { Platform } from 'react-native';

function defaultHost(): string {
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  return 'localhost';
}

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${defaultHost()}:3000/api`;