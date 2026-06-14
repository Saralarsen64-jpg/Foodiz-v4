import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Crown, History, Landmark, Megaphone, RefreshCw, Send, Sparkles, Target } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";

const AUDIENCES = [
  { id: "all_customers", label: "Tous mes anciens clients" },
  { id: "new_customers", label: "Nouveaux clients (1 commande)" },
  { id: "loyal_customers", label: "Clients fidèles (3 commandes ou plus)" },
  { id: "inactive_customers", label: "Clients inactifs depuis 30 jours" },
];

async function foodizPlusRequest(method = "GET", body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch("/api/foodiz-plus", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error || "Foodiz+ indisponible"), { code: payload.error });
  return payload;
}

export default function PartnerMarketing() {
  const navigate = useNavigate();
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

  const load = async () => {
    setLoading(true);
    try {
      const payload = await foodizPlusRequest();
      setData(payload);
      setProductId((current) => current || payload.products?.[0]?.id || "");
      setCity((current) => current || payload.restaurant?.city || "");
    } catch {
      toast.error("Impossible de charger Foodiz+.");
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);
  const activePlan = data?.subscription?.plan;
  const selectedProduct = useMemo(() => data?.products?.find((product: any) => product.id === productId), [data?.products, productId]);

  const generate = async () => {
    if (!productId) return toast.error("Ajoutez ou choisissez un produit actif.");
    setWorking(true);
    try {
      const payload = await foodizPlusRequest("POST", { action: "generate", productId, city, audience });
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
    if (!activePlan) return toast.error("Un abonnement Foodiz+ actif est nécessaire.");
    if (!title.trim() || !message.trim()) return toast.error("Choisissez ou rédigez un message.");
    setWorking(true);
    try {
      const payload = await foodizPlusRequest("POST", { action: "send", productId, city, audience, title, message, templateKey });
      toast.success(`Campagne envoyée à ${payload.recipientCount} client(s).`);
      setSuggestions([]); setEstimatedRecipients(null); setTitle(""); setMessage(""); setTemplateKey("");
      await load();
    } catch (error: any) {
      const labels: Record<string, string> = { ACTIVE_SUBSCRIPTION_REQUIRED: "Abonnement actif requis.", MONTHLY_QUOTA_REACHED: "Quota mensuel atteint.", WEEKLY_QUOTA_REACHED: "Quota hebdomadaire atteint." };
      toast.error(labels[error.code] || "Impossible d'envoyer la campagne.");
    }
    setWorking(false);
  };

  return <div className="min-h-screen bg-foodiz-black pb-24">
    <header className="sticky top-0 z-30 border-b border-foodiz-gold/10 bg-foodiz-card px-4 py-3"><div className="mx-auto flex max-w-5xl items-center justify-between"><button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={24}/></button><h1 className="foodiz-title text-lg">Foodiz+</h1><div className="w-6"/></div></header>
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <section className="foodiz-card border-foodiz-gold/20 bg-[linear-gradient(135deg,rgba(216,168,79,0.14),rgba(17,17,17,0.97)_38%,#050505)] p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foodiz-gold">Marketing local intelligent</p><h2 className="foodiz-title mt-2 text-3xl">Créez l'envie, sans coût d'IA</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-foodiz-gray">Foodiz compose vos messages à partir du produit, de la ville et de votre audience. Une campagne consomme une unité, quel que soit le nombre de clients éligibles.</p></div><Sparkles className="shrink-0 text-foodiz-gold" size={28}/></div></section>

      {loading ? <div className="foodiz-card p-8 text-center text-foodiz-gray animate-pulse">Chargement de Foodiz+...</div> : <>
        <section><div className="mb-4 flex items-center justify-between"><h2 className="foodiz-title text-xl">Votre forfait</h2>{activePlan && <span className="rounded-full border border-foodiz-green/20 bg-foodiz-green/5 px-3 py-1 text-[10px] uppercase text-foodiz-green">Actif</span>}</div>
          {activePlan ? <div className="foodiz-card grid gap-4 border-foodiz-gold/20 p-5 md:grid-cols-3"><div><p className="text-xs text-foodiz-gray">Forfait</p><p className="mt-1 font-semibold text-foodiz-cream">{activePlan.name}</p></div><div><p className="text-xs text-foodiz-gray">Ce mois</p><p className="mt-1 font-semibold text-foodiz-gold">{data.usage.monthly} / {activePlan.monthly_campaign_limit} campagnes</p></div><div><p className="text-xs text-foodiz-gray">Cette semaine</p><p className="mt-1 font-semibold text-foodiz-gold">{data.usage.weekly} / {activePlan.weekly_campaign_limit} campagnes</p></div></div> : <div className="foodiz-card border-foodiz-gold/20 p-5"><p className="text-sm font-semibold text-foodiz-cream">Aucun abonnement actif</p><p className="mt-2 text-xs text-foodiz-gray">Vous pouvez préparer et prévisualiser une campagne. L'envoi sera disponible après la création des tarifs Stripe Foodiz+.</p></div>}
          <div className="mt-4 grid gap-3 md:grid-cols-3">{(data.plans || []).map((plan: any) => <article key={plan.id} className={`foodiz-card p-5 ${plan.id === "boost" ? "border-foodiz-gold/40 bg-foodiz-gold/5" : "border-foodiz-gold/10"}`}><div className="flex items-center justify-between"><p className="font-semibold text-foodiz-cream">{plan.name}</p>{plan.id === "boost" ? <Crown size={17} className="text-foodiz-gold"/> : <Landmark size={17} className="text-foodiz-gold"/>}</div><p className="mt-4 text-2xl font-serif italic text-foodiz-gold">{(plan.monthly_price_cents / 100).toFixed(2)} €<span className="text-xs not-italic text-foodiz-gray"> / mois</span></p><p className="mt-2 text-xs text-foodiz-gray">{plan.monthly_campaign_limit} campagnes/mois · {plan.weekly_campaign_limit}/semaine</p><p className="mt-3 text-[10px] text-foodiz-gray">Annuel : {(plan.yearly_price_cents / 100).toFixed(2)} €</p><button disabled className="foodiz-btn-outline mt-4 w-full py-2 text-xs opacity-50">Bientôt disponible</button></article>)}</div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]"><div className="foodiz-card space-y-4 p-5"><div className="flex items-center gap-2"><Target size={18} className="text-foodiz-gold"/><h2 className="foodiz-title text-lg">Préparer une campagne</h2></div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Produit<select value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 w-full rounded-xl border border-foodiz-gold/15 bg-foodiz-black p-3 text-sm normal-case text-foodiz-cream"><option value="">Choisir un produit</option>{(data.products || []).map((product: any) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Ville<input value={city} onChange={(event) => setCity(event.target.value)} className="mt-2 w-full rounded-xl border border-foodiz-gold/15 bg-foodiz-black p-3 text-sm normal-case text-foodiz-cream"/></label>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Audience<select value={audience} onChange={(event) => setAudience(event.target.value)} className="mt-2 w-full rounded-xl border border-foodiz-gold/15 bg-foodiz-black p-3 text-sm normal-case text-foodiz-cream">{AUDIENCES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <button onClick={generate} disabled={working || !productId} className="foodiz-btn flex w-full items-center justify-center gap-2 py-3 disabled:opacity-40"><RefreshCw size={15} className={working ? "animate-spin" : ""}/>Générer gratuitement</button>{estimatedRecipients !== null && <p className="text-center text-xs text-foodiz-gray">Audience estimée après anti-spam : <span className="text-foodiz-gold">{estimatedRecipients} client(s)</span></p>}
        </div>
        <div className="foodiz-card space-y-4 p-5"><div className="flex items-center gap-2"><Megaphone size={18} className="text-foodiz-gold"/><h2 className="foodiz-title text-lg">Message</h2></div>{suggestions.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1">{suggestions.map((suggestion) => <button key={suggestion.key} onClick={() => { setTitle(suggestion.title); setMessage(suggestion.message); setTemplateKey(suggestion.key); }} className={`shrink-0 rounded-full border px-3 py-2 text-[10px] ${templateKey === suggestion.key ? "border-foodiz-gold bg-foodiz-gold/10 text-foodiz-gold" : "border-white/10 text-foodiz-gray"}`}>{suggestion.title}</button>)}</div>}<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={90} placeholder="Titre de la notification" className="w-full rounded-xl border border-foodiz-gold/15 bg-foodiz-black p-3 text-sm text-foodiz-cream"/><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={240} placeholder="Message de campagne" className="h-28 w-full resize-none rounded-xl border border-foodiz-gold/15 bg-foodiz-black p-3 text-sm text-foodiz-cream"/><div className="rounded-xl border border-foodiz-gold/10 bg-foodiz-gold/5 p-4"><p className="text-[9px] uppercase text-foodiz-gold">Aperçu client</p><p className="mt-2 text-sm font-semibold text-foodiz-cream">{title || "Titre de notification"}</p><p className="mt-1 text-xs text-foodiz-gray">{message || `${selectedProduct?.name || "Votre produit"} apparaîtra ici.`}</p></div><button onClick={send} disabled={working || !activePlan || !title.trim() || !message.trim()} className="foodiz-btn flex w-full items-center justify-center gap-2 py-3 disabled:opacity-40"><Send size={15}/>Envoyer maintenant</button></div></section>

        <section><div className="mb-4 flex items-center gap-2"><History size={18} className="text-foodiz-gold"/><h2 className="foodiz-title text-lg">Historique réel</h2></div>{data.campaigns.length === 0 ? <div className="foodiz-card p-5 text-center text-sm text-foodiz-gray">Aucune campagne envoyée.</div> : <div className="space-y-3">{data.campaigns.map((campaign: any) => <article key={campaign.id} className="foodiz-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-foodiz-cream">{campaign.title}</p><p className="mt-1 text-xs text-foodiz-gray">{campaign.description}</p></div><span className="rounded-full border border-foodiz-gold/20 px-2 py-1 text-[9px] uppercase text-foodiz-gold">{campaign.status}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-white/[0.03] p-2"><p className="text-sm text-foodiz-cream">{campaign.recipient_count}</p><p className="text-[9px] text-foodiz-gray">Reçues</p></div><div className="rounded-xl bg-white/[0.03] p-2"><p className="text-sm text-foodiz-cream">{campaign.opened_count}</p><p className="text-[9px] text-foodiz-gray">Ouvertes</p></div><div className="rounded-xl bg-white/[0.03] p-2"><p className="text-sm text-foodiz-cream">{campaign.converted_orders_count}</p><p className="text-[9px] text-foodiz-gray">Commandes</p></div></div></article>)}</div>}</section>
      </>}
    </main>
  </div>;
}
