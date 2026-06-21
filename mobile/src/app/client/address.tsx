import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import {
  FoodizButton,
  FoodizCard,
  FoodizField,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

export default function AddressScreen() {
  const { session } = useAuth();
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    void supabase
      .from('profiles')
      .select('address,postal_code,city,latitude,longitude')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setAddress(data?.address || '');
        setPostalCode(data?.postal_code || '');
        setCity(data?.city || '');
        setLatitude(data?.latitude === null ? null : Number(data?.latitude));
        setLongitude(data?.longitude === null ? null : Number(data?.longitude));
      });
  }, [session?.user.id]);

  async function locateCurrentPosition() {
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          'Localisation refusée',
          'Autorisez la localisation pour enregistrer des coordonnées fiables.',
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const [place] = await Location.reverseGeocodeAsync(position.coords);

      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
      setAddress(
        [place?.streetNumber, place?.street]
          .filter(Boolean)
          .join(' '),
      );
      setPostalCode(place?.postalCode || '');
      setCity(place?.city || place?.subregion || '');
    } catch {
      Alert.alert('Position indisponible', 'Impossible de déterminer votre adresse.');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!session?.user.id || !address.trim() || !postalCode.trim() || !city.trim()) {
      Alert.alert('Adresse incomplète', 'Renseignez l’adresse, le code postal et la ville.');
      return;
    }
    if (latitude === null || longitude === null) {
      Alert.alert(
        'Coordonnées nécessaires',
        'Utilisez votre position actuelle afin de calculer correctement la livraison.',
      );
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        address: address.trim(),
        postal_code: postalCode.trim(),
        city: city.trim(),
        latitude,
        longitude,
      })
      .eq('id', session.user.id);
    setLoading(false);

    if (error) {
      Alert.alert('Enregistrement impossible', error.message);
      return;
    }
    Alert.alert('Adresse enregistrée', 'Les frais de livraison pourront être calculés.');
    router.back();
  }

  return (
    <FoodizScreen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Retour au compte</Text>
      </Pressable>
      <Text style={foodizText.title}>Adresse de livraison</Text>
      <Text style={foodizText.body}>
        Foodiz ne valide aucune commande sans coordonnées réelles.
      </Text>
      <FoodizCard>
        <Text style={foodizText.heading}>Localisation précise</Text>
        <Text style={foodizText.body}>
          {latitude === null
            ? 'Aucune coordonnée enregistrée.'
            : `Coordonnées enregistrées : ${latitude.toFixed(5)}, ${longitude?.toFixed(5)}`}
        </Text>
        <FoodizButton
          label="Utiliser ma position actuelle"
          onPress={() => void locateCurrentPosition()}
          loading={loading}
          secondary
        />
      </FoodizCard>
      <FoodizField
        value={address}
        onChangeText={setAddress}
        placeholder="Numéro et rue"
        autoCapitalize="words"
      />
      <FoodizField
        value={postalCode}
        onChangeText={setPostalCode}
        placeholder="Code postal"
        keyboardType="number-pad"
      />
      <FoodizField
        value={city}
        onChangeText={setCity}
        placeholder="Ville"
        autoCapitalize="words"
      />
      <FoodizButton label="Enregistrer l’adresse" onPress={() => void save()} loading={loading} />
    </FoodizScreen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.gold, fontWeight: '800', paddingVertical: 8 },
});
