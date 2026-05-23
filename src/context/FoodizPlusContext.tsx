import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
export type PackName = 'DECOUVERTE' | 'BOOST' | 'DOMINATION';
export type BillingPeriod = 'monthly' | 'yearly';
export type CampaignStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled' | 'failed';
export type CampaignObjective = 'booster_ce_soir' | 'nouveaute' | 'heures_creuses' | 'dessert' | 'menu' | 'reactiver';
export type AudienceType = 'ville_entiere' | 'zone_proche' | 'clients_fideles' | 'clients_inactifs' | 'amateurs_burgers' | 'amateurs_pizzas' | 'amateurs_sushis' | 'amateurs_market' | 'amateurs_desserts';

export interface Subscription {
  id: string;
  partnerId: string;
  packName: PackName;
  billingPeriod: BillingPeriod;
  status: 'active' | 'canceled' | 'past_due';
  campaignsIncluded: number;
  campaignsUsed: number;
  currentPeriodEnd: string;
  stripeSubscriptionId?: string;
}

export interface Campaign {
  id: string;
  partnerId: string;
  title: string;
  message: string;
  objective: CampaignObjective;
  audienceType: AudienceType;
  city: string;
  productIds: string[];
  scheduledAt?: string;
  sentAt?: string;
  status: CampaignStatus;
  recipientsCount: number;
  openedCount: number;
  clickedCount: number;
  ordersGenerated: number;
  estimatedRevenue: number;
  aiGenerated: boolean;
}

interface FoodizPlusContextType {
  subscription: Subscription | null;
  campaigns: Campaign[];
  subscribe: (pack: PackName, period: BillingPeriod) => void;
  createCampaign: (campaign: Omit<Campaign, 'id' | 'partnerId' | 'status' | 'recipientsCount' | 'openedCount' | 'clickedCount' | 'ordersGenerated' | 'estimatedRevenue' | 'aiGenerated'>) => void;
  canCreateCampaign: () => boolean;
  generateCampaignText: (partnerName: string, city: string, objective: CampaignObjective, products: string[]) => string;
}

const FoodizPlusContext = createContext<FoodizPlusContextType | undefined>(undefined);

const PACKS = {
  DECOUVERTE: { monthly: 39.99, yearly: 407.89, campaigns: 8, label: 'Parfait pour commencer' },
  BOOST: { monthly: 79.99, yearly: 815.89, campaigns: 15, label: 'Le plus populaire' },
  DOMINATION: { monthly: 119.99, yearly: 1223.89, campaigns: 25, label: 'Visibilité maximale' },
};

export const FoodizPlusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedSub = localStorage.getItem('foodiz_plus_subscription');
    const savedCamp = localStorage.getItem('foodiz_plus_campaigns');
    if (savedSub) setSubscription(JSON.parse(savedSub));
    if (savedCamp) setCampaigns(JSON.parse(savedCamp));
  }, []);

  useEffect(() => {
    if (subscription) localStorage.setItem('foodiz_plus_subscription', JSON.stringify(subscription));
    localStorage.setItem('foodiz_plus_campaigns', JSON.stringify(campaigns));
  }, [subscription, campaigns]);

  const subscribe = (pack: PackName, period: BillingPeriod) => {
    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (period === 'monthly' ? 1 : 12));
    
    setSubscription({
      id: `sub_${Date.now()}`,
      partnerId: 'partner_1', // Mock partner
      packName: pack,
      billingPeriod: period,
      status: 'active',
      campaignsIncluded: PACKS[pack].campaigns,
      campaignsUsed: 0,
      currentPeriodEnd: endDate.toISOString(),
      stripeSubscriptionId: `stripe_sub_${Date.now()}`
    });
  };

  const canCreateCampaign = () => {
    if (!subscription || subscription.status !== 'active') return false;
    return subscription.campaignsUsed < subscription.campaignsIncluded;
  };

  const createCampaign = (campData: Omit<Campaign, 'id' | 'partnerId' | 'status' | 'recipientsCount' | 'openedCount' | 'clickedCount' | 'ordersGenerated' | 'estimatedRevenue' | 'aiGenerated'>) => {
    if (!canCreateCampaign()) return;
    
    const newCampaign: Campaign = {
      ...campData,
      id: `camp_${Date.now()}`,
      partnerId: 'partner_1',
      status: campData.scheduledAt ? 'scheduled' : 'sent',
      recipientsCount: Math.floor(Math.random() * 500) + 100, // Mock data
      openedCount: 0,
      clickedCount: 0,
      ordersGenerated: 0,
      estimatedRevenue: 0,
      aiGenerated: true
    };

    setCampaigns([newCampaign, ...campaigns]);
    if (subscription) {
      setSubscription({ ...subscription, campaignsUsed: subscription.campaignsUsed + 1 });
    }

    // Push notification to client side
    const clientNotif = {
      id: Date.now(),
      title: campData.title,
      desc: campData.message,
      time: "À l'instant",
      type: "marketing",
      icon: "Gift" // Mock icon
    };
    const existingNotifs = JSON.parse(localStorage.getItem('foodiz_client_notifications') || '[]');
    localStorage.setItem('foodiz_client_notifications', JSON.stringify([clientNotif, ...existingNotifs]));
  };

  const generateCampaignText = (partnerName: string, city: string, objective: CampaignObjective, products: string[]): string => {
    const product = products[0] || 'nos spécialités';
    const templates = {
      booster_ce_soir: `Ce soir à ${city}, ${partnerName} vous réserve une expérience gourmande. ${product} vous attend.`,
      nouveaute: `Une nouveauté exquise vient d'arriver chez ${partnerName}. Découvrez ${product} dès maintenant.`,
      heures_creuses: `Envie d'un moment calme et savoureux ? ${partnerName} vous invite à déguster ${product}.`,
      dessert: `Une envie sucrée ? Le dessert parfait vous attend chez ${partnerName}.`,
      menu: `Laissez-vous tenter par notre menu signature chez ${partnerName}. Une expérience complète.`,
      reactiver: `${partnerName} pense à vous. Revenez savourer ${product} comme avant.`
    };
    return templates[objective] || `Découvrez ${product} chez ${partnerName}.`;
  };

  return (
    <FoodizPlusContext.Provider value={{ subscription, campaigns, subscribe, createCampaign, canCreateCampaign, generateCampaignText }}>
      {children}
    </FoodizPlusContext.Provider>
  );
};

export const useFoodizPlus = () => {
  const context = useContext(FoodizPlusContext);
  if (!context) throw new Error('useFoodizPlus must be used within FoodizPlusProvider');
  return context;
};
