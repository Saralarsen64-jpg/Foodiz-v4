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
    title: 'Dossier en cours de vérification',
    description:
      'Weello contrôle votre identité, votre activité et la concordance du SIRET.',
  },
  validated: {
    title: 'Compte livreur validé',
    description: 'Vous pouvez maintenant passer en ligne et recevoir des courses.',
  },
  missing_documents: {
    title: 'Informations complémentaires requises',
    description: 'Consultez le commentaire Weello et complétez votre dossier.',
  },
  rejected: {
    title: 'Dossier non validé',
    description: 'Votre dossier ne permet pas encore d’activer les courses.',
  },
  suspended: {
    title: 'Compte suspendu',
    description: 'Votre accès aux courses est temporairement bloqué.',
  },
};

async function fetchCourierStatus(userId: string) {
  const { data } = await supabase
    .from('courier_applications')
    .select('status,document_review_status,document_review_comment')
    .eq('user_id', userId)
    .maybeSingle();
  return {
    status: data?.status || 'pending',
    documentStatus: data?.document_review_status || 'documents_required',
    comment: data?.document_review_comment || '',
  };
}

export default function CourierStatusScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [status, setStatus] = useState('pending');
  const [documentStatus, setDocumentStatus] = useState('documents_required');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!userId) return;
    setLoading(true);
    const data = await fetchCourierStatus(userId);
    setStatus(data.status);
    setDocumentStatus(data.documentStatus);
    setComment(data.comment);
    setLoading(false);
  }

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchCourierStatus(userId).then((data) => {
      if (!active) return;
      setStatus(data.status);
      setDocumentStatus(data.documentStatus);
      setComment(data.comment);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const current = statusLabels[status] || statusLabels.pending;
  const approved = status === 'validated' && documentStatus === 'approved';
  const needsDocuments = [
    'documents_required',
    'replacement_required',
    'rejected',
  ].includes(documentStatus);

  return (
    <RoleGuard role="courier">
      <WeelloScreen>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={styles.back}>← Accueil</Text>
        </Pressable>
        <WeelloBrand subtitle="Contrôle du dossier" />
        <WeelloCard>
          <Text style={styles.kicker}>STATUT LIVREUR</Text>
          <Text style={weelloText.title}>{current.title}</Text>
          <Text style={weelloText.body}>{current.description}</Text>
          <Text style={styles.status}>
            Dossier : {status} · Documents : {documentStatus}
          </Text>
          {comment ? (
            <Text style={styles.comment}>Commentaire Weello : {comment}</Text>
          ) : null}
        </WeelloCard>
        {approved ? (
          <WeelloButton
            label="Accéder à mon espace livreur"
            onPress={() => router.replace('/courier')}
          />
        ) : null}
        {needsDocuments ? (
          <WeelloButton
            label="Compléter ou remplacer mes justificatifs"
            onPress={() => router.push('/courier-onboarding')}
          />
        ) : null}
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
