import Head from 'expo-router/head';
import LoginScreen from '../screens/LoginScreen';
import { useAuth } from '../context/AuthContext';

export default function LoginRoute() {
  const { login } = useAuth();
  return (
    <>
      <Head>
        <title>Iniciar sesión · TechShield</title>
        <meta name="description" content="Ingresá a TechShield, el marketplace verificado de hardware con custodia escrow." />
        <meta property="og:title" content="TechShield — Iniciar sesión" />
      </Head>
      <LoginScreen onLogin={login} />
    </>
  );
}