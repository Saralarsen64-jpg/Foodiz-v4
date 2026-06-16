import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BarChart3, CreditCard, Euro, FileText, LifeBuoy, Megaphone, ShoppingBag, Store, Users } from "lucide-react";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

const euros = (cents: number) => `${((cents || 0) / 100).toFixed(2)} €`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, orders: 0, collected: 0, foodiz: 0, tickets: 0, partners: 0, subscriptions: 0, payable: 0, incidents: 0 });
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void (async () => {
    const [users, orders, tickets, partners, subscriptions, balances, payables, ledgerRows] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).neq("role", "admin"),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
      supabase.from("restaurants").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("partner_subscriptions").select("status"),
      supabase.from("admin_financial_account_balances").select("*").single(),
      supabase.from("admin_weekly_payables").select("amount_cents"),
      supabase.from("order_financial_ledger").select("client_collected_cents,foodiz_revenue_cents,partner_cents,courier_earnings_cents,courier_prime_cents,delivery_fee_cents,loyalty_fund_cents,created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    const subscriptionRows = subscriptions.data || [];
    setStats({
      users: users.count || 0,
      orders: orders.count || 0,
      collected: Number(balances.data?.client_collected_cents || 0),
      foodiz: Number(balances.data?.foodiz_revenue_cents || 0),
      tickets: tickets.count || 0,
      partners: partners.count || 0,
      subscriptions: subscriptionRows.filter((row) => ["active", "trialing"].includes(row.status)).length,
      payable: (payables.data || []).reduce((sum, row) => sum + Number(row.amount_cents || 0), 0),
      incidents: subscriptionRows.filter((row) => ["past_due", "unpaid", "incomplete"].includes(row.status)).length,
    });
    setLedger(ledgerRows.data || []);
    setLoading(false);
  })(); }, []);

  const chart = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, offset) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - offset));
      day.setHours(0, 0, 0, 0);
      return { key: day.toISOString().slice(0, 10), label: day.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""), value: 0 };
    });
    for (const row of ledger) {
      const key = new Date(row.created_at).toISOString().slice(0, 10);
      const target = days.find((day) => day.key === key);
      if (target) target.value += Number(row.client_collected_cents || 0);
    }
    const max = Math.max(1, ...days.map((day) => day.value));
    return { days, max };
  }, [ledger]);

  const allocation = useMemo(() => {
    const totals = ledger.reduce((acc, row) => ({
      partner: acc.partner + Number(row.partner_cents || 0),
      courier: acc.courier + Number(row.delivery_fee_cents || 0) + Number(row.courier_earnings_cents || 0) + Number(row.courier_prime_cents || 0),
      foodiz: acc.foodiz + Number(row.foodiz_revenue_cents || 0),
      loyalty: acc.loyalty + Number(row.loyalty_fund_cents || 0),
    }), { partner: 0, courier: 0, foodiz: 0, loyalty: 0 });
    const max = Math.max(1, ...Object.values(totals).map(Number));
    return { totals, max };
  }, [ledger]);

  const cards = [
    ["Utilisateurs", stats.users, Users, "text-blue-400", "/admin"],
    ["Commandes", stats.orders, ShoppingBag, "text-foodiz-gold", "/admin/orders"],
    ["Encaissé clients", euros(stats.collected), Euro, "text-foodiz-green", "/admin/economics"],
    ["À reverser", euros(stats.payable), FileText, "text-amber-300", "/admin/payouts"],
    ["Partenaires actifs", stats.partners, Store, "text-foodiz-cream", "/admin/partner-applications"],
    ["Foodiz+ actifs", stats.subscriptions, CreditCard, "text-foodiz-gold", "/admin/subscriptions"],
    ["Tickets à traiter", stats.tickets, LifeBuoy, "text-foodiz-red", "/admin/support"],
    ["Incidents abonnements", stats.incidents, AlertTriangle, stats.incidents ? "text-foodiz-red" : "text-foodiz-green", "/admin/subscriptions"],
  ] as const;

  return <AdminShell title="Dashboard administrateur" subtitle="Pilotage réel de l’activité, des partenaires et des flux financiers">
    {loading ? <div className="foodiz-card p-8 text-foodiz-gray animate-pulse">Chargement des indicateurs...</div> : <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon, color, path]) => <button key={label} onClick={() => navigate(path)} className="foodiz-card group border-foodiz-gold/15 bg-[radial-gradient(circle_at_top_right,rgba(216,168,79,0.12),transparent_42%)] p-5 text-left shadow-[0_0_45px_rgba(216,168,79,0.04)] transition-all hover:-translate-y-0.5 hover:border-foodiz-gold/35 hover:shadow-[0_0_55px_rgba(216,168,79,0.11)]"><Icon size={20} className={color}/><p className="mt-4 text-[10px] uppercase tracking-widest text-foodiz-gray">{label}</p><p className="mt-2 text-2xl font-semibold text-foodiz-cream">{value}</p></button>)}</section>}

    <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <article className="foodiz-card border-foodiz-gold/20 p-6">
        <div className="mb-6 flex items-center justify-between"><div><h2 className="foodiz-title text-xl">Encaissements 7 jours</h2><p className="mt-1 text-xs text-foodiz-gray">Basé sur le journal financier réel.</p></div><BarChart3 className="text-foodiz-gold"/></div>
        <div className="flex h-56 items-end gap-3">{chart.days.map((day) => <div key={day.key} className="flex flex-1 flex-col items-center gap-2"><span className="text-[9px] text-foodiz-gray">{euros(day.value).replace(",00", "")}</span><div className="w-full rounded-t-2xl border border-foodiz-gold/20 bg-gradient-to-t from-foodiz-gold/70 to-foodiz-gold/10 shadow-[0_0_28px_rgba(216,168,79,0.18)]" style={{ height: `${Math.max(4, (day.value / chart.max) * 100)}%` }}/><span className="text-[10px] capitalize text-foodiz-gray">{day.label}</span></div>)}</div>
      </article>
      <article className="foodiz-card border-foodiz-gold/20 p-6">
        <h2 className="foodiz-title text-xl">Répartition récente</h2><p className="mt-1 text-xs text-foodiz-gray">Sur les 200 dernières écritures.</p>
        <div className="mt-6 space-y-4">{[
          ["Partenaires", allocation.totals.partner],
          ["Livreurs", allocation.totals.courier],
          ["Foodiz", allocation.totals.foodiz],
          ["Fidélité", allocation.totals.loyalty],
        ].map(([label, value]) => <div key={String(label)}><div className="mb-2 flex justify-between text-xs"><span className="text-foodiz-gray">{label}</span><span className="text-foodiz-cream">{euros(Number(value))}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-foodiz-gold shadow-[0_0_20px_rgba(216,168,79,0.45)]" style={{ width: `${Math.max(3, (Number(value) / allocation.max) * 100)}%` }}/></div></div>)}</div>
      </article>
    </section>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{[
      ["Comptabilité", "Répartitions, réserves et journal", "/admin/economics"],
      ["Règlements", "Bordereaux hebdomadaires", "/admin/payouts"],
      ["Support", "Tickets et historique traité", "/admin/support"],
      ["Campagnes", "Foodiz+ et performances", "/admin/marketing-campaigns"],
      ["Diffusion", "Notification globale", "/admin/broadcast"],
    ].map(([title, detail, path]) => <button key={path} onClick={() => navigate(path)} className="foodiz-card p-5 text-left transition-all hover:border-foodiz-gold/35 hover:bg-foodiz-gold/[0.03]"><p className="font-semibold text-foodiz-cream">{title}</p><p className="mt-2 text-xs leading-relaxed text-foodiz-gray">{detail}</p></button>)}</section>
  </AdminShell>;
}
