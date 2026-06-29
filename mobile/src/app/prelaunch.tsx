import { Redirect } from 'expo-router';

// Legacy deep links now enter the public authentication journey.
export default function LegacyPrelaunchRedirect() {
  return <Redirect href="/welcome" />;
}
