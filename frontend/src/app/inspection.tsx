import Head from 'expo-router/head';
import { useLocalSearchParams } from 'expo-router';
import InspectionScreen from '../screens/InspectionScreen';
import { createNav } from '../navigation';

export default function InspectionRoute() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  return (
    <>
      <Head>
        <title>Seguimiento en custodia · TechShield</title>
        <meta name="description" content="Seguimiento de tu compra con custodia escrow, inspección técnica y protección TechShield." />
        <meta property="og:title" content="TechShield — Seguimiento de compra" />
      </Head>
      <InspectionScreen
        nav={createNav()}
        orderId={typeof orderId === 'string' ? orderId : undefined}
      />
    </>
  );
}