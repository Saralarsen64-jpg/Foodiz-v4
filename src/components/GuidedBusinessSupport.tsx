import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, CircleUserRound, Clock3, Headphones, Landmark, Package, RefreshCw, Send, Store, UtensilsCrossed, Wifi } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";

type Role = "partner" | "courier";
type Category = { key: string; label: string; icon: typeof Package; needsOrder?: boolean };

const CONFIG: Record<Role, { title: string; home: string; intro: string; categories: Category[] }> = {
  partner: { title: "Support partenaire", home: "/partner", intro: "Foodiz vérifie votre établissement avant de transmettre une demande à l'équipe.", categories: [
    { key: "order", label: "Une commande", icon: Package, needsOrder: true }, { key: "menu", label: "Ma carte", icon: UtensilsCrossed }, { key: "payout", label: "Revenus & versements", icon: Landmark }, { key: "account", label: "Établissement", icon: Store },
  ] },
  courier: { title: "Support livreur", home: "/courier", intro: "Foodiz analyse votre course et votre compte pour vous orienter immédiatement.", categories: [
    { key: "delivery", label: "Livraison en cours", icon: Package, needsOrder: true }, { key: "availability", label: "Disponibilité", icon: Wifi }, { key: "payout", label: "Gains & versements", icon: Landmark }, { key: "account", label: "Mon compte", icon: CircleUserRound },
  ] },
};

export default function GuidedBusinessSupport({ role }: { role: Role }) {
  const navigate = useNavigate();
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
      priority: diagnosis?.priority || "normal", source: "guided", diagnostic: { ...(diagnosis?.context || {}), diagnosis: diagnosis?.title, explanation: diagnosis?.explanation }, attempted_actions: diagnosis?.attempted || [],
    });
    if (error) toast.error("Impossible d'envoyer la demande.");
    else { toast.success("Demande envoyée avec son diagnostic."); setMessage(""); setDiagnosis(null); setCategory(null); setOrderId(""); await load(); }
    setSending(false);
  };

  return <div className="min-h-screen bg-foodiz-black pb-24">
    <header className="sticky top-0 z-30 border-b border-foodiz-gold/10 bg-foodiz-card px-4 py-3"><div className="mx-auto flex max-w-3xl items-center gap-3"><button onClick={() => navigate(config.home)} className="text-foodiz-gold"><ChevronLeft size={21}/></button><h1 className="foodiz-title text-lg">{config.title}</h1></div></header>
    <main className="mx-auto max-w-3xl space-y-7 px-4 py-6">
      <section className="rounded-[2rem] border border-foodiz-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,0.16),rgba(13,13,13,0.98)_52%)] p-6"><Headphones className="text-foodiz-gold" size={26}/><h2 className="foodiz-title mt-4 text-2xl">Une aide utile, sans détour</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-foodiz-gray">{config.intro}</p></section>
      <section><h2 className="foodiz-title text-lg">Quel est le problème ?</h2><div className="mt-4 grid grid-cols-2 gap-3">{config.categories.map((item) => <button key={item.key} onClick={() => { setCategory(item.key); setOrderId(""); setDiagnosis(null); }} className={`foodiz-card p-4 text-left transition-all ${category === item.key ? "border-foodiz-gold bg-foodiz-gold/5" : "border-foodiz-gold/10"}`}><item.icon size={19} className="text-foodiz-gold"/><p className="mt-3 text-sm text-foodiz-cream">{item.label}</p></button>)}</div></section>
      {category && <section className="foodiz-card space-y-4 p-5"><h3 className="foodiz-title text-base">Diagnostic sécurisé</h3>{selectedCategory?.needsOrder && <select value={orderId} onChange={(event) => { setOrderId(event.target.value); setDiagnosis(null); }} className="w-full rounded-xl border border-foodiz-gold/20 bg-foodiz-black p-3 text-sm text-foodiz-cream"><option value="">Choisir la commande concernée</option>{orders.map((order) => <option key={order.id} value={order.id}>#{order.id.slice(0, 8)} · {order.restaurant?.name || "Établissement"} · {order.status}</option>)}</select>}<button onClick={runDiagnosis} disabled={diagnosing || Boolean(selectedCategory?.needsOrder && !orderId)} className="foodiz-btn flex w-full items-center justify-center gap-2 py-3 disabled:opacity-40"><RefreshCw size={15} className={diagnosing ? "animate-spin" : ""}/>{diagnosing ? "Analyse..." : "Analyser ma situation"}</button></section>}
      {diagnosis && <section className={`foodiz-card border p-5 ${diagnosis.resolved ? "border-foodiz-green/20 bg-foodiz-green/5" : "border-foodiz-gold/20"}`}><div className="flex gap-3">{diagnosis.resolved ? <CheckCircle2 className="shrink-0 text-foodiz-green"/> : <AlertCircle className="shrink-0 text-foodiz-gold"/>}<div><h3 className="font-semibold text-foodiz-cream">{diagnosis.title}</h3><p className="mt-2 text-xs leading-relaxed text-foodiz-gray">{diagnosis.explanation}</p></div></div>{diagnosis.action && <button onClick={() => navigate(diagnosis.action.path)} className="mt-4 flex items-center gap-1 text-xs text-foodiz-gold">{diagnosis.action.label}<ChevronRight size={14}/></button>}<div className="mt-5 border-t border-white/10 pt-4"><p className="mb-3 text-xs text-foodiz-gray">Toujours bloqué ? Précisez uniquement ce qui n'a pas été résolu.</p><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Décrivez le problème restant..." className="h-24 w-full resize-none rounded-xl border border-foodiz-gold/20 bg-foodiz-black p-3 text-sm text-foodiz-cream outline-none"/><button onClick={createTicket} disabled={sending || !message.trim()} className="foodiz-btn mt-3 flex w-full items-center justify-center gap-2 py-3 disabled:opacity-40"><Send size={15}/>{sending ? "Envoi..." : "Transmettre au support"}</button></div></section>}
      <section><h2 className="foodiz-title mb-4 flex items-center gap-2 text-lg"><Clock3 size={18} className="text-foodiz-gold"/>Mes demandes</h2>{loading ? <p className="text-sm text-foodiz-gray animate-pulse">Chargement...</p> : tickets.length === 0 ? <div className="foodiz-card p-5 text-center text-xs text-foodiz-gray">Aucune demande en cours.</div> : <div className="space-y-3">{tickets.map((ticket) => <article key={ticket.id} className="foodiz-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-foodiz-cream">{ticket.subject}</p><p className="mt-1 text-[10px] text-foodiz-gray">{new Date(ticket.created_at).toLocaleString("fr-FR")}</p></div><span className={`rounded-full border px-2 py-1 text-[9px] uppercase ${["closed", "resolved"].includes(ticket.status) ? "border-foodiz-green/20 text-foodiz-green" : "border-foodiz-gold/20 text-foodiz-gold"}`}>{ticket.status}</span></div><p className="mt-3 text-xs text-foodiz-gray">{ticket.message}</p>{ticket.admin_response && <div className="mt-3 rounded-xl border border-foodiz-green/15 bg-foodiz-green/5 p-3"><p className="mb-1 text-[9px] uppercase text-foodiz-green">Réponse Foodiz</p><p className="text-xs text-foodiz-cream">{ticket.admin_response}</p></div>}</article>)}</div>}</section>
    </main>
  </div>;
}
