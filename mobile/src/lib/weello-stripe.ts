import { useStripe } from '@stripe/stripe-react-native';

export function useWeelloStripe() {
  return useStripe();
}
