import Head from 'expo-router/head';
import RegisterScreen from '../screens/RegisterScreen';
import { useAuth } from '../context/AuthContext';

export default function RegisterRoute() {
  const { login } = useAuth();
  return (
    <>
      <Head>
        <title>Crear cuenta · TechShield</title>
        <meta
          name="description"
          content="Creá tu cuenta en TechShield, el marketplace verificado de hardware y móviles con custodia escrow."
        />
      </Head>
      <RegisterScreen onLogin={login} />
    </>
  );
}