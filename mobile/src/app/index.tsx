import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components/loading-screen';
import { useAuth } from '@/providers/auth-provider';

export default function IndexScreen() {
  const { loading, launched, accessAllowed, session, profile } = useAuth();

  if (loading) return <LoadingScreen label="Ouverture de Foodiz…" />;
  if (!launched && !accessAllowed) return <Redirect href="/prelaunch" />;
  if (!session || !profile) return <Redirect href="/welcome" />;
  if (profile.role === 'client') return <Redirect href="/client" />;
  if (profile.role === 'courier') return <Redirect href="/courier" />;
  if (profile.role === 'partner') return <Redirect href="/partner" />;

  return <Redirect href="/unsupported-role" />;
}
