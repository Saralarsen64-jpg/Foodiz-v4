import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  FoodizBrand,
  FoodizCard,
  foodizText,
} from '@/components/foodiz-ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

type Reward = {
  id: string;
  title: string;
  description: string | null;
  reward_code: string;
  status: string;
  expires_at: string;
};

async function fetchBenefits(userId: string) {
  const [walletResult, rewardsResult] = await Promise.all([
    supabase
      .from('client_wallets')
      .select('points_balance,loyalty_tier')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('client_rewards')
      .select('id,title,description,reward_code,status,expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);
  return {
    points: walletResult.data?.points_balance || 0,
    tier: walletResult.data?.loyalty_tier || 'bronze',
    rewards: (rewardsResult.data || []) as Reward[],
  };
}

export default function ClientBenefitsScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [points, setPoints] = useState(0);
  const [tier, setTier] = useState('bronze');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!userId) return;
    setRefreshing(true);
    const data = await fetchBenefits(userId);
    setPoints(data.points);
    setTier(data.tier);
    setRewards(data.rewards);
    setRefreshing(false);
  }

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchBenefits(userId).then((data) => {
      if (!active) return;
      setPoints(data.points);
      setTier(data.tier);
      setRewards(data.rewards);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <View style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={load}
            tintColor={colors.gold}
          />
        }>
        <FoodizBrand subtitle="Foodiz Club" />
        <FoodizCard>
          <Text style={styles.kicker}>VOTRE SOLDE</Text>
          <Text style={styles.points}>{points} points</Text>
          <Text style={foodizText.body}>
            Niveau {tier}. Vos points donnent accès à des avantages Foodiz ;
            ils ne sont jamais présentés comme une réduction monétaire directe.
          </Text>
        </FoodizCard>

        <Text style={foodizText.heading}>Mes avantages</Text>
        {rewards.length === 0 ? (
          <FoodizCard>
            <Text style={foodizText.heading}>Aucun avantage disponible</Text>
            <Text style={foodizText.body}>
              Continuez à commander pour faire progresser votre fidélité.
            </Text>
          </FoodizCard>
        ) : (
          rewards.map((reward) => (
            <FoodizCard key={reward.id}>
              <View style={styles.row}>
                <Text style={foodizText.heading}>{reward.title}</Text>
                <Text style={styles.status}>{reward.status}</Text>
              </View>
              <Text style={foodizText.body}>{reward.description}</Text>
              <Text style={styles.code}>{reward.reward_code}</Text>
              <Text style={foodizText.body}>
                Expire le{' '}
                {new Date(reward.expires_at).toLocaleDateString('fr-FR')}
              </Text>
            </FoodizCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, gap: 18, padding: 24 },
  kicker: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  points: { color: colors.cream, fontSize: 38, fontWeight: '900' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  status: { color: colors.success, fontSize: 11, fontWeight: '900' },
  code: {
    color: colors.gold,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
