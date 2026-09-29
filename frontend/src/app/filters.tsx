import FiltersScreen from '../screens/FiltersScreen';
import { createNav } from '../navigation';

export default function FiltersRoute() {
  return <FiltersScreen nav={createNav()} />;
}