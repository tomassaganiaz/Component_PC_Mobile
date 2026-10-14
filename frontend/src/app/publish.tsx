import Head from 'expo-router/head';
import PublishScreen from '../screens/PublishScreen';
import { createNav } from '../navigation';

export default function PublishRoute() {
  return (
    <>
      <Head>
        <title>Publicar hardware · TechShield</title>
        <meta name="description" content="Publicá tu hardware y móvil para el kit de auditoría gratuito de TechShield." />
        <meta property="og:title" content="TechShield — Publicar hardware" />
      </Head>
      <PublishScreen nav={createNav()} />
    </>
  );
}