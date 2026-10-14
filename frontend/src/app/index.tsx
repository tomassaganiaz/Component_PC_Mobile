import Head from 'expo-router/head';
import ExploreScreen from '../screens/ExploreScreen';
import { createNav } from '../navigation';

export default function ExploreRoute() {
  return (
    <>
      <Head>
        <title>Explorar · TechShield</title>
        <meta name="description" content="Explora hardware y móviles verificados con auditoría técnica y custodia escrow." />
        <meta property="og:title" content="TechShield — Marketplace Verificado" />
        <meta property="og:description" content="Hardware y móviles chequeados con custodia, auditoría y garantía." />
      </Head>
      <ExploreScreen nav={createNav()} />
    </>
  );
}