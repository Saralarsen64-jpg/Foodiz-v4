import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CreditCard, Eye, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

const euros = (cents: number) => `${((cents || 0) / 100).toFixed(2)} €`;

export default function AdminSubscriptions() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("partner_subscriptions").select("*,restaurant:restaurants(id,name,city),plan:foodiz_plus_plans(*)").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setSubscriptions(data || []); setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const summary = useMemo(() => ({
    active: subscriptions.filter((row) => ["active", "trialing"].includes(row.status)).length,
    incidents: subscriptions.filter((row) => ["past_due", "unpaid", "incomplete"].includes(row.status)).length,
    monthlyRecurring: subscriptions.filter((row) => row.status === "active").reduce((sum, row) => sum + (row.billing_period === "yearly" ? Number(row.plan?.yearly_price_cents || 0) / 12 : Number(row.plan?.monthly_price_cents || 0)), 0),
  }), [subscriptions]);

  return <AdminShell title="Abonnements Weello+" subtitle="Souscriptions Stripe, quotas de campagnes et échéances partenaires">
    <section className="grid gap-4 md:grid-cols-3"><article className="weello-card p-5"><p className="text-[10px] uppercase text-weello-gray">Abonnements actifs</p><p className="mt-2 text-3xl text-weello-cream">{summary.active}</p></article><article className="weello-card p-5"><p className="text-[10px] uppercase text-weello-gray">MRR théorique</p><p className="mt-2 text-3xl text-weello-gold">{euros(summary.monthlyRecurring)}</p></article><article className="weello-card p-5"><p className="text-[10px] uppercase text-weello-gray">Incidents de paiement</p><p className={`mt-2 text-3xl ${summary.incidents ? "text-weello-red" : "text-weello-green"}`}>{summary.incidents}</p></article></section>
    <div className="flex justify-end"><button onClick={() => void load()} className="flex items-center gap-2 text-xs text-weello-gold"><RefreshCw size={15}/>Actualiser</button></div>
    {loading ? <div className="weello-card p-8 text-center text-weello-gray animate-pulse">Chargement des souscriptions...</div> : subscriptions.length === 0 ? <div className="weello-card p-5 text-sm text-weello-gray">Aucun abonnement réel enregistré.</div> : <div className="space-y-3">{subscriptions.map((subscription) => {
      const limit = Number(subscription.plan?.monthly_campaign_limit || 0); const used = Number(subscription.campaigns_used_period || 0); const percent = limit ? Math.min(100, (used / limit) * 100) : 0;
      const incident = ["past_due", "unpaid", "incomplete"].includes(subscription.status);
      return <article key={subscription.id} className="weello-card p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex flex-1 items-start gap-3"><div className="rounded-xl bg-weello-gold/10 p-3"><CreditCard size={19} className="text-weello-gold"/></div><div><p className="font-medium text-weello-cream">{subscription.restaurant?.name || "Établissement"} · {subscription.plan?.name || "Forfait inconnu"}</p><p className="mt-1 text-[10px] text-weello-gray">{subscription.restaurant?.city || "Ville inconnue"} · {subscription.billing_period === "yearly" ? `${euros(subscription.plan?.yearly_price_cents)} / an` : `${euros(subscription.plan?.monthly_price_cents)} / mois`} · échéance {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("fr-FR") : "non définie"}</p><p className="mt-1 font-mono text-[9px] text-weello-gray">{subscription.stripe_subscription_id}</p></div></div><span className={`flex items-center gap-1 text-xs uppercase ${incident ? "text-weello-red" : "text-weello-green"}`}>{incident && <AlertTriangle size={14}/>} {subscription.status}</span><button onClick={() => navigate(`/admin/partners/${subscription.restaurant?.id}`)} className="flex items-center justify-center gap-2 rounded-xl border border-weello-gold/20 px-4 py-2 text-xs text-weello-gold"><Eye size={14}/>Partenaire 360°</button></div><div className="mt-4"><div className="mb-2 flex justify-between text-[10px] text-weello-gray"><span>Campagnes consommées sur le cycle</span><span>{used} / {limit}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-weello-gold" style={{ width: `${percent}%` }}/></div></div></article>;
    })}</div>}
  </AdminShell>;
}
