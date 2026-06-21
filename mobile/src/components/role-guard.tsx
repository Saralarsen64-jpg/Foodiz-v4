import { Redirect } from 'expo-router';
import type { PropsWithChildren } from 'react';

import { LoadingScreen } from '@/components/loading-screen';
import type { MobileRole } from '@/providers/auth-provider';
import { useAuth } from '@/providers/auth-provider';

export function RoleGuard({
  role,
  children,
}: PropsWithChildren<{ role: MobileRole }>) {
  const { loading, launched, session, profile } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!launched) return <Redirect href="/prelaunch" />;
  if (!session || !profile) return <Redirect href="/login" />;
  if (profile.role !== role) return <Redirect href="/" />;
  return children;
}
