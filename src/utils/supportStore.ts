export type SupportRole = "client" | "partner" | "courier";

export type SupportTicket = {
  id: string;
  role: SupportRole;
  subject: string;
  message: string;
  userName: string;
  userPhone?: string;
  orderId?: string;
  city?: string;
  status: "open" | "in_review" | "resolved";
  priority: "low" | "medium" | "high";
  createdAt: string;
};

const STORAGE_KEY = "foodiz_support_tickets_v1";

export function loadSupportTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SupportTicket[];
  } catch {
    return [];
  }
}

export function saveSupportTickets(tickets: SupportTicket[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

export function createSupportTicket(ticket: Omit<SupportTicket, "id" | "createdAt" | "status">) {
  const next: SupportTicket = {
    ...ticket,
    id: `ticket-${Date.now()}`,
    createdAt: new Date().toLocaleString("fr-FR"),
    status: "open",
  };
  const existing = loadSupportTickets();
  saveSupportTickets([next, ...existing]);
  return next;
}
