import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  FoodizCard,
  FoodizScreen,
  FoodizButton,
  foodizText,
} from '@/components/foodiz-ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

type OrderDetail = {
  id: string;
  status: string;
  payment_status: string;
  final_client_total_cents: number;
  delivery_address: string | null;
  estimated_time_mins: number | null;
  client_latitude: number | null;
  client_longitude: number | null;
  created_at: string;
  restaurant: {
    name: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  order_items: {
    quantity: number;
    total_price_cents: number;
    product: { name: string | null } | null;
  }[];
};

type DeliveryTracking = {
  status: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  estimated_arrival_at: string | null;
  actual_delivery_at: string | null;
  updated_at: string | null;
};

type CourierContact = {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
};

type Coordinate = {
  latitude: number;
  longitude: number;
};

const progress = [
  'pending',
  'preparing',
  'ready',
  'pickup',
  'picked_up',
  'delivering',
  'delivered',
];

const orderStatusLabels: Record<string, string> = {
  pending: 'Commande reçue',
  preparing: 'En préparation',
  ready: 'Prête au restaurant',
  pickup: 'Livreur assigné',
  picked_up: 'Commande récupérée',
  delivering: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

const trackingStatusLabels: Record<string, string> = {
  accepted: 'Livreur en route vers le restaurant',
  at_restaurant: 'Livreur arrivé au restaurant',
  picked_up: 'Commande récupérée',
  in_transit: 'En route vers vous',
  at_customer: 'Livreur arrivé',
  delivered: 'Livrée',
};

function validCoordinate(latitude?: number | null, longitude?: number | null): Coordinate | null {
  if (
    typeof latitude !== 'number'
    || typeof longitude !== 'number'
    || !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
  ) {
    return null;
  }
  return { latitude, longitude };
}

function distanceMeters(from: Coordinate, to: Coordinate) {
  const earthRadius = 6_371_000;
  const toRadians = (value: number) => value * Math.PI / 180;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const startLatitude = toRadians(from.latitude);
  const endLatitude = toRadians(to.latitude);
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(deltaLongitude / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function projectedProgress(start: Coordinate, end: Coordinate, current: Coordinate) {
  const vectorLatitude = end.latitude - start.latitude;
  const vectorLongitude = end.longitude - start.longitude;
  const vectorSize = vectorLatitude ** 2 + vectorLongitude ** 2;
  if (vectorSize <= 0) return 0;
  const ratio = (
    (current.latitude - start.latitude) * vectorLatitude
    + (current.longitude - start.longitude) * vectorLongitude
  ) / vectorSize;
  return Math.max(0, Math.min(1, ratio));
}

function formatDistance(meters: number | null) {
  if (meters === null || !Number.isFinite(meters)) return 'Distance en cours';
  if (meters < 1_000) return `${Math.max(1, Math.round(meters))} m`;
  return `${(meters / 1_000).toFixed(1)} km`;
}

function formatTime(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ClientOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const [courier, setCourier] = useState<CourierContact | null>(null);
  const [deliveryCode, setDeliveryCode] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !session?.user.id) return;
    let active = true;

    const load = async () => {
      const [
        orderResult,
        trackingResult,
        codeResult,
        courierResult,
      ] = await Promise.all([
        supabase
          .from('orders')
          .select(
            'id,status,payment_status,final_client_total_cents,delivery_address,estimated_time_mins,client_latitude,client_longitude,created_at,restaurant:restaurants(name,address,postal_code,city,latitude,longitude),order_items(quantity,total_price_cents,product:products(name))',
          )
          .eq('id', id)
          .eq('client_id', session.user.id)
          .maybeSingle(),
        supabase
          .from('delivery_tracking')
          .select('status,current_latitude,current_longitude,pickup_latitude,pickup_longitude,dropoff_latitude,dropoff_longitude,estimated_arrival_at,actual_delivery_at,updated_at')
          .eq('order_id', id)
          .maybeSingle(),
        supabase
          .from('client_delivery_codes')
          .select('code')
          .eq('order_id', id)
          .eq('client_id', session.user.id)
          .maybeSingle(),
        supabase.rpc('get_client_order_courier_contact', {
          target_order_id: id,
        }),
      ]);
      if (!active) return;
      setOrder(orderResult.data as unknown as OrderDetail | null);
      setTracking(trackingResult.data as DeliveryTracking | null);
      setDeliveryCode(codeResult.data?.code || null);
      setCourier(((courierResult.data || [])[0] || null) as CourierContact | null);
    };

    void load();

    const channel = supabase
      .channel(`mobile-client-tracking:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_tracking',
          filter: `order_id=eq.${id}`,
        },
        () => void load(),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`,
        },
        () => void load(),
      )
      .subscribe();

    const interval = setInterval(() => void load(), 15_000);

    return () => {
      active = false;
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [id, session?.user.id]);

  if (!order) {
    return (
      <FoodizScreen>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Mes commandes</Text>
        </Pressable>
        <FoodizCard>
          <Text style={foodizText.body}>Chargement de la commande…</Text>
        </FoodizCard>
      </FoodizScreen>
    );
  }

  const currentIndex = progress.indexOf(order.status);
  const trackingLabel = tracking?.status
    ? trackingStatusLabels[tracking.status] || tracking.status
    : orderStatusLabels[order.status] || order.status;
  const restaurantPosition = validCoordinate(
    tracking?.pickup_latitude ?? order.restaurant?.latitude,
    tracking?.pickup_longitude ?? order.restaurant?.longitude,
  );
  const clientPosition = validCoordinate(
    tracking?.dropoff_latitude ?? order.client_latitude,
    tracking?.dropoff_longitude ?? order.client_longitude,
  );
  const courierPosition = validCoordinate(
    tracking?.current_latitude,
    tracking?.current_longitude,
  );
  const liveProgress = restaurantPosition && clientPosition && courierPosition
    ? projectedProgress(restaurantPosition, clientPosition, courierPosition)
    : ['picked_up', 'delivering'].includes(order.status)
      ? 0.55
      : order.status === 'delivered'
        ? 1
        : 0.08;
  const remainingMeters = courierPosition && clientPosition
    ? distanceMeters(courierPosition, clientPosition)
    : null;
  const estimatedArrival = formatTime(tracking?.estimated_arrival_at);
  const lastUpdate = formatTime(tracking?.updated_at);
  const liveTrackingAvailable = Boolean(tracking) && ['pickup', 'picked_up', 'delivering', 'delivered'].includes(order.status);
  const courierName = courier?.display_name || courier?.first_name || 'Votre livreur Foodiz';

  return (
    <FoodizScreen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Mes commandes</Text>
      </Pressable>
      <Text style={styles.kicker}>COMMANDE #{order.id.slice(0, 8)}</Text>
      <Text style={foodizText.title}>
        {order.restaurant?.name || 'Commande Foodiz'}
      </Text>
      <Text style={foodizText.body}>
        {order.delivery_address || 'Adresse de livraison enregistrée'}
      </Text>

      <FoodizCard>
        <View style={styles.liveHeader}>
          <View style={styles.livePulse} />
          <View style={styles.liveTitle}>
            <Text style={styles.kicker}>SUIVI LIVE</Text>
            <Text style={foodizText.heading}>{trackingLabel}</Text>
          </View>
        </View>

        {liveTrackingAvailable ? (
          <>
            <View style={styles.liveMap}>
              <View style={styles.routeLine} />
              <View style={[styles.routePoint, styles.restaurantPoint]}>
                <Text style={styles.routePointText}>R</Text>
              </View>
              <View style={[styles.routePoint, styles.clientPoint]}>
                <Text style={styles.routePointText}>C</Text>
              </View>
              <View
                style={[
                  styles.courierDot,
                  {
                    left: `${Math.max(8, Math.min(88, liveProgress * 100))}%`,
                  },
                ]}>
                <Text style={styles.courierDotText}>➤</Text>
              </View>
            </View>

            <View style={styles.liveStats}>
              <View style={styles.liveStat}>
                <Text style={styles.kicker}>Distance</Text>
                <Text style={styles.liveValue}>{formatDistance(remainingMeters)}</Text>
              </View>
              <View style={styles.liveStat}>
                <Text style={styles.kicker}>Arrivée estimée</Text>
                <Text style={styles.liveValue}>{estimatedArrival || 'En calcul'}</Text>
              </View>
            </View>

            <View style={styles.courierCard}>
              <View style={styles.courierAvatar}>
                <Text style={styles.courierAvatarText}>{courierName[0]?.toUpperCase() || 'F'}</Text>
              </View>
              <View style={styles.courierInfo}>
                <Text style={styles.courierName}>{courierName}</Text>
                <Text style={styles.courierMeta}>
                  {lastUpdate ? `Position mise à jour à ${lastUpdate}` : 'Position en attente'}
                </Text>
              </View>
              {courier?.phone ? (
                <Pressable
                  onPress={() => {
                    void Linking.openURL(`tel:${courier.phone}`);
                  }}
                  style={styles.callButton}>
                  <Text style={styles.callButtonText}>Appeler</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : (
          <View style={styles.livePending}>
            <Text style={foodizText.body}>
              Le suivi live s’activera dès qu’un livreur prendra votre commande en charge.
            </Text>
          </View>
        )}
      </FoodizCard>

      <FoodizCard>
        <Text style={foodizText.heading}>Suivi</Text>
        {progress.map((status, index) => (
          <View key={status} style={styles.step}>
            <View
              style={[
                styles.dot,
                index <= currentIndex && styles.dotActive,
              ]}
            />
            <Text
              style={[
                styles.stepText,
                index <= currentIndex && styles.stepTextActive,
              ]}>
              {status}
            </Text>
          </View>
        ))}
      </FoodizCard>

      {deliveryCode && ['pickup', 'picked_up', 'delivering'].includes(order.status) ? (
        <FoodizCard>
          <Text style={styles.kicker}>CODE DE REMISE</Text>
          <Text style={styles.code}>{deliveryCode}</Text>
          <Text style={foodizText.body}>
            Communiquez ce code au livreur uniquement lorsque la commande vous
            est remise.
          </Text>
        </FoodizCard>
      ) : null}

      <FoodizCard>
        {order.order_items.map((item, index) => (
          <View key={`${order.id}-${index}`} style={styles.row}>
            <Text style={foodizText.body}>
              {item.quantity} × {item.product?.name || 'Article'}
            </Text>
            <Text style={styles.value}>
              {(item.total_price_cents / 100).toFixed(2)} €
            </Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={foodizText.heading}>Total payé</Text>
          <Text style={styles.total}>
            {(order.final_client_total_cents / 100).toFixed(2)} €
          </Text>
        </View>
      </FoodizCard>

      {['pickup', 'picked_up', 'delivering'].includes(order.status) ? (
        <FoodizButton
          label="Actualiser le suivi live"
          onPress={() => {
            if (id) {
              router.replace({ pathname: '/client/order/[id]', params: { id } });
            }
          }}
          secondary
        />
      ) : null}
    </FoodizScreen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.gold, fontWeight: '800', paddingVertical: 8 },
  kicker: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  dotActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  stepText: { color: colors.muted, textTransform: 'capitalize' },
  stepTextActive: { color: colors.cream, fontWeight: '800' },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  livePulse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  liveTitle: { flex: 1, gap: 3 },
  liveMap: {
    height: 150,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#0A0A0A',
    overflow: 'hidden',
    justifyContent: 'center',
    marginTop: 6,
  },
  routeLine: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(216,168,79,0.32)',
  },
  routePoint: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantPoint: { left: '7%' },
  clientPoint: { right: '7%' },
  routePointText: {
    color: colors.gold,
    fontWeight: '900',
  },
  courierDot: {
    position: 'absolute',
    width: 44,
    height: 44,
    marginLeft: -22,
    borderRadius: 22,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOpacity: 0.5,
    shadowRadius: 14,
  },
  courierDotText: {
    color: colors.black,
    fontSize: 20,
    fontWeight: '900',
  },
  liveStats: {
    flexDirection: 'row',
    gap: 10,
  },
  liveStat: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(8,8,8,0.38)',
    padding: 12,
    gap: 5,
  },
  liveValue: {
    color: colors.cream,
    fontSize: 17,
    fontWeight: '900',
  },
  courierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  courierAvatar: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: 'rgba(216,168,79,0.14)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierAvatarText: {
    color: colors.gold,
    fontSize: 17,
    fontWeight: '900',
  },
  courierInfo: { flex: 1, gap: 3 },
  courierName: {
    color: colors.cream,
    fontSize: 15,
    fontWeight: '800',
  },
  courierMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  callButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  callButtonText: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 12,
  },
  livePending: {
    borderRadius: 18,
    backgroundColor: 'rgba(8,8,8,0.38)',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  code: {
    color: colors.gold,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 10,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  value: { color: colors.cream, fontWeight: '700' },
  total: { color: colors.gold, fontWeight: '900', fontSize: 20 },
  divider: { height: 1, backgroundColor: colors.border },
});
