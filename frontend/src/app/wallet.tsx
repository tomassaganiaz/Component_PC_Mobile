import Head from 'expo-router/head';
import WalletScreen from '../screens/WalletScreen';
import { createNav } from '../navigation';

export default function WalletRoute() {
  return (
    <>
      <Head>
        <title>Mis ingresos · TechShield</title>
        <meta name="description" content="Saldo, movimientos y retiros del vendedor en TechShield." />
        <meta property="og:title" content="TechShield — Mis ingresos" />
      </Head>
      <WalletScreen nav={createNav()} />
    </>
  );
}
