import ExploreScreen from '../screens/ExploreScreen';
import { createNav } from '../navigation';

export default function ExploreRoute() {
  return <ExploreScreen nav={createNav()} />;
}