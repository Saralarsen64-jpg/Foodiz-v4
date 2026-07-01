import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { RoleGuard } from '@/components/role-guard';
import {
  FoodizBrand,
  FoodizButton,
  FoodizCard,
  FoodizPill,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import {
  loadPartnerDocuments,
  partnerDocumentLabels,
  type PartnerDocument,
  type PartnerDocumentType,
  uploadPartnerDocument,
} from '@/lib/partner-documents';
import { colors } from '@/theme/colors';

const statusLabels: Record<string, string> = {
  pending: 'En contrôle',
  approved: 'Validé',
  rejected: 'Refusé',
  replacement_requested: 'À remplacer',
  expired: 'Expiré',
};

export default function PartnerDocumentsScreen() {
  const [documents, setDocuments] = useState<PartnerDocument[]>([]);
  const [requiredTypes, setRequiredTypes] = useState<PartnerDocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyType, setBusyType] = useState<PartnerDocumentType | null>(null);

  async function load() {
    setLoading(true);
    try {
      const result = await loadPartnerDocuments();
      setDocuments(result.documents || []);
      setRequiredTypes(result.requiredDocumentTypes || []);
    } catch (error) {
      Alert.alert(
        'Dossier indisponible',
        error instanceof Error ? error.message : 'Réessayez.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void loadPartnerDocuments()
      .then((result) => {
        if (!active) return;
        setDocuments(result.documents || []);
        setRequiredTypes(result.requiredDocumentTypes || []);
      })
      .catch((error) => {
        if (!active) return;
        Alert.alert(
          'Dossier indisponible',
          error instanceof Error ? error.message : 'Réessayez.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const byType = useMemo(
    () =>
      Object.fromEntries(
        documents.map((document) => [document.document_type, document]),
      ) as Partial<Record<PartnerDocumentType, PartnerDocument>>,
    [documents],
  );

  async function send(
    documentType: PartnerDocumentType,
    file: { uri: string; name: string; mimeType: string },
  ) {
    setBusyType(documentType);
    try {
      const result = await uploadPartnerDocument(documentType, file);
      await load();
      Alert.alert('Justificatif transmis', result.message);
    } catch (error) {
      Alert.alert(
        'Dépôt impossible',
        error instanceof Error ? error.message : 'Réessayez.',
      );
    } finally {
      setBusyType(null);
    }
  }

  async function photograph(documentType: PartnerDocumentType) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Appareil photo refusé',
        'Autorisez Foodiz à photographier ce justificatif.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      cameraType: ImagePicker.CameraType.back,
      quality: 0.9,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    await send(documentType, {
      uri: asset.uri,
      name:
        asset.fileName
        || `${documentType}.${asset.mimeType === 'image/png' ? 'png' : 'jpg'}`,
      mimeType: asset.mimeType || 'image/jpeg',
    });
  }

  async function chooseFile(documentType: PartnerDocumentType) {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    await send(documentType, {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType || 'application/pdf',
    });
  }

  const complete =
    requiredTypes.length > 0
    && requiredTypes.every((type) =>
      documents.some(
        (document) =>
          document.document_type === type
          && ['pending', 'approved'].includes(document.status),
      ),
    );

  return (
    <RoleGuard role="partner">
      <FoodizScreen>
        <Pressable onPress={() => router.replace('/partner-status')}>
          <Text style={styles.back}>← État de validation</Text>
        </Pressable>
        <FoodizBrand subtitle="Dossier partenaire sécurisé" />
        <Text style={foodizText.title}>Justificatifs professionnels</Text>
        <Text style={foodizText.body}>
          Photographiez un document lisible ou choisissez un PDF. Les fichiers
          restent privés et sont contrôlés par Foodiz.
        </Text>

        {complete ? (
          <FoodizCard>
            <FoodizPill label="Dossier documentaire transmis" tone="success" />
            <Text style={foodizText.body}>
              Vous serez informé après le contrôle de chaque justificatif.
            </Text>
          </FoodizCard>
        ) : null}

        {loading ? (
          <FoodizCard>
            <Text style={foodizText.body}>Chargement du dossier…</Text>
          </FoodizCard>
        ) : (
          requiredTypes.map((documentType) => {
            const document = byType[documentType];
            const needsReplacement =
              !document
              || ['rejected', 'replacement_requested', 'expired'].includes(
                document.status,
              );
            return (
              <FoodizCard key={documentType}>
                <View style={styles.documentHeader}>
                  <View style={styles.documentCopy}>
                    <Text style={foodizText.heading}>
                      {partnerDocumentLabels[documentType]}
                    </Text>
                    <Text style={foodizText.body}>
                      {document?.original_name || 'Aucun fichier transmis'}
                    </Text>
                  </View>
                  <FoodizPill
                    label={
                      document
                        ? statusLabels[document.status] || document.status
                        : 'Requis'
                    }
                    tone={
                      document?.status === 'approved'
                        ? 'success'
                        : needsReplacement
                          ? 'danger'
                          : 'gold'
                    }
                  />
                </View>
                {document?.review_comment ? (
                  <Text style={styles.comment}>
                    Commentaire Foodiz : {document.review_comment}
                  </Text>
                ) : null}
                <View style={styles.actions}>
                  <Pressable
                    disabled={Boolean(busyType)}
                    onPress={() => void photograph(documentType)}
                    style={styles.action}>
                    <Text style={styles.actionText}>Photographier</Text>
                  </Pressable>
                  <Pressable
                    disabled={Boolean(busyType)}
                    onPress={() => void chooseFile(documentType)}
                    style={styles.action}>
                    <Text style={styles.actionText}>Choisir un fichier</Text>
                  </Pressable>
                </View>
                {busyType === documentType ? (
                  <Text style={styles.uploading}>Transfert sécurisé…</Text>
                ) : null}
              </FoodizCard>
            );
          })
        )}

        <FoodizButton
          label="Actualiser mon dossier"
          onPress={() => void load()}
          loading={loading}
          secondary
        />
      </FoodizScreen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.gold, fontWeight: '800', paddingVertical: 8 },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  documentCopy: { flex: 1, gap: 4 },
  actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  action: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  actionText: { color: colors.gold, fontWeight: '800', fontSize: 12 },
  comment: {
    color: colors.cream,
    backgroundColor: 'rgba(216,168,79,0.08)',
    borderRadius: 14,
    padding: 12,
    lineHeight: 19,
  },
  uploading: { color: colors.gold, fontWeight: '700', fontSize: 12 },
});
