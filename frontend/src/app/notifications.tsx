import Head from 'expo-router/head';
import NotificationsScreen from '../screens/NotificationsScreen';
import { createNav } from '../navigation';

export default function NotificationsRoute() {
  return (
    <>
      <Head>
        <title>Notificaciones · TechShield</title>
        <meta
          name="description"
          content="Tus notificaciones de ventas, envíos y actividad en TechShield."
        />
        <meta property="og:title" content="TechShield — Notificaciones" />
      </Head>
      <NotificationsScreen nav={createNav()} />
    </>
  );
}
