import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  WeelloBrand,
  WeelloButton,
  WeelloCard,
  WeelloLegalLinks,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import { weelloApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

const availabilitySlots = [
  ['matin', 'Matin', '7h–11h'],
  ['midi', 'Midi', '11h–14h'],
  ['apres_midi', 'Après-midi', '14h–18h'],
  ['soiree', 'Soirée', '18h–23h'],
  ['nuit', 'Nuit', '23h–2h'],
  ['week_end', 'Week-end', 'Sam./Dim.'],
] as const;

const availabilityDays = [
  ['lundi', 'Lun.'],
  ['mardi', 'Mar.'],
  ['mercredi', 'Mer.'],
  ['jeudi', 'Jeu.'],
  ['vendredi', 'Ven.'],
  ['samedi', 'Sam.'],
  ['dimanche', 'Dim.'],
] as const;

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}

export default function CourierAccountScreen() {
  const { profile, signOut } = useAuth();
  const [slots, setSlots] = useState<string[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [flexible, setFlexible] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('courier_applications')
        .select('availability_slots,availability_days,availability_flexible')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!active) return;
      setSlots(Array.isArray(data?.availability_slots) ? data.availability_slots : []);
      setDays(Array.isArray(data?.availability_days) ? data.availability_days : []);
      setFlexible(Boolean(data?.availability_flexible));
    })();
    return () => {
      active = false;
    };
  }, []);

  const saveAvailability = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!flexible && (slots.length === 0 || days.length === 0)) {
      Alert.alert(
        'Disponibilités incomplètes',
        'Choisissez au moins un créneau et un jour, ou activez “Je suis flexible”.',
      );
      return;
    }
    setSavingAvailability(true);
    try {
      const { error } = await supabase
        .from('courier_applications')
        .update({
          availability_slots: slots,
          availability_days: days,
          availability_flexible: flexible,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      if (error) throw error;
      Alert.alert('Disponibilités enregistrées', 'Weello tiendra compte de ces préférences pour préparer le dispatch.');
    } catch (error) {
      Alert.alert(
        'Enregistrement impossible',
        error instanceof Error ? error.message : 'Réessayez dans quelques instants.',
      );
    } finally {
      setSavingAvailability(false);
    }
  };

  const confirmDeletion = () => {
    Alert.alert(
      'Supprimer définitivement le compte',
      'Cette action est irréversible et supprime votre accès Weello.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () =>
            void weelloApi('delete-account', { method: 'POST' })
              .then(() => signOut())
              .catch((error) =>
                Alert.alert(
                  'Suppression impossible',
                  error instanceof Error ? error.message : 'Réessayez plus tard.',
                ),
              ),
        },
      ],
    );
  };

  return (
    <WeelloScreen>
      <WeelloBrand subtitle="Profil livreur" />
      <WeelloCard>
        <Text style={weelloText.heading}>{profile?.full_name || profile?.first_name}</Text>
        <Text style={weelloText.body}>{profile?.email}</Text>
        <Text style={weelloText.body}>{profile?.city || 'Ville non renseignée'}</Text>
      </WeelloCard>

      <WeelloCard>
        <Text style={weelloText.heading}>Mes disponibilités</Text>
        <Text style={weelloText.body}>
          Choisissez les jours et les créneaux où vous souhaitez recevoir des
          courses. Vous pourrez toujours vous mettre hors ligne.
        </Text>

        <Pressable
          onPress={() => setFlexible((current) => !current)}
          style={[styles.flexibleBox, flexible && styles.activeBox]}>
          <Text style={[styles.choiceText, flexible && styles.activeText]}>
            Je suis flexible
          </Text>
          <Text style={[styles.choiceDetail, flexible && styles.activeDetail]}>
            Weello peut me proposer d’autres créneaux si besoin.
          </Text>
        </Pressable>

        <Text style={styles.sectionLabel}>Créneaux préférés</Text>
        <View style={styles.choiceGrid}>
          {availabilitySlots.map(([value, label, detail]) => {
            const selected = slots.includes(value);
            return (
              <Pressable
                key={value}
                onPress={() => setSlots((current) => toggleValue(current, value))}
                style={[styles.slot, selected && styles.activeBox]}>
                <Text style={[styles.choiceText, selected && styles.activeText]}>{label}</Text>
                <Text style={[styles.choiceDetail, selected && styles.activeDetail]}>{detail}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Jours souhaités</Text>
        <View style={styles.choiceGrid}>
          {availabilityDays.map(([value, label]) => {
            const selected = days.includes(value);
            return (
              <Pressable
                key={value}
                onPress={() => setDays((current) => toggleValue(current, value))}
                style={[styles.day, selected && styles.activeBox]}>
                <Text style={[styles.choiceText, selected && styles.activeText]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <WeelloButton
          label="Enregistrer mes disponibilités"
          onPress={() => void saveAvailability()}
          loading={savingAvailability}
        />
      </WeelloCard>

      <WeelloButton
        label="Voir le statut de mon dossier"
        onPress={() => router.push('/courier-status')}
      />
      <WeelloButton
        label="Mettre à jour mes justificatifs"
        onPress={() => router.push('/courier-onboarding')}
        secondary
      />
      <WeelloButton
        label="Centre d’aide Weello"
        onPress={() => router.push('/support' as Href)}
        secondary
      />
      <WeelloButton label="Se déconnecter" onPress={() => void signOut()} secondary />
      <WeelloButton
        label="Supprimer définitivement mon compte"
        onPress={confirmDeletion}
        secondary
      />
      <WeelloLegalLinks />
    </WeelloScreen>
  );
}

const styles = StyleSheet.create({
  flexibleBox: {
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
  },
  activeBox: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  sectionLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slot: {
    minWidth: '30%',
    gap: 3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  day: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  choiceText: {
    color: colors.cream,
    fontWeight: '800',
  },
  choiceDetail: {
    color: colors.muted,
    fontSize: 10,
  },
  activeText: {
    color: colors.black,
  },
  activeDetail: {
    color: colors.black,
  },
});
