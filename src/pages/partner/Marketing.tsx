import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Crown, ExternalLink, History, Landmark, Megaphone, RefreshCw, Send, Sparkles, Target } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { createBillingPortalSession, createSubscription } from "../../lib/stripe";

const AUDIENCES = [
  { id: "all_customers", label: "Tous mes anciens clients" },
  { id: "new_customers", label: "Nouveaux clients (1 commande)" },
  { id: "loyal_customers", label: "Clients fidèles (3 commandes ou plus)" },
  { id: "inactive_customers", label: "Clients inactifs depuis 30 jours" },
];

async function weelloPlusRequest(method = "GET", body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch("/api/weello-plus", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error || "Weello+ indisponible"), { code: payload.error });
  return payload;
}

export default function PartnerMarketing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [productId, setProductId] = useState("");
  const [city, setCity] = useState("");
  const [audience, setAudience] = useState("all_customers");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [estimatedRecipients, setEstimatedRecipients] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [subscribingPlan, setSubscribingPlan] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const payload = await weelloPlusRequest();
      setData(payload);
      setProductId((current) => current || payload.products?.[0]?.id || "");
      setCity((current) => current || payload.restaurant?.city || "");
    } catch {
      toast.error("Impossible de charger Weello+.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "cancelled") {
      toast("Paiement annulé. Aucun abonnement n'a été créé.");
      navigate("/partner/marketing", { replace: true });
      void load();
      return;
    }
    if (checkout === "success") {
      toast.success("Paiement reçu. Activation de Weello+ en cours...");
      navigate("/partner/marketing", { replace: true });
      let attempts = 0;
      const refresh = async () => {
        attempts += 1;
        await load();
        if (attempts < 5) window.setTimeout(refresh, 1500);
      };
      void refresh();
      return;
    }
    void load();
  }, []);
  const activePlan = data?.subscription?.plan;
  const selectedProduct = useMemo(() => data?.products?.find((product: any) => product.id === productId), [data?.products, productId]);

  const subscribe = async (planId: string) => {
    if (!data?.restaurant?.id) return;
    setSubscribingPlan(planId);
    try {
      const checkoutUrl = await createSubscription(data.restaurant.id, planId, billingPeriod);
      window.location.assign(checkoutUrl);
    } catch (error: any) {
      toast.error(error.code === "SUBSCRIPTION_ALREADY_EXISTS" ? "Un abonnement existe déjà. Gérez-le depuis votre espace de facturation." : "Impossible d'ouvrir le paiement Stripe.");
      setSubscribingPlan("");
    }
  };

  const openBillingPortal = async () => {
    setWorking(true);
    try {
      const url = await createBillingPortalSession(`${window.location.origin}/partner/marketing`);
      window.location.assign(url);
    } catch {
      toast.error("Impossible d'ouvrir l'espace de facturation.");
      setWorking(false);
    }
  };

  const generate = async () => {
    if (!productId) return toast.error("Ajoutez ou choisissez un produit actif.");
    setWorking(true);
    try {
      const payload = await weelloPlusRequest("POST", { action: "generate", productId, city, audience });
      setSuggestions(payload.suggestions || []);
      setEstimatedRecipients(payload.estimatedRecipientCount || 0);
      if (payload.suggestions?.[0]) {
        setTitle(payload.suggestions[0].title);
        setMessage(payload.suggestions[0].message);
        setTemplateKey(payload.suggestions[0].key);
      }
    } catch {
      toast.error("La génération automatique a échoué.");
    }
    setWorking(false);
  };

  const send = async () => {
    if (!activePlan) return toast.error("Un abonnement Weello+ actif est nécessaire.");
    if (!title.trim() || !message.trim()) return toast.error("Choisissez ou rédigez un message.");
    setWorking(true);
    try {
      const payload = await weelloPlusRequest("POST", { action: "send", productId, city, audience, title, message, templateKey });
      toast.success(`Campagne envoyée à ${payload.recipientCount} client(s).`);
      setSuggestions([]); setEstimatedRecipients(null); setTitle(""); setMessage(""); setTemplateKey("");
      await load();
    } catch (error: any) {
      const labels: Record<string, string> = { ACTIVE_SUBSCRIPTION_REQUIRED: "Abonnement actif requis.", MONTHLY_QUOTA_REACHED: "Quota mensuel atteint.", WEEKLY_QUOTA_REACHED: "Quota hebdomadaire atteint." };
      toast.error(labels[error.code] || "Impossible d'envoyer la campagne.");
    }
    setWorking(false);
  };

  return <div className="min-h-screen bg-weello-black pb-24">
    <header className="sticky top-0 z-30 border-b border-weello-gold/10 bg-weello-card px-4 py-3"><div className="mx-auto flex max-w-5xl items-center justify-between"><button onClick={() => navigate("/partner")} className="text-weello-gold"><ChevronLeft size={24}/></button><h1 className="weello-title text-lg">Weello+</h1><div className="w-6"/></div></header>
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <section className="weello-card border-weello-gold/20 bg-[linear-gradient(135deg,rgba(216,168,79,0.14),rgba(17,17,17,0.97)_38%,#050505)] p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-weello-gold">Marketing local intelligent</p><h2 className="weello-title mt-2 text-3xl">Créez l'envie, sans coût d'IA</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-weello-gray">Weello compose vos messages à partir du produit, de la ville et de votre audience. Une campagne consomme une unité, quel que soit le nombre de clients éligibles.</p></div><Sparkles className="shrink-0 text-weello-gold" size={28}/></div></section>

      {loading ? <div className="weello-card p-8 text-center text-weello-gray animate-pulse">Chargement de Weello+...</div> : <>
        <section><div className="mb-4 flex items-center justify-between"><h2 className="weello-title text-xl">Votre forfait</h2>{activePlan && <span className="rounded-full border border-weello-green/20 bg-weello-green/5 px-3 py-1 text-[10px] uppercase text-weello-green">Actif</span>}</div>
          {activePlan ? <div className="weello-card border-weello-gold/20 p-5"><div className="grid gap-4 md:grid-cols-3"><div><p className="text-xs text-weello-gray">Forfait</p><p className="mt-1 font-semibold text-weello-cream">{activePlan.name} · {data.subscription.billing_period === "yearly" ? "annuel" : "mensuel"}</p></div><div><p className="text-xs text-weello-gray">Ce mois</p><p className="mt-1 font-semibold text-weello-gold">{data.usage.monthly} / {activePlan.monthly_campaign_limit} campagnes</p></div><div><p className="text-xs text-weello-gray">Cette semaine</p><p className="mt-1 font-semibold text-weello-gold">{data.usage.weekly} / {activePlan.weekly_campaign_limit} campagnes</p></div></div><button onClick={openBillingPortal} disabled={working} className="weello-btn-outline mt-5 flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-40"><ExternalLink size={14}/>Gérer mon abonnement</button></div> : <div className="weello-card border-weello-gold/20 p-5"><p className="text-sm font-semibold text-weello-cream">Choisissez votre formule</p><p className="mt-2 text-xs text-weello-gray">Le paiement et la gestion de l'abonnement sont sécurisés par Stripe.</p><div className="mt-4 inline-flex rounded-full border border-weello-gold/20 bg-weello-black p-1"><button onClick={() => setBillingPeriod("monthly")} className={`rounded-full px-4 py-2 text-xs ${billingPeriod === "monthly" ? "bg-weello-gold text-weello-black" : "text-weello-gray"}`}>Mensuel</button><button onClick={() => setBillingPeriod("yearly")} className={`rounded-full px-4 py-2 text-xs ${billingPeriod === "yearly" ? "bg-weello-gold text-weello-black" : "text-weello-gray"}`}>Annuel · -15 %</button></div></div>}
          <div className="mt-4 grid gap-3 md:grid-cols-3">{(data.plans || []).map((plan: any) => { const isCurrent = activePlan?.id === plan.id; const price = billingPeriod === "yearly" ? plan.yearly_price_cents : plan.monthly_price_cents; return <article key={plan.id} className={`weello-card p-5 ${plan.id === "boost" ? "border-weello-gold/40 bg-weello-gold/5" : "border-weello-gold/10"}`}><div className="flex items-center justify-between"><p className="font-semibold text-weello-cream">{plan.name}</p>{plan.id === "boost" ? <Crown size={17} className="text-weello-gold"/> : <Landmark size={17} className="text-weello-gold"/>}</div><p className="mt-4 text-2xl font-serif italic text-weello-gold">{(price / 100).toFixed(2)} €<span className="text-xs not-italic text-weello-gray"> / {billingPeriod === "yearly" ? "an" : "mois"}</span></p><p className="mt-2 text-xs text-weello-gray">{plan.monthly_campaign_limit} campagnes/mois · {plan.weekly_campaign_limit}/semaine</p>{billingPeriod === "yearly" && <p className="mt-3 text-[10px] text-weello-green">Deux mois environ économisés</p>}<button onClick={() => subscribe(plan.id)} disabled={Boolean(activePlan) || Boolean(subscribingPlan)} className={`${plan.id === "boost" ? "weello-btn" : "weello-btn-outline"} mt-4 w-full py-2 text-xs disabled:opacity-40`}>{isCurrent ? "Forfait actuel" : subscribingPlan === plan.id ? "Ouverture de Stripe..." : activePlan ? "Gérer pour changer" : "Choisir ce forfait"}</button></article>; })}</div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]"><div className="weello-card space-y-4 p-5"><div className="flex items-center gap-2"><Target size={18} className="text-weello-gold"/><h2 className="weello-title text-lg">Préparer une campagne</h2></div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-weello-gold">Produit<select value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 w-full rounded-xl border border-weello-gold/15 bg-weello-black p-3 text-sm normal-case text-weello-cream"><option value="">Choisir un produit</option>{(data.products || []).map((product: any) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-weello-gold">Ville<input value={city} onChange={(event) => setCity(event.target.value)} className="mt-2 w-full rounded-xl border border-weello-gold/15 bg-weello-black p-3 text-sm normal-case text-weello-cream"/></label>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-weello-gold">Audience<select value={audience} onChange={(event) => setAudience(event.target.value)} className="mt-2 w-full rounded-xl border border-weello-gold/15 bg-weello-black p-3 text-sm normal-case text-weello-cream">{AUDIENCES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <button onClick={generate} disabled={working || !productId} className="weello-btn flex w-full items-center justify-center gap-2 py-3 disabled:opacity-40"><RefreshCw size={15} className={working ? "animate-spin" : ""}/>Générer gratuitement</button>{estimatedRecipients !== null && <p className="text-center text-xs text-weello-gray">Audience estimée après anti-spam : <span className="text-weello-gold">{estimatedRecipients} client(s)</span></p>}
        </div>
        <div className="weello-card space-y-4 p-5"><div className="flex items-center gap-2"><Megaphone size={18} className="text-weello-gold"/><h2 className="weello-title text-lg">Message</h2></div>{suggestions.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1">{suggestions.map((suggestion) => <button key={suggestion.key} onClick={() => { setTitle(suggestion.title); setMessage(suggestion.message); setTemplateKey(suggestion.key); }} className={`shrink-0 rounded-full border px-3 py-2 text-[10px] ${templateKey === suggestion.key ? "border-weello-gold bg-weello-gold/10 text-weello-gold" : "border-white/10 text-weello-gray"}`}>{suggestion.title}</button>)}</div>}<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={90} placeholder="Titre de la notification" className="w-full rounded-xl border border-weello-gold/15 bg-weello-black p-3 text-sm text-weello-cream"/><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={240} placeholder="Message de campagne" className="h-28 w-full resize-none rounded-xl border border-weello-gold/15 bg-weello-black p-3 text-sm text-weello-cream"/><div className="rounded-xl border border-weello-gold/10 bg-weello-gold/5 p-4"><p className="text-[9px] uppercase text-weello-gold">Aperçu client</p><p className="mt-2 text-sm font-semibold text-weello-cream">{title || "Titre de notification"}</p><p className="mt-1 text-xs text-weello-gray">{message || `${selectedProduct?.name || "Votre produit"} apparaîtra ici.`}</p></div><button onClick={send} disabled={working || !activePlan || !title.trim() || !message.trim()} className="weello-btn flex w-full items-center justify-center gap-2 py-3 disabled:opacity-40"><Send size={15}/>Envoyer maintenant</button></div></section>

        <section><div className="mb-4 flex items-center gap-2"><History size={18} className="text-weello-gold"/><h2 className="weello-title text-lg">Historique réel</h2></div>{data.campaigns.length === 0 ? <div className="weello-card p-5 text-center text-sm text-weello-gray">Aucune campagne envoyée.</div> : <div className="space-y-3">{data.campaigns.map((campaign: any) => <article key={campaign.id} className="weello-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-weello-cream">{campaign.title}</p><p className="mt-1 text-xs text-weello-gray">{campaign.description}</p></div><span className="rounded-full border border-weello-gold/20 px-2 py-1 text-[9px] uppercase text-weello-gold">{campaign.status}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-white/[0.03] p-2"><p className="text-sm text-weello-cream">{campaign.recipient_count}</p><p className="text-[9px] text-weello-gray">Reçues</p></div><div className="rounded-xl bg-white/[0.03] p-2"><p className="text-sm text-weello-cream">{campaign.opened_count}</p><p className="text-[9px] text-weello-gray">Ouvertes</p></div><div className="rounded-xl bg-white/[0.03] p-2"><p className="text-sm text-weello-cream">{campaign.converted_orders_count}</p><p className="text-[9px] text-weello-gray">Commandes</p></div></div></article>)}</div>}</section>
      </>}
    </main>
  </div>;
}
