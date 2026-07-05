import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { RoleGuard } from '@/components/role-guard';
import {
  WeelloBrand,
  WeelloButton,
  WeelloCard,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

const statusLabels: Record<string, { title: string; description: string }> = {
  pending: {
    title: 'Établissement en cours de vérification',
    description: 'Weello contrôle les informations de votre entreprise.',
  },
  validated: {
    title: 'Dossier partenaire validé',
    description: 'L’activation opérationnelle de votre établissement est en cours.',
  },
  active: {
    title: 'Établissement actif',
    description: 'Vous pouvez gérer votre carte et recevoir des commandes.',
  },
  missing_documents: {
    title: 'Informations complémentaires requises',
    description: 'Modifiez votre dossier selon le commentaire Weello.',
  },
  rejected: {
    title: 'Dossier non validé',
    description: 'Votre établissement ne peut pas encore être activé.',
  },
  suspended: {
    title: 'Établissement suspendu',
    description: 'L’accès opérationnel est temporairement bloqué.',
  },
};

async function fetchPartnerStatus(userId: string) {
  const [restaurantResult, applicationResult] = await Promise.all([
    supabase
      .from('restaurants')
      .select('status,is_active')
      .eq('owner_id', userId)
      .maybeSingle(),
    supabase
      .from('partner_applications')
      .select('status,rejection_reason')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  return {
    status:
      restaurantResult.data?.status
      || applicationResult.data?.status
      || 'pending',
    active: Boolean(restaurantResult.data?.is_active),
    comment: applicationResult.data?.rejection_reason || '',
  };
}

export default function PartnerStatusScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [status, setStatus] = useState('pending');
  const [active, setActive] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!userId) return;
    setLoading(true);
    const data = await fetchPartnerStatus(userId);
    setStatus(data.status);
    setActive(data.active);
    setComment(data.comment);
    setLoading(false);
  }

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    void fetchPartnerStatus(userId).then((data) => {
      if (!mounted) return;
      setStatus(data.status);
      setActive(data.active);
      setComment(data.comment);
    });
    return () => {
      mounted = false;
    };
  }, [userId]);

  const operational = status === 'active' && active;
  const current =
    statusLabels[operational ? 'active' : status] || statusLabels.pending;

  return (
    <RoleGuard role="partner">
      <WeelloScreen>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={styles.back}>← Accueil</Text>
        </Pressable>
        <WeelloBrand subtitle="Validation partenaire" />
        <WeelloCard>
          <Text style={styles.kicker}>STATUT ÉTABLISSEMENT</Text>
          <Text style={weelloText.title}>{current.title}</Text>
          <Text style={weelloText.body}>{current.description}</Text>
          <Text style={styles.status}>
            Statut : {status} · Publication : {active ? 'active' : 'inactive'}
          </Text>
          {comment ? (
            <Text style={styles.comment}>Commentaire Weello : {comment}</Text>
          ) : null}
        </WeelloCard>
        {operational ? (
          <WeelloButton
            label="Accéder à mon espace partenaire"
            onPress={() => router.replace('/partner')}
          />
        ) : (
          <WeelloButton
            label="Modifier mon dossier"
            onPress={() => router.push('/partner-onboarding')}
          />
        )}
        <WeelloButton
          label="Actualiser le statut"
          onPress={() => void load()}
          loading={loading}
          secondary
        />
      </WeelloScreen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.gold, fontWeight: '800', paddingVertical: 8 },
  kicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  status: { color: colors.gold, fontWeight: '800', fontSize: 12 },
  comment: {
    color: colors.cream,
    backgroundColor: 'rgba(216,168,79,0.08)',
    borderRadius: 14,
    padding: 14,
    lineHeight: 20,
  },
});
