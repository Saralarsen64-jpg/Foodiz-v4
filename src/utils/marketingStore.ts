export type PartnerCampaign = {
  id: string;
  partnerId: string;
  establishmentId: string;
  establishmentName: string;
  title: string;
  message: string;
  productIds: string[];
  status: "draft" | "sent";
  sentAt?: string;
};

export type ClientNotification = {
  id: string;
  title: string;
  text: string;
  time: string;
  type: "order" | "loyalty" | "support" | "campaign";
  establishmentId?: string;
  deepLink?: string;
};

const CAMPAIGNS_KEY = "weello_partner_campaigns_v1";
const CLIENT_NOTIFICATIONS_KEY = "weello_client_notifications_v1";

export function loadCampaigns(): PartnerCampaign[] {
  try {
    const raw = localStorage.getItem(CAMPAIGNS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PartnerCampaign[];
  } catch {
    return [];
  }
}

export function saveCampaigns(campaigns: PartnerCampaign[]) {
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
}

export function loadClientNotifications(): ClientNotification[] {
  try {
    const raw = localStorage.getItem(CLIENT_NOTIFICATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ClientNotification[];
  } catch {
    return [];
  }
}

export function saveClientNotifications(notifications: ClientNotification[]) {
  localStorage.setItem(CLIENT_NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export function sendPartnerCampaign(input: Omit<PartnerCampaign, "id" | "status" | "sentAt">) {
  const campaign: PartnerCampaign = {
    ...input,
    id: `camp-${Date.now()}`,
    status: "sent",
    sentAt: new Date().toLocaleString("fr-FR"),
  };

  const campaigns = loadCampaigns();
  saveCampaigns([campaign, ...campaigns]);

  const notifications = loadClientNotifications();
  const notification: ClientNotification = {
    id: `notif-${Date.now()}`,
    title: campaign.title,
    text: campaign.message,
    time: "À l'instant",
    type: "campaign",
    establishmentId: campaign.establishmentId,
    deepLink: `/client/establishments/${campaign.establishmentId}`,
  };

  saveClientNotifications([notification, ...notifications]);
  return campaign;
}
