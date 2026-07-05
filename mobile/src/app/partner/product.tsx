import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  WeelloButton,
  WeelloCard,
  WeelloField,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

export default function PartnerProductScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Plats',
    imageUrl: '',
    active: true,
    promotionActive: false,
    promotionLabel: '',
    promotionPrice: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    let active = true;
    void supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', session.user.id)
      .maybeSingle()
      .then(async ({ data: restaurant }) => {
        if (!active || !restaurant) return;
        setRestaurantId(restaurant.id);
        if (!id) return;
        const { data: product } = await supabase
          .from('products')
          .select(
            'name,description,partner_price_cents,category,image_url,is_active,promotion_label,promotion_partner_price_cents',
          )
          .eq('id', id)
          .eq('restaurant_id', restaurant.id)
          .maybeSingle();
        if (!active || !product) return;
        setForm({
          name: product.name,
          description: product.description || '',
          price: (product.partner_price_cents / 100).toFixed(2),
          category: product.category || 'Plats',
          imageUrl: product.image_url || '',
          active: product.is_active,
          promotionActive: Boolean(product.promotion_partner_price_cents),
          promotionLabel: product.promotion_label || '',
          promotionPrice: product.promotion_partner_price_cents
            ? (product.promotion_partner_price_cents / 100).toFixed(2)
            : '',
        });
      });
    return () => {
      active = false;
    };
  }, [id, session?.user.id]);

  async function selectImage() {
    if (!restaurantId || !session?.user.id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Photos refusées',
        'Autorisez l’accès aux photos pour illustrer votre produit.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const body = await response.arrayBuffer();
      if (body.byteLength <= 0 || body.byteLength > 5 * 1024 * 1024) {
        throw new Error('La photo doit peser moins de 5 Mo.');
      }
      const mimeType = asset.mimeType || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        throw new Error('Utilisez une image JPG, PNG ou WebP.');
      }
      const extension =
        mimeType === 'image/png'
          ? 'png'
          : mimeType === 'image/webp'
            ? 'webp'
            : 'jpg';
      const path = `${session.user.id}/${restaurantId}/products/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const { error } = await supabase.storage
        .from('restaurant-media')
        .upload(path, body, {
          cacheControl: '31536000',
          contentType: mimeType,
          upsert: false,
        });
      if (error) throw error;
      const { data } = supabase.storage
        .from('restaurant-media')
        .getPublicUrl(path);
      setForm((current) => ({ ...current, imageUrl: data.publicUrl }));
    } catch (error) {
      Alert.alert(
        'Photo impossible',
        error instanceof Error ? error.message : 'Réessayez.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!restaurantId) return;
    const parsedPrice = Number(form.price.replace(',', '.'));
    const partnerPriceCents = Math.round(parsedPrice * 100);
    const promotionalPriceCents = form.promotionActive
      ? Math.round(Number(form.promotionPrice.replace(',', '.')) * 100)
      : null;
    if (
      !form.name.trim()
      || !form.category.trim()
      || !Number.isFinite(partnerPriceCents)
      || partnerPriceCents < 50
    ) {
      Alert.alert(
        'Produit incomplet',
        'Renseignez un nom, une catégorie et un prix partenaire valide à partir de 0,50 €.',
      );
      return;
    }
    if (
      form.promotionActive
      && (
        !promotionalPriceCents
        || promotionalPriceCents < 50
        || promotionalPriceCents >= partnerPriceCents
        || form.promotionLabel.trim().length < 2
      )
    ) {
      Alert.alert(
        'Offre incomplète',
        'Ajoutez un libellé et un prix offre compris entre 0,50 € et le prix habituel.',
      );
      return;
    }

    setSaving(true);
    const values = {
      restaurant_id: restaurantId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      partner_price_cents: partnerPriceCents,
      category: form.category.trim(),
      image_url: form.imageUrl || null,
      is_active: form.active,
      promotion_label: form.promotionActive
        ? form.promotionLabel.trim()
        : null,
      promotion_partner_price_cents: promotionalPriceCents,
      promotion_starts_at: null,
      promotion_ends_at: null,
      updated_at: new Date().toISOString(),
    };
    const result = id
      ? await supabase
          .from('products')
          .update(values)
          .eq('id', id)
          .eq('restaurant_id', restaurantId)
      : await supabase.from('products').insert(values);
    setSaving(false);

    if (result.error) {
      Alert.alert('Enregistrement impossible', result.error.message);
      return;
    }
    Alert.alert('Produit enregistré', 'La carte partenaire est à jour.');
    router.back();
  }

  return (
    <WeelloScreen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Retour à la carte</Text>
      </Pressable>
      <Text style={weelloText.title}>
        {id ? 'Modifier le produit' : 'Nouveau produit'}
      </Text>
      <Text style={weelloText.body}>
        Indiquez uniquement votre prix partenaire. Le prix client Weello est
        calculé par le moteur économique côté serveur.
      </Text>

      {form.imageUrl ? (
        <Image source={{ uri: form.imageUrl }} style={styles.image} />
      ) : null}
      <WeelloButton
        label={form.imageUrl ? 'Changer la photo' : 'Ajouter une photo'}
        onPress={() => void selectImage()}
        loading={uploading}
        secondary
      />

      <WeelloField
        value={form.name}
        onChangeText={(name) => setForm((current) => ({ ...current, name }))}
        placeholder="Nom du produit"
        autoCapitalize="sentences"
      />
      <WeelloField
        value={form.description}
        onChangeText={(description) =>
          setForm((current) => ({ ...current, description }))
        }
        placeholder="Description"
        multiline
        autoCapitalize="sentences"
      />
      <WeelloField
        value={form.price}
        onChangeText={(price) => setForm((current) => ({ ...current, price }))}
        placeholder="Prix partenaire en euros — ex. 8,50"
        keyboardType="decimal-pad"
      />
      <WeelloField
        value={form.category}
        onChangeText={(category) =>
          setForm((current) => ({ ...current, category }))
        }
        placeholder="Catégorie — ex. Plats"
        autoCapitalize="words"
      />

      <WeelloCard>
        <Text style={weelloText.heading}>Disponibilité</Text>
        <View style={styles.availability}>
          <Pressable
            style={[styles.choice, form.active && styles.choiceActive]}
            onPress={() =>
              setForm((current) => ({ ...current, active: true }))
            }>
            <Text
              style={[
                styles.choiceText,
                form.active && styles.choiceTextActive,
              ]}>
              Visible
            </Text>
          </Pressable>
          <Pressable
            style={[styles.choice, !form.active && styles.choiceActive]}
            onPress={() =>
              setForm((current) => ({ ...current, active: false }))
            }>
            <Text
              style={[
                styles.choiceText,
                !form.active && styles.choiceTextActive,
              ]}>
              Masqué
            </Text>
          </Pressable>
        </View>
      </WeelloCard>

      <WeelloCard>
        <Text style={weelloText.heading}>Offre partenaire</Text>
        <Text style={weelloText.body}>
          Une offre réduit votre prix partenaire. Weello recalcule ensuite le
          prix client et toute la répartition financière côté serveur.
        </Text>
        <View style={styles.availability}>
          <Pressable
            style={[
              styles.choice,
              form.promotionActive && styles.choiceActive,
            ]}
            onPress={() =>
              setForm((current) => ({
                ...current,
                promotionActive: true,
              }))
            }>
            <Text
              style={[
                styles.choiceText,
                form.promotionActive && styles.choiceTextActive,
              ]}>
              Offre active
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.choice,
              !form.promotionActive && styles.choiceActive,
            ]}
            onPress={() =>
              setForm((current) => ({
                ...current,
                promotionActive: false,
              }))
            }>
            <Text
              style={[
                styles.choiceText,
                !form.promotionActive && styles.choiceTextActive,
              ]}>
              Sans offre
            </Text>
          </Pressable>
        </View>
        {form.promotionActive ? (
          <>
            <WeelloField
              value={form.promotionLabel}
              onChangeText={(promotionLabel) =>
                setForm((current) => ({ ...current, promotionLabel }))
              }
              placeholder="Libellé — ex. Offre découverte"
              autoCapitalize="sentences"
            />
            <WeelloField
              value={form.promotionPrice}
              onChangeText={(promotionPrice) =>
                setForm((current) => ({ ...current, promotionPrice }))
              }
              placeholder="Prix partenaire en offre — ex. 6,90"
              keyboardType="decimal-pad"
            />
          </>
        ) : null}
      </WeelloCard>

      <WeelloButton
        label="Enregistrer le produit"
        onPress={() => void save()}
        loading={saving}
      />
    </WeelloScreen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.gold, fontWeight: '800', paddingVertical: 8 },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  availability: { flexDirection: 'row', gap: 10 },
  choice: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
  },
  choiceActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  choiceText: { color: colors.cream, fontWeight: '800' },
  choiceTextActive: { color: colors.black },
});
