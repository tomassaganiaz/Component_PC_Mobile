import Head from 'expo-router/head';
import CartScreen from '../screens/CartScreen';
import { createNav } from '../navigation';

export default function CartRoute() {
  return (
    <>
      <Head>
        <title>Carrito · TechShield</title>
        <meta name="description" content="Tu carrito de compras con custodia TechShield." />
        <meta property="og:title" content="TechShield — Carrito" />
      </Head>
      <CartScreen nav={createNav()} />
    </>
  );
}
