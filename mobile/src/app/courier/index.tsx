import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  FoodizActionCard,
  FoodizBrand,
  FoodizButton,
  FoodizCard,
  FoodizHero,
  FoodizMetric,
  FoodizPill,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';
import { updateCourierPresence } from '@/lib/courier-presence';

export default function CourierDashboardScreen() {
  const { profile, session } = useAuth();
  const [applicationStatus, setApplicationStatus] = useState('pending');
  const [documentStatus, setDocumentStatus] = useState('documents_required');
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    void Promise.all([
      supabase
        .from('courier_applications')
        .select('status,document_review_status')
        .eq('user_id', session.user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('courier_online')
        .eq('id', session.user.id)
        .single(),
    ]).then(([application, courierProfile]) => {
      setApplicationStatus(application.data?.status || 'pending');
      setDocumentStatus(application.data?.document_review_status || 'documents_required');
      setOnline(Boolean(courierProfile.data?.courier_online));
    });
  }, [session?.user.id]);

  async function toggleOnline() {
    if (
      !session?.user.id
      || applicationStatus !== 'validated'
      || documentStatus !== 'approved'
    ) {
      Alert.alert(
        'Compte en attente',
        'Votre dossier doit être validé par Foodiz avant de recevoir des livraisons.',
      );
      return;
    }

    const nextOnline = !online;
    try {
      await updateCourierPresence(nextOnline);
    } catch (error) {
      Alert.alert(
        'Mise à jour impossible',
        error instanceof Error ? error.message : 'Position indisponible.',
      );
      return;
    }
    setOnline(nextOnline);
  }

  const validated = applicationStatus === 'validated' && documentStatus === 'approved';
  const statusLabel = validated
    ? online
      ? 'En ligne'
      : 'Validé'
    : 'En vérification';

  return (
    <FoodizScreen>
      <FoodizBrand subtitle="Espace livreur" />
      <FoodizHero
        eyebrow="Pilotage livreur"
        title={`Bonjour ${profile?.first_name || 'Livreur'}`}
        body={
          validated
            ? 'Passez en ligne quand vous êtes disponible. Foodiz privilégie les positions précises, les délais tenus et les dossiers fiables.'
            : 'Votre espace est prêt, mais Foodiz doit terminer la vérification avant de vous proposer des courses.'
        }>
        <View style={styles.metrics}>
          <FoodizMetric
            label="Statut"
            value={online ? 'Live' : 'Off'}
            helper={online ? 'visible pour le dispatch' : 'aucune course proposée'}
            tone={online ? 'success' : 'muted'}
          />
          <FoodizMetric
            label="Dossier"
            value={validated ? 'OK' : 'À valider'}
            helper={documentStatus}
            tone={validated ? 'success' : 'muted'}
          />
        </View>
      </FoodizHero>

      <FoodizCard>
        <View style={styles.statusRow}>
          <Text style={styles.kicker}>STATUT DU DOSSIER</Text>
          <FoodizPill
            label={statusLabel}
            tone={validated ? (online ? 'success' : 'gold') : 'muted'}
          />
        </View>
        <Text style={foodizText.heading}>
          {validated ? 'Prêt à recevoir des courses' : 'Validation en cours'}
        </Text>
        <Text style={foodizText.body}>
          {validated
            ? 'Votre compte est validé. Passez en ligne pour voir les courses.'
            : 'Foodiz doit vérifier votre dossier et vos documents avant votre première livraison.'}
        </Text>
      </FoodizCard>

      <FoodizButton
        label={online ? 'Passer hors ligne' : 'Passer en ligne'}
        onPress={toggleOnline}
        secondary={online}
      />

      <FoodizCard>
        <Text style={styles.kicker}>RÈGLES DE COURSE</Text>
        <Text style={foodizText.heading}>Tout doit être clair avant de partir.</Text>
        <View style={styles.rules}>
          <Text style={styles.rule}>• Présentez le numéro de commande au restaurant.</Text>
          <Text style={styles.rule}>• Le chrono démarre après “Commande récupérée”.</Text>
          <Text style={styles.rule}>• L’écran de course affiche gain max, gain mini et retard.</Text>
        </View>
      </FoodizCard>

      <View style={styles.actions}>
        <FoodizActionCard
          icon="⚡"
          title="Courses disponibles"
          description="Affiche les commandes prêtes à être attribuées autour de vous."
          badge={online ? 'Live' : undefined}
          onPress={() => router.push('/courier/deliveries')}
        />
        <FoodizActionCard
          icon="🧭"
          title="Course active"
          description="Guidage, étapes sécurisées, code client et mise à jour GPS."
          onPress={() => router.push('/courier/current')}
        />
        <FoodizActionCard
          icon="€"
          title="Gains"
          description="Suivez vos revenus, primes et règlements Foodiz."
          onPress={() => router.push('/courier/earnings')}
        />
        <FoodizActionCard
          icon="🗓️"
          title="Mes disponibilités"
          description="Mettez à jour vos jours, créneaux et flexibilité."
          onPress={() => router.push('/courier/account')}
        />
      </View>
    </FoodizScreen>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actions: {
    gap: 10,
  },
  rules: {
    gap: 8,
    marginTop: 12,
  },
  rule: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  kicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
});
