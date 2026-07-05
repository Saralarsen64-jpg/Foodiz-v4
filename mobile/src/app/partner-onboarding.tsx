import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { RoleGuard } from '@/components/role-guard';
import {
  WeelloBrand,
  WeelloButton,
  WeelloCard,
  WeelloField,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import { weelloApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

export default function PartnerOnboardingScreen() {
  const { session } = useAuth();
  const [form, setForm] = useState({
    name: '',
    siret: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    void Promise.all([
      supabase
        .from('restaurants')
        .select('name,siret,phone,address,postal_code,city,description')
        .eq('owner_id', session.user.id)
        .maybeSingle(),
      supabase
        .from('partner_applications')
        .select('business_name,siret,phone,address,postal_code,city,description')
        .eq('user_id', session.user.id)
        .maybeSingle(),
    ]).then(([restaurantResult, applicationResult]) => {
      const source = restaurantResult.data || applicationResult.data;
      if (!source) return;
      setForm({
        name:
          ('name' in source ? source.name : source.business_name)
          || '',
        siret: source.siret || '',
        phone: source.phone || '',
        address: source.address || '',
        postalCode: source.postal_code || '',
        city: source.city || '',
        description: source.description || '',
      });
    });
  }, [session?.user.id]);

  async function submit() {
    const siret = form.siret.replace(/\D/g, '');
    if (
      !form.name.trim()
      || !form.phone.trim()
      || !form.address.trim()
      || !form.city.trim()
      || !/^\d{14}$/.test(siret)
      || !/^\d{5}$/.test(form.postalCode)
    ) {
      Alert.alert(
        'Dossier incomplet',
        'Complétez les informations obligatoires avec un SIRET de 14 chiffres.',
      );
      return;
    }

    setSaving(true);
    try {
      await weelloApi('address-management', {
        method: 'POST',
        body: JSON.stringify({
          action: 'save',
          ...form,
          siret,
        }),
      });
      Alert.alert(
        'Dossier partenaire transmis',
        'Weello vérifiera votre établissement avant son activation.',
      );
      router.replace('/partner-status');
    } catch (error) {
      Alert.alert(
        'Envoi impossible',
        error instanceof Error ? error.message : 'Réessayez.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGuard role="partner">
      <WeelloScreen>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Retour</Text>
        </Pressable>
        <WeelloBrand subtitle="Dossier partenaire" />
        <Text style={weelloText.title}>Votre établissement</Text>
        <Text style={weelloText.body}>
          L’adresse est vérifiée et géocodée côté serveur avant toute
          activation.
        </Text>
        <WeelloField
          value={form.name}
          onChangeText={(name) => setForm((current) => ({ ...current, name }))}
          placeholder="Nom de l’établissement"
          autoCapitalize="words"
        />
        <WeelloField
          value={form.siret}
          onChangeText={(siret) =>
            setForm((current) => ({
              ...current,
              siret: siret.replace(/\D/g, '').slice(0, 14),
            }))
          }
          placeholder="SIRET — 14 chiffres"
          keyboardType="number-pad"
        />
        <WeelloField
          value={form.phone}
          onChangeText={(phone) => setForm((current) => ({ ...current, phone }))}
          placeholder="Téléphone professionnel"
          keyboardType="phone-pad"
        />
        <WeelloField
          value={form.address}
          onChangeText={(address) =>
            setForm((current) => ({ ...current, address }))
          }
          placeholder="Numéro et rue"
          autoCapitalize="words"
        />
        <WeelloField
          value={form.postalCode}
          onChangeText={(postalCode) =>
            setForm((current) => ({
              ...current,
              postalCode: postalCode.replace(/\D/g, '').slice(0, 5),
            }))
          }
          placeholder="Code postal"
          keyboardType="number-pad"
        />
        <WeelloField
          value={form.city}
          onChangeText={(city) => setForm((current) => ({ ...current, city }))}
          placeholder="Ville"
          autoCapitalize="words"
        />
        <WeelloField
          value={form.description}
          onChangeText={(description) =>
            setForm((current) => ({ ...current, description }))
          }
          placeholder="Description de l’établissement"
          autoCapitalize="sentences"
          multiline
        />
        <WeelloCard>
          <Text style={weelloText.body}>
            Les coordonnées bancaires ne sont jamais demandées dans ce
            formulaire. Elles seront configurées séparément lors de
            l’activation des virements.
          </Text>
        </WeelloCard>
        <WeelloButton
          label="Envoyer mon dossier partenaire"
          onPress={() => void submit()}
          loading={saving}
        />
      </WeelloScreen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.gold, fontWeight: '800', paddingVertical: 8 },
});
