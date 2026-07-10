import type { PropsWithChildren } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';

export function WeelloStripeProvider({ children }: PropsWithChildren) {
  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
      merchantIdentifier="merchant.app.weello"
      urlScheme="weello">
      <>{children}</>
    </StripeProvider>
  );
}
