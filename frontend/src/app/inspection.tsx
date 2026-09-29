import { useLocalSearchParams } from 'expo-router';
import InspectionScreen from '../screens/InspectionScreen';
import { createNav } from '../navigation';

export default function InspectionRoute() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  return (
    <InspectionScreen
      nav={createNav()}
      orderId={typeof orderId === 'string' ? orderId : undefined}
    />
  );
}