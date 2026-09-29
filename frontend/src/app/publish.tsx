import PublishScreen from '../screens/PublishScreen';
import { createNav } from '../navigation';

export default function PublishRoute() {
  return <PublishScreen nav={createNav()} />;
}