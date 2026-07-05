import { useStripe } from '@stripe/stripe-react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  WeelloButton,
  WeelloCard,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import { weelloApi } from '@/lib/api';
import { useCart } from '@/providers/cart-provider';
import { colors } from '@/theme/colors';

type Quote = {
  items: {
    productId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    totalPriceCents: number;
  }[];
  clientItemsTotalCents: number;
  serviceFeeCents: number;
  deliveryFeeCents: number;
  advantageDiscountCents: number;
  finalClientTotalCents: number;
  distanceKm: number;
};

export default function CheckoutScreen() {
  const { restaurantId, items, clear } = useCart();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);

  const cartPayload = useCallback(
    () => ({
      restaurantId,
      useAdvantage: false,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    }),
    [items, restaurantId],
  );

  useEffect(() => {
    if (!restaurantId || items.length === 0) return;
    let active = true;
    void weelloApi<{ quote: Quote }>('create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ ...cartPayload(), quoteOnly: true }),
    })
      .then((data) => {
        if (active) setQuote(data.quote);
      })
      .catch((error) =>
        Alert.alert(
          'Commande impossible',
          error instanceof Error ? error.message : 'Vérifiez votre adresse.',
        ),
      );
    return () => {
      active = false;
    };
  }, [cartPayload, items.length, restaurantId]);

  async function pay() {
    if (!quote || !restaurantId) return;
    const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey) {
      Alert.alert(
        'Stripe non configuré',
        'Ajoutez EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY dans mobile/.env.',
      );
      return;
    }
    if (__DEV__ && stripeKey.startsWith('pk_live_')) {
      Alert.alert(
        'Paiement réel désactivé',
        'Weello utilise actuellement une clé Stripe Live. Les paiements sont volontairement bloqués pendant le développement.',
      );
      return;
    }

    setLoading(true);
    try {
      const payment = await weelloApi<{
        orderId: string;
        clientSecret?: string;
        url?: string;
      }>('create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          ...cartPayload(),
          paymentMode: 'mobile',
          expectedTotalCents: quote.finalClientTotalCents,
        }),
      });

      if (!payment.clientSecret) {
        clear();
        router.replace('/client/orders');
        return;
      }

      const initResult = await initPaymentSheet({
        merchantDisplayName: 'Weello',
        paymentIntentClientSecret: payment.clientSecret,
        returnURL: 'weello://stripe-redirect',
        style: 'alwaysDark',
        defaultBillingDetails: {},
        applePay: { merchantCountryCode: 'FR' },
        googlePay: {
          merchantCountryCode: 'FR',
          currencyCode: 'EUR',
          testEnv: !stripeKey.startsWith('pk_live_'),
        },
      });
      if (initResult.error) throw new Error(initResult.error.message);

      const result = await presentPaymentSheet();
      if (result.error) {
        if (result.error.code === 'Canceled') {
          await weelloApi('cancel-mobile-order', {
            method: 'POST',
            body: JSON.stringify({ orderId: payment.orderId }),
          });
          return;
        }
        throw new Error(result.error.message);
      }

      clear();
      Alert.alert(
        'Paiement envoyé',
        'Stripe confirme votre paiement. Votre commande apparaîtra dans quelques secondes.',
      );
      router.replace('/client/orders');
    } catch (error) {
      Alert.alert(
        'Paiement impossible',
        error instanceof Error ? error.message : 'Une erreur est survenue.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <WeelloScreen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Retour au panier</Text>
      </Pressable>
      <Text style={weelloText.title}>Paiement sécurisé</Text>
      <Text style={weelloText.body}>
        Tous les montants ci-dessous sont recalculés par le serveur Weello.
      </Text>

      {!quote ? (
        <WeelloCard>
          <Text style={weelloText.body}>Calcul de la commande…</Text>
        </WeelloCard>
      ) : (
        <>
          <WeelloCard>
            {quote.items.map((item) => (
              <View key={item.productId} style={styles.row}>
                <Text style={weelloText.body}>
                  {item.quantity} × {item.name}
                </Text>
                <Text style={styles.value}>
                  {(item.totalPriceCents / 100).toFixed(2)} €
                </Text>
              </View>
            ))}
          </WeelloCard>
          <WeelloCard>
            <Line label="Prix des articles" cents={quote.clientItemsTotalCents} />
            <Line label="Frais de service" cents={quote.serviceFeeCents} />
            <Line
              label={`Livraison · ${quote.distanceKm.toFixed(1)} km`}
              cents={quote.deliveryFeeCents}
            />
            <View style={styles.divider} />
            <Line label="Total à payer" cents={quote.finalClientTotalCents} strong />
          </WeelloCard>
          <WeelloButton
            label={`Payer ${(quote.finalClientTotalCents / 100).toFixed(2)} €`}
            onPress={() => void pay()}
            loading={loading}
          />
        </>
      )}
    </WeelloScreen>
  );
}

function Line({
  label,
  cents,
  strong,
}: {
  label: string;
  cents: number;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={strong ? weelloText.heading : weelloText.body}>{label}</Text>
      <Text style={strong ? styles.total : styles.value}>
        {(cents / 100).toFixed(2)} €
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.gold, fontWeight: '800', paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  value: { color: colors.cream, fontWeight: '700' },
  total: { color: colors.gold, fontSize: 21, fontWeight: '900' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
});
