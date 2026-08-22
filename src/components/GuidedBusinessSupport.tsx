import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, CircleUserRound, Clock3, Headphones, Landmark, Package, RefreshCw, Send, Store, UtensilsCrossed, Wifi } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";

type Role = "partner" | "courier";
type Category = { key: string; label: string; icon: typeof Package; needsOrder?: boolean };

const CONFIG: Record<Role, { title: string; home: string; intro: string; promise: string; categories: Category[]; faq: { title: string; text: string }[] }> = {
  partner: { title: "Support partenaire", home: "/partner", intro: "Weello vérifie votre établissement avant de transmettre une demande à l'équipe.", promise: "Objectif : moins d'attente, moins de flou, plus de ventes sereines.", categories: [
    { key: "order", label: "Une commande", icon: Package, needsOrder: true }, { key: "menu", label: "Ma carte", icon: UtensilsCrossed }, { key: "payout", label: "Revenus & versements", icon: Landmark }, { key: "account", label: "Établissement", icon: Store },
  ], faq: [
    { title: "Une commande n’apparaît pas", text: "Vérifiez d’abord le statut de votre établissement et les commandes actives. Si le diagnostic détecte un blocage, Weello reçoit le contexte complet." },
    { title: "Un produit n’est pas visible", text: "Assurez-vous que le produit est actif, rattaché à une catégorie et correctement illustré. Une carte claire inspire plus confiance." },
    { title: "Un règlement semble incomplet", text: "Les virements restent suivis depuis l’admin. Weello conserve l’historique des montants partenaire, frais et ajustements éventuels." },
  ] },
  courier: { title: "Support livreur", home: "/courier", intro: "Weello analyse votre course et votre compte pour vous orienter immédiatement.", promise: "Objectif : une course claire, sécurisée, traçable et rémunérée correctement.", categories: [
    { key: "delivery", label: "Livraison en cours", icon: Package, needsOrder: true }, { key: "availability", label: "Disponibilité", icon: Wifi }, { key: "payout", label: "Gains & versements", icon: Landmark }, { key: "account", label: "Mon compte", icon: CircleUserRound },
  ], faq: [
    { title: "Je ne reçois pas de courses", text: "Votre dossier doit être validé, votre position récente et votre statut en ligne. Le dispatch privilégie la proximité et la fiabilité." },
    { title: "Le chrono de retard démarre quand ?", text: "Uniquement après la récupération de la commande au restaurant, avec ETA serveur et GPS précis." },
    { title: "Je ne peux pas valider une étape", text: "Ne forcez pas. Vérifiez votre connexion, votre GPS et ouvrez un ticket avec la course concernée si le blocage continue." },
  ] },
};

export default function GuidedBusinessSupport({ role }: { role: Role }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const config = CONFIG[role];
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [orderId, setOrderId] = useState("");
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [diagnosing, setDiagnosing] = useState(false);
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    setUser(authUser);
    let orderQuery: any;
    if (role === "partner") {
      const { data: restaurant } = await supabase.from("restaurants").select("id").eq("owner_id", authUser.id).maybeSingle();
      orderQuery = restaurant
        ? supabase.from("orders").select("id,status,created_at,restaurant:restaurants(name)").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }).limit(30)
        : Promise.resolve({ data: [] });
    } else {
      orderQuery = supabase.from("orders").select("id,status,created_at,restaurant:restaurants(name)").eq("courier_id", authUser.id).order("created_at", { ascending: false }).limit(30);
    }
    const [ordersResult, ticketsResult] = await Promise.all([
      orderQuery,
      supabase.from("support_tickets").select("*").eq("user_id", authUser.id).eq("user_role", role).order("created_at", { ascending: false }).limit(20),
    ]);
    setOrders(ordersResult.data || []);
    setTickets(ticketsResult.data || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [role]);
  useEffect(() => {
    const requestedCategory = searchParams.get("category");
    const requestedOrder = searchParams.get("order");
    const incident = searchParams.get("incident");
    if (requestedCategory && config.categories.some((item) => item.key === requestedCategory)) {
      setCategory(requestedCategory);
    }
    if (requestedOrder) setOrderId(requestedOrder);
    if (role === "courier" && incident) {
      const labels: Record<string, string> = {
        restaurant_closed: "Restaurant fermé ou commande introuvable",
        client_unreachable: "Client introuvable ou injoignable",
        gps: "Problème de localisation GPS",
        delivery_code: "Le client ne peut pas communiquer son code de remise",
      };
      setMessage(`Incident de course : ${labels[incident] || "Autre problème"}.`);
    }
  }, [config.categories, role, searchParams]);
  const selectedCategory = useMemo(() => config.categories.find((item) => item.key === category), [category, config.categories]);

  const runDiagnosis = async () => {
    if (!category || (selectedCategory?.needsOrder && !orderId)) return;
    setDiagnosing(true);
    setDiagnosis(null);
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch("/api/support-diagnostic", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify({ role, category, orderId: orderId || undefined }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) toast.error("Impossible d'analyser cette situation.");
    else setDiagnosis(payload.diagnostic);
    setDiagnosing(false);
  };

  const createTicket = async () => {
    if (!user || !category || !message.trim()) return;
    setSending(true);
    let duplicateQuery = supabase.from("support_tickets").select("id").eq("user_id", user.id).eq("category", role).eq("subcategory", category).in("status", ["open", "in_progress"]);
    duplicateQuery = orderId ? duplicateQuery.eq("order_id", orderId) : duplicateQuery.is("order_id", null);
    const { data: duplicate } = await duplicateQuery.limit(1).maybeSingle();
    if (duplicate) {
      toast.error("Une demande identique est déjà en cours.");
      setSending(false);
      return;
    }
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id, user_email: user.email, user_role: role, category: role, subcategory: category, order_id: orderId || null,
      subject: `${selectedCategory?.label || "Support"}${orderId ? ` - #${orderId.slice(0, 8)}` : ""}`, message: message.trim(), status: "open",
      priority: searchParams.get("incident") ? "high" : diagnosis?.priority || "normal", source: "guided", diagnostic: { ...(diagnosis?.context || {}), diagnosis: diagnosis?.title, explanation: diagnosis?.explanation, incident: searchParams.get("incident") }, attempted_actions: diagnosis?.attempted || [],
    });
    if (error) toast.error("Impossible d'envoyer la demande.");
    else { toast.success("Demande envoyée avec son diagnostic."); setMessage(""); setDiagnosis(null); setCategory(null); setOrderId(""); await load(); }
    setSending(false);
  };

  return <div className="min-h-screen bg-weello-black pb-24">
    <header className="sticky top-0 z-30 border-b border-weello-gold/10 bg-weello-card px-4 py-3"><div className="mx-auto flex max-w-3xl items-center gap-3"><button onClick={() => navigate(config.home)} className="text-weello-gold"><ChevronLeft size={21}/></button><h1 className="weello-title text-lg">{config.title}</h1></div></header>
    <main className="mx-auto max-w-3xl space-y-7 px-4 py-6">
      <section className="rounded-[2rem] border border-weello-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,0.16),rgba(13,13,13,0.98)_52%)] p-6">
        <Headphones className="text-weello-gold" size={26}/>
        <h2 className="weello-title mt-4 text-2xl">Une aide utile, sans détour</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-weello-gray">{config.intro}</p>
        <p className="mt-2 text-xs font-semibold text-weello-gold">{config.promise}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Diagnostic", icon: RefreshCw, text: "Weello vérifie les données avant le ticket." },
            { label: "Priorité", icon: AlertCircle, text: "Les urgences sont clairement identifiées." },
            { label: "Traçabilité", icon: Clock3, text: "Chaque demande garde son historique." },
          ].map(({ label, icon: Icon, text }) => (
            <div key={label} className="rounded-2xl border border-weello-gold/10 bg-black/25 p-4">
              <Icon size={17} className="text-weello-gold" />
              <p className="mt-3 text-xs font-semibold text-weello-cream">{label}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-weello-gray">{text}</p>
            </div>
          ))}
        </div>
      </section>
      <section><h2 className="weello-title text-lg">Quel est le problème ?</h2><div className="mt-4 grid grid-cols-2 gap-3">{config.categories.map((item) => <button key={item.key} onClick={() => { setCategory(item.key); setOrderId(""); setDiagnosis(null); }} className={`weello-card p-4 text-left transition-all ${category === item.key ? "border-weello-gold bg-weello-gold/5" : "border-weello-gold/10"}`}><item.icon size={19} className="text-weello-gold"/><p className="mt-3 text-sm text-weello-cream">{item.label}</p></button>)}</div></section>
      {category && <section className="weello-card space-y-4 p-5"><h3 className="weello-title text-base">Diagnostic sécurisé</h3>{selectedCategory?.needsOrder && <select value={orderId} onChange={(event) => { setOrderId(event.target.value); setDiagnosis(null); }} className="w-full rounded-xl border border-weello-gold/20 bg-weello-black p-3 text-sm text-weello-cream"><option value="">Choisir la commande concernée</option>{orders.map((order) => <option key={order.id} value={order.id}>#{order.id.slice(0, 8)} · {order.restaurant?.name || "Établissement"} · {order.status}</option>)}</select>}<button onClick={runDiagnosis} disabled={diagnosing || Boolean(selectedCategory?.needsOrder && !orderId)} className="weello-btn flex w-full items-center justify-center gap-2 py-3 disabled:opacity-40"><RefreshCw size={15} className={diagnosing ? "animate-spin" : ""}/>{diagnosing ? "Analyse..." : "Analyser ma situation"}</button></section>}
      {diagnosis && <section className={`weello-card border p-5 ${diagnosis.resolved ? "border-weello-green/20 bg-weello-green/5" : "border-weello-gold/20"}`}><div className="flex gap-3">{diagnosis.resolved ? <CheckCircle2 className="shrink-0 text-weello-green"/> : <AlertCircle className="shrink-0 text-weello-gold"/>}<div><h3 className="font-semibold text-weello-cream">{diagnosis.title}</h3><p className="mt-2 text-xs leading-relaxed text-weello-gray">{diagnosis.explanation}</p></div></div>{diagnosis.action && <button onClick={() => navigate(diagnosis.action.path)} className="mt-4 flex items-center gap-1 text-xs text-weello-gold">{diagnosis.action.label}<ChevronRight size={14}/></button>}<div className="mt-5 border-t border-white/10 pt-4"><p className="mb-3 text-xs text-weello-gray">Toujours bloqué ? Précisez uniquement ce qui n'a pas été résolu.</p><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Décrivez le problème restant..." className="h-24 w-full resize-none rounded-xl border border-weello-gold/20 bg-weello-black p-3 text-sm text-weello-cream outline-none"/><button onClick={createTicket} disabled={sending || !message.trim()} className="weello-btn mt-3 flex w-full items-center justify-center gap-2 py-3 disabled:opacity-40"><Send size={15}/>{sending ? "Envoi..." : "Transmettre au support"}</button></div></section>}
      <section>
        <h2 className="weello-title mb-4 text-lg">Réponses rapides</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {config.faq.map((item) => (
            <article key={item.title} className="rounded-2xl border border-weello-gold/10 bg-white/[0.025] p-4">
              <p className="text-sm font-semibold text-weello-cream">{item.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-weello-gray">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section><h2 className="weello-title mb-4 flex items-center gap-2 text-lg"><Clock3 size={18} className="text-weello-gold"/>Mes demandes</h2>{loading ? <p className="text-sm text-weello-gray animate-pulse">Chargement...</p> : tickets.length === 0 ? <div className="weello-card p-5 text-center text-xs text-weello-gray">Aucune demande en cours.</div> : <div className="space-y-3">{tickets.map((ticket) => <article key={ticket.id} className="weello-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-weello-cream">{ticket.subject}</p><p className="mt-1 text-[10px] text-weello-gray">{new Date(ticket.created_at).toLocaleString("fr-FR")}</p></div><span className={`rounded-full border px-2 py-1 text-[9px] uppercase ${["closed", "resolved"].includes(ticket.status) ? "border-weello-green/20 text-weello-green" : "border-weello-gold/20 text-weello-gold"}`}>{ticket.status}</span></div><p className="mt-3 text-xs text-weello-gray">{ticket.message}</p>{ticket.admin_response && <div className="mt-3 rounded-xl border border-weello-green/15 bg-weello-green/5 p-3"><p className="mb-1 text-[9px] uppercase text-weello-green">Réponse Weello</p><p className="text-xs text-weello-cream">{ticket.admin_response}</p></div>}</article>)}</div>}</section>
    </main>
  </div>;
}
