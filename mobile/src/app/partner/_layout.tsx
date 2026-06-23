import { Tabs } from 'expo-router';
import { type ColorValue, Text } from 'react-native';

import { RoleGuard } from '@/components/role-guard';
import { colors } from '@/theme/colors';

const icon = (value: string, color: ColorValue) => (
  <Text style={{ color, fontSize: 18 }}>{value}</Text>
);

export default function PartnerLayout() {
  return (
    <RoleGuard role="partner" requireValidated>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.gold,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 72,
            paddingBottom: 10,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Accueil',
            tabBarIcon: ({ color }) => icon('⌂', color),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Commandes',
            tabBarIcon: ({ color }) => icon('▤', color),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: 'Carte',
            tabBarIcon: ({ color }) => icon('◫', color),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: 'Compte',
            tabBarIcon: ({ color }) => icon('●', color),
          }}
        />
        <Tabs.Screen name="product" options={{ href: null }} />
      </Tabs>
    </RoleGuard>
  );
}
