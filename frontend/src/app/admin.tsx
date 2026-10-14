import Head from 'expo-router/head';
import AdminScreen from '../screens/AdminScreen';
import { createNav } from '../navigation';

export default function AdminRoute() {
  return (
    <>
      <Head>
        <title>Panel admin · TechShield</title>
        <meta name="description" content="Resumen de operaciones, quejas y reportes en TechShield." />
        <meta property="og:title" content="TechShield — Panel admin" />
      </Head>
      <AdminScreen nav={createNav()} />
    </>
  );
}
