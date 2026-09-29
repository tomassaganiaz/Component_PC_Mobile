import './global.css';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import ExploreScreen from './src/screens/ExploreScreen';
import FiltersScreen from './src/screens/FiltersScreen';
import InspectionScreen from './src/screens/InspectionScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PublishScreen from './src/screens/PublishScreen';
import { findProduct } from './src/data/mock';
import { getProfile, setAuthToken } from './src/services/api';
import { getStoredItem, removeStoredItem, setStoredItem } from './src/services/storage';
import { colors } from './src/theme';
import type { LoginSuccess, Nav, ProductFilters, Route } from './src/types';

const SESSION_KEY = 'session';

export default function App() {
  const [session, setSession] = useState<LoginSuccess | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [route, setRoute] = useState<Route>({ name: 'explore' });
  const [filters, setFilters] = useState<ProductFilters>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await getStoredItem(SESSION_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as LoginSuccess;
        if (!saved?.access_token || !saved?.user) return;
        await getProfile(saved.access_token);
        if (cancelled) return;
        setAuthToken(saved.access_token);
        setSession(saved);
      } catch {
        if (!cancelled) {
          await removeStoredItem(SESSION_KEY);
          setAuthToken(null);
        }
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (nextSession: LoginSuccess) => {
    setAuthToken(nextSession.access_token);
    setSession(nextSession);
    setRoute({ name: 'explore' });
    try {
      await setStoredItem(SESSION_KEY, JSON.stringify(nextSession));
    } catch {
      // sesión en memoria de todos modos
    }
  };

  const handleLogout = async () => {
    setAuthToken(null);
    setSession(null);
    setRoute({ name: 'explore' });
    setFilters({});
    try {
      await removeStoredItem(SESSION_KEY);
    } catch {
      // noop
    }
  };

  const nav: Nav = {
    go: (next) => setRoute(next),
    back: () => setRoute({ name: 'explore' }),
  };

  if (restoring) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top', 'bottom']}>
          <StatusBar style="light" />
          <View className="flex-1 items-center justify-center gap-3">
            <ActivityIndicator color={colors.secondary} size="large" />
            <Text className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
              Restaurando sesión...
            </Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const renderScreen = () => {
    if (!session) {
      return <LoginScreen onLogin={handleLogin} />;
    }

    switch (route.name) {
      case 'explore':
        return <ExploreScreen nav={nav} filters={filters} />;
      case 'detail': {
        const product = route.product ?? findProduct(route.productId);
        return <ProductDetailScreen nav={nav} product={product} />;
      }
      case 'inspection':
        return <InspectionScreen nav={nav} orderId={route.orderId} />;
      case 'filters':
        return <FiltersScreen nav={nav} filters={filters} onApply={setFilters} />;
      case 'publish':
        return <PublishScreen nav={nav} />;
      case 'profile':
        return <ProfileScreen nav={nav} session={session} onLogout={handleLogout} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        {renderScreen()}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}