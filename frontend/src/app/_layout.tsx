import '../../global.css';
import { useEffect } from 'react';
import { Platform, StyleSheet, ActivityIndicator, Text, View } from 'react-native';
import Head from 'expo-router/head';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { MarketplaceProvider } from '../context/MarketplaceContext';
import { colors } from '../theme';

if (Platform.OS === 'web') {
  // react-native-web: habilita el dark mode por clase para permitir que Expo
  // fije el color scheme manualmente (userInterfaceStyle: 'dark').
  (StyleSheet as unknown as { setFlag?: (flag: string, value: string) => void }).setFlag?.(
    'darkMode',
    'class',
  );
}

function ProtectedRouter() {
  const { session, restoring } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (restoring) return;
    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';
    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, restoring, segments, router]);

  if (restoring) {
    return (
      <View className="flex-1 items-center justify-center gap-3">
        <ActivityIndicator color={colors.secondary} size="large" />
        <Text className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
          Restaurando sesión...
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="index" />
      <Stack.Screen name="filters" />
      <Stack.Screen name="publish" />
      <Stack.Screen name="inspection" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="product/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Head.Provider>
      <AuthProvider>
        <MarketplaceProvider>
          <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top', 'bottom']}>
              <StatusBar style="light" />
              <ProtectedRouter />
            </SafeAreaView>
          </SafeAreaProvider>
        </MarketplaceProvider>
      </AuthProvider>
    </Head.Provider>
  );
}