import Head from 'expo-router/head';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import { createNav } from '../navigation';

export default function AnalyticsRoute() {
  return (
    <>
      <Head>
        <title>Analytics · TechShield</title>
        <meta name="description" content="Panel de analytics con los eventos registrados por la web." />
      </Head>
      <AnalyticsScreen nav={createNav()} />
    </>
  );
}