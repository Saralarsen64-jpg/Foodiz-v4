import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components/loading-screen';
import { useAuth } from '@/providers/auth-provider';

export default function IndexScreen() {
  const { loading, session, profile } = useAuth();

  if (loading) return <LoadingScreen label="Ouverture de Foodiz…" />;
  if (!session || !profile) return <Redirect href="/login" />;
  if (profile.role === 'client') return <Redirect href="/client" />;
  if (profile.role === 'courier') return <Redirect href="/courier" />;

  return <Redirect href="/unsupported-role" />;
}
