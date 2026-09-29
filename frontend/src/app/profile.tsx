import ProfileScreen from '../screens/ProfileScreen';
import { useAuth } from '../context/AuthContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { createNav } from '../navigation';

export default function ProfileRoute() {
  const { session, logout } = useAuth();
  const { reset } = useMarketplace();
  const nav = createNav();

  if (!session) return null;

  return (
    <ProfileScreen
      nav={nav}
      session={session}
      onLogout={async () => {
        await logout();
        reset();
      }}
    />
  );
}