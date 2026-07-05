import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { RoleGuard } from '@/components/role-guard';
import {
  WeelloBrand,
  WeelloButton,
  WeelloCard,
  WeelloField,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import {
  courierDocumentLabels,
  type CourierDocument,
  type CourierDocumentType,
  loadCourierDocuments,
  uploadCourierDocument,
} from '@/lib/courier-documents';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

const documentTypes = Object.keys(
  courierDocumentLabels,
) as CourierDocumentType[];

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

export default function CourierOnboardingScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    legalName: '',
    siret: '',
    address: '',
    postalCode: '',
    city: '',
    vehicle: 'bike',
    availabilitySlots: [] as string[],
    availabilityDays: [] as string[],
    availabilityFlexible: false,
  });
  const [documents, setDocuments] = useState<CourierDocument[]>([]);
  const [busyDocument, setBusyDocument] =
    useState<CourierDocumentType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    let active = true;
    void Promise.all([
      supabase
        .from('profiles')
        .select('full_name,phone,address,postal_code,city')
        .eq('id', session.user.id)
        .maybeSingle(),
      supabase
        .from('courier_applications')
        .select('legal_name,siret,address,postal_code,city,vehicle_type,availability_slots,availability_days,availability_flexible')
        .eq('user_id', session.user.id)
        .maybeSingle(),
      loadCourierDocuments().catch(() => ({ documents: [] })),
    ]).then(([profileData, applicationData, documentData]) => {
      if (!active) return;
      const userProfile = profileData.data;
      const application = applicationData.data;
      setForm({
        name: userProfile?.full_name || profile?.full_name || '',
        phone: userProfile?.phone || '',
        legalName:
          application?.legal_name
          || userProfile?.full_name
          || profile?.full_name
          || '',
        siret: application?.siret || '',
        address: application?.address || userProfile?.address || '',
        postalCode:
          application?.postal_code || userProfile?.postal_code || '',
        city: application?.city || userProfile?.city || profile?.city || '',
        vehicle: application?.vehicle_type || 'bike',
        availabilitySlots: Array.isArray(application?.availability_slots)
          ? application.availability_slots
          : [],
        availabilityDays: Array.isArray(application?.availability_days)
          ? application.availability_days
          : [],
        availabilityFlexible: Boolean(application?.availability_flexible),
      });
      setDocuments(documentData.documents);
    });
    return () => {
      active = false;
    };
  }, [profile, session?.user.id]);

  const documentByType = useMemo(
    () =>
      Object.fromEntries(
        documents.map((document) => [document.document_type, document]),
      ) as Partial<Record<CourierDocumentType, CourierDocument>>,
    [documents],
  );

  async function refreshDocuments() {
    const data = await loadCourierDocuments();
    setDocuments(data.documents);
    return data.documents;
  }

  async function captureIdentity(documentType: CourierDocumentType) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Appareil photo refusé',
        'Autorisez l’appareil photo pour scanner ce justificatif.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      cameraType: ImagePicker.CameraType.back,
      quality: 0.9,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    await sendDocument(documentType, {
      uri: asset.uri,
      name:
        asset.fileName
        || `${documentType}.${asset.mimeType === 'image/png' ? 'png' : 'jpg'}`,
      mimeType: asset.mimeType || 'image/jpeg',
    });
  }

  async function selectActivityDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    await sendDocument('activity_proof', {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType || 'application/pdf',
    });
  }

  async function sendDocument(
    documentType: CourierDocumentType,
    document: { uri: string; name: string; mimeType: string },
  ) {
    setBusyDocument(documentType);
    try {
      await uploadCourierDocument(documentType, document);
      await refreshDocuments();
      Alert.alert(
        'Justificatif enregistré',
        `${courierDocumentLabels[documentType]} a bien été transmis.`,
      );
    } catch (error) {
      Alert.alert(
        'Dépôt impossible',
        error instanceof Error ? error.message : 'Réessayez.',
      );
    } finally {
      setBusyDocument(null);
    }
  }

  async function saveApplication() {
    if (!session?.user.id) return;
    const siret = form.siret.replace(/\D/g, '');
    if (
      !form.name.trim()
      || !form.phone.trim()
      || !form.legalName.trim()
      || !form.address.trim()
      || !form.city.trim()
      || !/^\d{14}$/.test(siret)
      || !/^\d{5}$/.test(form.postalCode)
      || (
        !form.availabilityFlexible
        && (form.availabilitySlots.length === 0 || form.availabilityDays.length === 0)
      )
    ) {
      Alert.alert(
        'Dossier incomplet',
        'Complétez toutes les informations avec un SIRET, un code postal, vos créneaux et vos jours de disponibilité.',
      );
      return;
    }
    const currentDocuments = await refreshDocuments().catch(() => documents);
    if (
      documentTypes.some(
        (documentType) =>
          !currentDocuments.some(
            (document) => document.document_type === documentType,
          ),
      )
    ) {
      Alert.alert(
        'Justificatifs incomplets',
        'Ajoutez le recto, le verso de votre pièce d’identité et votre justificatif officiel d’activité.',
      );
      return;
    }

    setSaving(true);
    try {
      const profileResult = await supabase
        .from('profiles')
        .update({
          full_name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          postal_code: form.postalCode,
          city: form.city.trim(),
        })
        .eq('id', session.user.id);
      if (profileResult.error) throw profileResult.error;

      const applicationValues = {
        city: form.city.trim(),
        vehicle_type: form.vehicle,
        legal_name: form.legalName.trim(),
        siret,
        address: form.address.trim(),
        postal_code: form.postalCode,
        availability_slots: form.availabilitySlots,
        availability_days: form.availabilityDays,
        availability_flexible: form.availabilityFlexible,
        status: 'pending',
        document_review_status: 'pending_review',
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase
        .from('courier_applications')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      const applicationResult = existing
        ? await supabase
            .from('courier_applications')
            .update(applicationValues)
            .eq('id', existing.id)
        : await supabase.from('courier_applications').insert({
            user_id: session.user.id,
            ...applicationValues,
          });
      if (applicationResult.error) throw applicationResult.error;

      await refreshProfile();
      Alert.alert(
        'Dossier transmis',
        'Weello va contrôler votre identité, votre activité et la concordance du SIRET.',
      );
      router.replace('/courier-status');
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
    <RoleGuard role="courier">
      <WeelloScreen>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Retour</Text>
        </Pressable>
        <WeelloBrand subtitle="Dossier livreur sécurisé" />
        <Text style={weelloText.title}>Votre activité professionnelle</Text>
        <Text style={weelloText.body}>
          Aucune course ni aucun revenu ne sont accessibles avant validation
          manuelle par Weello.
        </Text>

        <WeelloField
          value={form.name}
          onChangeText={(name) => setForm((current) => ({ ...current, name }))}
          placeholder="Nom complet"
          autoCapitalize="words"
        />
        <WeelloField
          value={form.phone}
          onChangeText={(phone) => setForm((current) => ({ ...current, phone }))}
          placeholder="Téléphone"
          keyboardType="phone-pad"
        />
        <WeelloField
          value={form.legalName}
          onChangeText={(legalName) =>
            setForm((current) => ({ ...current, legalName }))
          }
          placeholder="Nom légal / raison sociale"
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
          value={form.address}
          onChangeText={(address) =>
            setForm((current) => ({ ...current, address }))
          }
          placeholder="Adresse professionnelle"
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

        <WeelloCard>
          <Text style={weelloText.heading}>Véhicule</Text>
          <View style={styles.vehicleRow}>
            {[
              ['bike', 'Vélo'],
              ['scooter', 'Scooter'],
              ['motorcycle', 'Moto'],
              ['car', 'Voiture'],
            ].map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() =>
                  setForm((current) => ({ ...current, vehicle: value }))
                }
                style={[
                  styles.vehicle,
                  form.vehicle === value && styles.vehicleActive,
                ]}>
                <Text
                  style={[
                    styles.vehicleText,
                    form.vehicle === value && styles.vehicleTextActive,
                  ]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </WeelloCard>

        <WeelloCard>
          <Text style={weelloText.heading}>Mes disponibilités</Text>
          <Text style={weelloText.body}>
            Indiquez les créneaux et les jours où vous souhaitez travailler.
            Weello utilisera ces préférences pour préparer le dispatch.
          </Text>
          <Pressable
            onPress={() =>
              setForm((current) => ({
                ...current,
                availabilityFlexible: !current.availabilityFlexible,
              }))
            }
            style={[
              styles.flexibleBox,
              form.availabilityFlexible && styles.flexibleBoxActive,
            ]}>
            <Text
              style={[
                styles.vehicleText,
                form.availabilityFlexible && styles.vehicleTextActive,
              ]}>
              Je suis flexible
            </Text>
          </Pressable>
          <Text style={styles.sectionLabel}>Créneaux préférés</Text>
          <View style={styles.vehicleRow}>
            {availabilitySlots.map(([value, label, detail]) => {
              const selected = form.availabilitySlots.includes(value);
              return (
                <Pressable
                  key={value}
                  onPress={() =>
                    setForm((current) => ({
                      ...current,
                      availabilitySlots: toggleValue(
                        current.availabilitySlots,
                        value,
                      ),
                    }))
                  }
                  style={[styles.slot, selected && styles.vehicleActive]}>
                  <Text
                    style={[
                      styles.vehicleText,
                      selected && styles.vehicleTextActive,
                    ]}>
                    {label}
                  </Text>
                  <Text style={[styles.slotDetail, selected && styles.slotDetailActive]}>
                    {detail}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.sectionLabel}>Jours souhaités</Text>
          <View style={styles.vehicleRow}>
            {availabilityDays.map(([value, label]) => {
              const selected = form.availabilityDays.includes(value);
              return (
                <Pressable
                  key={value}
                  onPress={() =>
                    setForm((current) => ({
                      ...current,
                      availabilityDays: toggleValue(
                        current.availabilityDays,
                        value,
                      ),
                    }))
                  }
                  style={[styles.day, selected && styles.vehicleActive]}>
                  <Text
                    style={[
                      styles.vehicleText,
                      selected && styles.vehicleTextActive,
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </WeelloCard>

        <WeelloCard>
          <Text style={weelloText.heading}>Justificatifs obligatoires</Text>
          <Text style={weelloText.body}>
            Photos nettes, sans reflet, avec les quatre bords visibles. Le
            justificatif d’activité peut être une attestation INSEE, un avis
            SIRENE/RNE ou un document officiel équivalent.
          </Text>
          {documentTypes.map((documentType) => {
            const document = documentByType[documentType];
            return (
              <View key={documentType} style={styles.document}>
                <View style={styles.documentText}>
                  <Text style={styles.documentTitle}>
                    {courierDocumentLabels[documentType]}
                  </Text>
                  <Text style={weelloText.body}>
                    {document
                      ? `Statut : ${document.status}${document.review_comment ? ` · ${document.review_comment}` : ''}`
                      : 'Document manquant'}
                  </Text>
                </View>
                <WeelloButton
                  label={
                    documentType === 'activity_proof'
                      ? document
                        ? 'Remplacer'
                        : 'Choisir'
                      : document
                        ? 'Reprendre'
                        : 'Scanner'
                  }
                  onPress={() =>
                    void (documentType === 'activity_proof'
                      ? selectActivityDocument()
                      : captureIdentity(documentType))
                  }
                  loading={busyDocument === documentType}
                  secondary
                />
              </View>
            );
          })}
        </WeelloCard>

        <WeelloButton
          label="Envoyer mon dossier à Weello"
          onPress={() => void saveApplication()}
          loading={saving}
        />
      </WeelloScreen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.gold, fontWeight: '800', paddingVertical: 8 },
  vehicleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vehicle: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  vehicleActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  vehicleText: { color: colors.cream, fontWeight: '700' },
  vehicleTextActive: { color: colors.black },
  flexibleBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
  },
  flexibleBoxActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  sectionLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  slot: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: '30%',
  },
  slotDetail: { color: colors.muted, fontSize: 10, marginTop: 3 },
  slotDetailActive: { color: colors.black },
  day: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  document: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  documentText: { gap: 4 },
  documentTitle: { color: colors.cream, fontWeight: '800', fontSize: 15 },
});
