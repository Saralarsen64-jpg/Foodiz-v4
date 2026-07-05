import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Ban, BarChart3, Building2, CheckCircle2, CreditCard, FileClock, Mail, MapPin, Phone, ReceiptText, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

const euros = (cents: number | null | undefined) => `${(Number(cents || 0) / 100).toFixed(2)} €`;
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString("fr-FR") : "Non défini";

export default function AdminPartnerDetail() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: restaurantRow, error } = await supabase.from("restaurants").select("*").eq("id", id).single();
    if (error || !restaurantRow) { toast.error(error?.message || "Partenaire introuvable"); setLoading(false); return; }
    setRestaurant(restaurantRow);
    const [ownerResult, applicationResult, subscriptionResult, ledgerResult, campaignResult, statementResult, auditResult] = await Promise.all([
      supabase.from("profiles").select("id,first_name,last_name,full_name,email,phone,address,postal_code,city,status,created_at").eq("id", restaurantRow.owner_id).single(),
      supabase.from("partner_applications").select("*").eq("user_id", restaurantRow.owner_id).maybeSingle(),
      supabase.from("partner_subscriptions").select("*,plan:foodiz_plus_plans(*)").eq("restaurant_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("order_financial_ledger").select("*").eq("restaurant_id", id).order("created_at", { ascending: false }).limit(250),
      supabase.from("marketing_campaigns").select("*").eq("restaurant_id", id).order("created_at", { ascending: false }).limit(100),
      supabase.from("settlement_statements").select("*").eq("beneficiary_id", restaurantRow.owner_id).order("generated_at", { ascending: false }).limit(50),
      supabase.from("admin_audit_log").select("*").eq("entity_type", "restaurant").eq("entity_id", id).order("created_at", { ascending: false }).limit(50),
    ]);
    setOwner(ownerResult.data); setApplication(applicationResult.data); setSubscription(subscriptionResult.data);
    setLedger(ledgerResult.data || []); setCampaigns(campaignResult.data || []); setStatements(statementResult.data || []); setAudit(auditResult.data || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [id]);

  const metrics = useMemo(() => {
    const paid = ledger.filter((row) => row.payment_status === "completed");
    const delivered = paid.filter((row) => row.order_status === "delivered");
    return {
      orders: delivered.length,
      collected: paid.reduce((sum, row) => sum + Number(row.client_collected_cents || 0), 0),
      partner: delivered.reduce((sum, row) => sum + Number(row.partner_cents || 0), 0),
      foodiz: paid.reduce((sum, row) => sum + Number(row.foodiz_revenue_cents || 0), 0),
      average: delivered.length ? delivered.reduce((sum, row) => sum + Number(row.client_collected_cents || 0), 0) / delivered.length : 0,
    };
  }, [ledger]);

  const updateStatus = async (status: string) => {
    let reason = "";
    if (["suspended", "rejected", "missing_documents"].includes(status)) {
      reason = window.prompt("Motif obligatoire, conservé dans le journal d’audit :")?.trim() || "";
      if (!reason) return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_partner_status", { target_restaurant_id: id, target_status: status, target_reason: reason || null });
    if (error) toast.error(error.message); else { toast.success("Statut mis à jour."); await load(); }
    setBusy(false);
  };

  if (loading) return <AdminShell title="Vue partenaire 360°"><div className="foodiz-card p-8 text-foodiz-gray animate-pulse">Chargement du dossier complet...</div></AdminShell>;
  if (!restaurant) return <AdminShell title="Partenaire introuvable"><div className="foodiz-card p-6 text-foodiz-gray">Ce dossier n’est pas accessible.</div></AdminShell>;

  const ownerName = owner?.full_name || [owner?.first_name, owner?.last_name].filter(Boolean).join(" ") || "Responsable non renseigné";
  return <AdminShell title={restaurant.name} subtitle="Vue 360° partenaire, souscription, activité, règlements et conformité">
    <section className="foodiz-card p-5"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start"><div><div className="flex items-center gap-3"><Building2 className="text-foodiz-gold"/><h2 className="text-xl font-semibold">{restaurant.name}</h2><span className={`rounded-full px-3 py-1 text-[10px] uppercase ${restaurant.status === "active" ? "bg-foodiz-green/10 text-foodiz-green" : "bg-foodiz-red/10 text-foodiz-red"}`}>{restaurant.status}</span></div><div className="mt-4 grid gap-2 text-xs text-foodiz-gray sm:grid-cols-2"><p className="flex items-center gap-2"><ShieldCheck size={14}/>SIRET {restaurant.siret || "manquant"}</p><p className="flex items-center gap-2"><MapPin size={14}/>{restaurant.address || application?.address || "Adresse manquante"}, {restaurant.city || application?.city || "ville manquante"}</p><p className="flex items-center gap-2"><Mail size={14}/>{owner?.email || application?.email || "Email manquant"}</p><p className="flex items-center gap-2"><Phone size={14}/>{owner?.phone || application?.phone || "Téléphone manquant"}</p></div><p className="mt-4 text-sm text-foodiz-cream">Responsable : {ownerName}</p>{application?.rejection_reason && <p className="mt-2 text-xs text-foodiz-red">Dernier motif : {application.rejection_reason}</p>}</div><div className="flex flex-wrap gap-2">{restaurant.status !== "active" && <button disabled={busy} onClick={() => void updateStatus("active")} className="flex items-center gap-2 rounded-xl bg-foodiz-green/10 px-4 py-2 text-xs text-foodiz-green"><CheckCircle2 size={15}/>Activer</button>}{restaurant.status === "active" && <button disabled={busy} onClick={() => void updateStatus("suspended")} className="flex items-center gap-2 rounded-xl bg-foodiz-red/10 px-4 py-2 text-xs text-foodiz-red"><Ban size={15}/>Suspendre</button>}</div></div></section>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{[
      ["Commandes livrées", metrics.orders], ["Encaissé clients", euros(metrics.collected)], ["Dû partenaire", euros(metrics.partner)], ["Revenu Weello", euros(metrics.foodiz)], ["Panier moyen", euros(metrics.average)],
    ].map(([label, value]) => <article key={String(label)} className="foodiz-card p-4"><p className="text-[10px] uppercase tracking-wider text-foodiz-gray">{label}</p><p className="mt-2 text-xl font-semibold text-foodiz-cream">{value}</p></article>)}</section>

    <section className="grid gap-5 xl:grid-cols-2"><article className="foodiz-card p-5"><h2 className="flex items-center gap-2 text-lg font-semibold"><CreditCard size={18} className="text-foodiz-gold"/>Abonnement Weello+</h2>{subscription ? <div className="mt-4 space-y-3 text-xs"><div className="flex justify-between"><span className="text-foodiz-gray">Forfait</span><span>{subscription.plan?.name} · {subscription.billing_period === "yearly" ? "Annuel" : "Mensuel"}</span></div><div className="flex justify-between"><span className="text-foodiz-gray">Statut Stripe</span><span className="uppercase text-foodiz-gold">{subscription.status}</span></div><div className="flex justify-between"><span className="text-foodiz-gray">Campagnes du cycle</span><span>{subscription.campaigns_used_period || 0} / {subscription.plan?.monthly_campaign_limit || 0}</span></div><div className="flex justify-between"><span className="text-foodiz-gray">Renouvellement</span><span>{date(subscription.current_period_end)}</span></div><div className="flex justify-between"><span className="text-foodiz-gray">Identifiant Stripe</span><span className="font-mono text-[10px]">{subscription.stripe_subscription_id}</span></div></div> : <p className="mt-4 text-sm text-foodiz-gray">Aucun abonnement enregistré.</p>}</article>

      <article className="foodiz-card p-5"><h2 className="flex items-center gap-2 text-lg font-semibold"><BarChart3 size={18} className="text-foodiz-gold"/>Campagnes</h2><div className="mt-4 grid grid-cols-2 gap-3 text-center"><div className="rounded-xl bg-white/[0.02] p-3"><p className="text-2xl text-foodiz-cream">{campaigns.length}</p><p className="text-[9px] uppercase text-foodiz-gray">Créées</p></div><div className="rounded-xl bg-white/[0.02] p-3"><p className="text-2xl text-foodiz-cream">{campaigns.reduce((sum, row) => sum + Number(row.converted_orders_count || 0), 0)}</p><p className="text-[9px] uppercase text-foodiz-gray">Conversions</p></div></div><div className="mt-4 space-y-2">{campaigns.slice(0, 4).map((campaign) => <div key={campaign.id} className="flex justify-between border-t border-white/5 pt-2 text-xs"><span>{campaign.title}</span><span className="uppercase text-foodiz-gray">{campaign.status}</span></div>)}</div></article></section>

    <section className="grid gap-5 xl:grid-cols-2"><article className="foodiz-card p-5"><h2 className="flex items-center gap-2 text-lg font-semibold"><ReceiptText size={18} className="text-foodiz-gold"/>Bordereaux de reversement</h2><div className="mt-4 space-y-3">{statements.length === 0 ? <p className="text-sm text-foodiz-gray">Aucun bordereau généré.</p> : statements.slice(0, 8).map((statement) => <a key={statement.id} href={`/admin/payouts/${statement.id}`} className="flex items-center justify-between border-t border-white/5 pt-3 text-xs"><span><span className="font-mono text-foodiz-cream">{statement.document_number}</span><br/><span className="text-foodiz-gray">{date(statement.period_start)} au {date(statement.period_end)}</span></span><span className="text-right"><strong className="text-foodiz-gold">{euros(statement.amount_cents)}</strong><br/><span className="uppercase text-foodiz-gray">{statement.status}</span></span></a>)}</div></article>

      <article className="foodiz-card p-5"><h2 className="flex items-center gap-2 text-lg font-semibold"><FileClock size={18} className="text-foodiz-gold"/>Journal d’audit</h2><div className="mt-4 space-y-3">{audit.length === 0 ? <p className="text-sm text-foodiz-gray">Aucune action administrative enregistrée.</p> : audit.map((entry) => <div key={entry.id} className="border-t border-white/5 pt-3 text-xs"><div className="flex justify-between"><span className="text-foodiz-cream">{entry.action}</span><span className="text-foodiz-gray">{new Date(entry.created_at).toLocaleString("fr-FR")}</span></div>{entry.reason && <p className="mt-1 text-foodiz-gray">Motif : {entry.reason}</p>}</div>)}</div></article></section>
  </AdminShell>;
}
