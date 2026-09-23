import './global.css';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import ExploreScreen from './src/screens/ExploreScreen';
import FiltersScreen from './src/screens/FiltersScreen';
import InspectionScreen from './src/screens/InspectionScreen';
import LoginScreen from './src/screens/LoginScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import { findProduct } from './src/data/mock';
import { setAuthToken } from './src/services/api';
import { colors } from './src/theme';
import type { LoginSuccess, Nav, ProductFilters, Route } from './src/types';

const PLACEHOLDERS: Record<string, { title: string; subtitle: string; icon: string }> = {
  publish: {
    title: 'Publicar Hardware',
    subtitle: 'Publica tus componentes y móviles para el kit de auditoría gratuito. Próximamente.',
    icon: 'add',
  },
  profile: {
    title: 'Mi Perfil',
    subtitle: 'Tu identidad verificada, ventas, compras y certificados. Próximamente.',
    icon: 'person',
  },
};

export default function App() {
  const [session, setSession] = useState<LoginSuccess | null>(null);
  const [route, setRoute] = useState<Route>({ name: 'explore' });
  const [filters, setFilters] = useState<ProductFilters>({});

  const handleLogin = (nextSession: LoginSuccess) => {
    setAuthToken(nextSession.access_token);
    setSession(nextSession);
    setRoute({ name: 'explore' });
  };

  const nav: Nav = {
    go: (next) => setRoute(next),
    back: () => setRoute({ name: 'explore' }),
  };

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
        return <InspectionScreen nav={nav} />;
      case 'filters':
        return <FiltersScreen nav={nav} filters={filters} onApply={setFilters} />;
      case 'publish':
      case 'profile': {
        const p = PLACEHOLDERS[route.name];
        return (
          <PlaceholderScreen nav={nav} active={route.name} title={p.title} subtitle={p.subtitle} icon={p.icon} />
        );
      }
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