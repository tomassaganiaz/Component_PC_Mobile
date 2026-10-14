import Head from 'expo-router/head';
import SalesScreen from '../screens/SalesScreen';
import { createNav } from '../navigation';

export default function SalesRoute() {
  return (
    <>
      <Head>
        <title>Mis ventas · TechShield</title>
        <meta
          name="description"
          content="Gestioná las ventas de tus productos con custodia y auditoría TechShield."
        />
        <meta property="og:title" content="TechShield — Mis ventas" />
      </Head>
      <SalesScreen nav={createNav()} />
    </>
  );
}
