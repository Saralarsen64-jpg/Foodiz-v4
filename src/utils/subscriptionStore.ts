export type PartnerSubscription = {
  id: string;
  partnerId: string;
  packName: "Découverte" | "Boost" | "Domination Locale";
  billingPeriod: "monthly" | "yearly";
  status: "active" | "canceled" | "past_due" | "expired";
  monthlyPrice: number;
  yearlyPrice: number;
  campaignsIncluded: number;
  campaignsUsed: number;
  renewalDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
};

const STORAGE_KEY = "foodiz_partner_subscriptions_v1";

export function loadSubscriptions(): PartnerSubscription[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PartnerSubscription[];
  } catch {
    return [];
  }
}

export function saveSubscriptions(subscriptions: PartnerSubscription[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
}

export function upsertSubscription(subscription: PartnerSubscription) {
  const subs = loadSubscriptions();
  const exists = subs.some((s) => s.partnerId === subscription.partnerId);
  const next = exists ? subs.map((s) => (s.partnerId === subscription.partnerId ? subscription : s)) : [subscription, ...subs];
  saveSubscriptions(next);
}

export function getPartnerSubscription(partnerId: string) {
  return loadSubscriptions().find((s) => s.partnerId === partnerId) || null;
}
