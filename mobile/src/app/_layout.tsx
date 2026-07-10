import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts as useInterFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_600SemiBold_Italic,
  PlayfairDisplay_700Bold,
  useFonts as usePlayfairFonts,
} from '@expo-google-fonts/playfair-display';

import { AuthProvider } from '@/providers/auth-provider';
import { CartProvider } from '@/providers/cart-provider';
import { WeelloStripeProvider } from '@/components/weello-stripe-provider';
import { LoadingScreen } from '@/components/loading-screen';
import { colors } from '@/theme/colors';
import '@/lib/delivery-location-task';

export default function RootLayout() {
  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [playfairLoaded] = usePlayfairFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_600SemiBold_Italic,
    PlayfairDisplay_700Bold,
  });

  if (!interLoaded || !playfairLoaded) {
    return <LoadingScreen label="Préparation de Weello…" />;
  }

  return (
    <WeelloStripeProvider>
      <AuthProvider>
        <CartProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'fade',
            }}
          />
        </CartProvider>
      </AuthProvider>
    </WeelloStripeProvider>
  );
}
