import LoginScreen from '../screens/LoginScreen';
import { useAuth } from '../context/AuthContext';

export default function LoginRoute() {
  const { login } = useAuth();
  return <LoginScreen onLogin={login} />;
}