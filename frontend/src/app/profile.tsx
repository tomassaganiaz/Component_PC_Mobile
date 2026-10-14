import Head from 'expo-router/head';
import ProfileScreen from '../screens/ProfileScreen';
import { useAuth } from '../context/AuthContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { createNav } from '../navigation';

export default function ProfileRoute() {
  const { session, logout } = useAuth();
  const { reset } = useMarketplace();
  const nav = createNav();

  if (!session) return null;

  return (
    <>
      <Head>
        <title>Mi perfil · TechShield</title>
        <meta name="description" content="Tu identidad verificada, nivel de seguridad y compras en TechShield." />
        <meta property="og:title" content="TechShield — Mi perfil" />
      </Head>
      <ProfileScreen
        nav={nav}
        session={session}
        onLogout={async () => {
          await logout();
          reset();
        }}
      />
    </>
  );
}