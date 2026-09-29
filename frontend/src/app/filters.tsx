import Head from 'expo-router/head';
import FiltersScreen from '../screens/FiltersScreen';
import { createNav } from '../navigation';

export default function FiltersRoute() {
  return (
    <>
      <Head>
        <title>Filtros de seguridad · TechShield</title>
        <meta name="description" content="Filtros de seguridad del vendedor, chequeo del producto, garantía y custodia." />
        <meta property="og:title" content="TechShield — Filtros de seguridad" />
      </Head>
      <FiltersScreen nav={createNav()} />
    </>
  );
}