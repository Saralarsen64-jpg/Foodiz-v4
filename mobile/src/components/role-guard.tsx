import { Redirect, type Href } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';

import { LoadingScreen } from '@/components/loading-screen';
import { supabase } from '@/lib/supabase';
import type { MobileRole } from '@/providers/auth-provider';
import { useAuth } from '@/providers/auth-provider';

export function RoleGuard({
  role,
  requireValidated = false,
  children,
}: PropsWithChildren<{ role: MobileRole; requireValidated?: boolean }>) {
  const { loading, launched, accessAllowed, session, profile } = useAuth();
  const [validation, setValidation] = useState<{
    userId: string;
    role: MobileRole;
    redirect: Href | null;
  } | null>(null);
  const userId = session?.user.id;

  useEffect(() => {
    let active = true;

    if (
      !requireValidated
      || loading
      || (!launched && !accessAllowed)
      || !userId
      || profile?.role !== role
    ) {
      return () => {
        active = false;
      };
    }

    void (async () => {
      let redirect: Href | null = null;

      if (role === 'partner') {
        const { data } = await supabase
          .from('restaurants')
          .select('status,is_active')
          .eq('owner_id', userId)
          .maybeSingle();

        redirect = !data
          ? '/partner-onboarding'
          : data.status === 'active' && data.is_active
            ? null
            : '/partner-status';
      }

      if (role === 'courier') {
        const { data } = await supabase
          .from('courier_applications')
          .select('status,document_review_status')
          .eq('user_id', userId)
          .maybeSingle();

        redirect = !data
          ? '/courier-onboarding'
          : data.status === 'validated'
              && data.document_review_status === 'approved'
            ? null
            : ['documents_required', 'replacement_required'].includes(
                  data.document_review_status || '',
                )
              ? '/courier-onboarding'
              : '/courier-status';
      }

      if (active) {
        setValidation({ userId, role, redirect });
      }
    })().catch(() => {
      if (active) {
        setValidation({
          userId,
          role,
          redirect:
            role === 'partner' ? '/partner-status' : '/courier-status',
        });
      }
    });

    return () => {
      active = false;
    };
  }, [
    accessAllowed,
    launched,
    loading,
    profile?.role,
    requireValidated,
    role,
    userId,
  ]);

  const checkingValidation =
    requireValidated
    && Boolean(userId)
    && profile?.role === role
    && (validation?.userId !== userId || validation?.role !== role);

  if (loading || checkingValidation) return <LoadingScreen />;
  if (!launched && !accessAllowed) return <Redirect href="/prelaunch" />;
  if (!session || !profile) return <Redirect href="/login" />;
  if (profile.role !== role) return <Redirect href="/" />;
  if (['suspended', 'rejected'].includes(profile.status || '')) {
    return <Redirect href="/unsupported-role" />;
  }
  if (validation?.redirect) return <Redirect href={validation.redirect} />;
  return children;
}
