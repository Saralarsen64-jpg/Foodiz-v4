import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, Clock3, CreditCard, Gift, LifeBuoy, LockKeyhole, MapPin, Package, RefreshCw, Send, ShieldCheck, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";

type Category = "order" | "payment" | "delivery" | "advantage" | "account" | "other";

const CATEGORIES = [
  { key: "order" as Category, label: "Ma commande", icon: Package, needsOrder: true },
  { key: "payment" as Category, label: "Paiement", icon: CreditCard, needsOrder: true },
  { key: "delivery" as Category, label: "Livraison", icon: MapPin, needsOrder: true },
  { key: "advantage" as Category, label: "Points & avantage", icon: Gift, needsOrder: false },
  { key: "account" as Category, label: "Mon compte", icon: LockKeyhole, needsOrder: false },
  { key: "other" as Category, label: "Autre demande", icon: CircleHelp, needsOrder: false },
];

const FAQ_ITEMS = [
  {
    title: "Je n’ai pas encore accès à Foodiz",
    text: "Pendant le pré-lancement, les clients sont prévenus par email lorsque Foodiz ouvre dans leur ville. Suivez aussi @foodiz_off.",
  },
  {
    title: "Une commande semble bloquée",
    text: "Choisissez la commande concernée : Foodiz vérifie le paiement, le statut et la livraison avant de créer une demande.",
  },
  {
    title: "Mes points ou avantages ne s’affichent pas",
    text: "Le diagnostic contrôle votre solde Foodiz Club et l’avantage verrouillé avant de solliciter le support.",
  },
];

const SUPPORT_PROMISES = [
  { label: "Sécurité", icon: ShieldCheck },
  { label: "Diagnostic", icon: RefreshCw },
  { label: "Suivi", icon: Clock3 },
];

function statusLabel(status: string) {
  const labels: Record<string, string> = { pending: "paiement en attente", preparing: "en préparation", ready: "prête au restaurant", pickup: "prise en charge", picked_up: "récupérée", delivering: "en livraison", delivered: "livrée", cancelled: "annulée" };
  return labels[status] || status;
}

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    setUser(authUser);
    const [ordersResult, ticketsResult] = await Promise.all([
      supabase.from("orders").select("id,status,payment_status,final_client_total_cents,created_at,updated_at,restaurant:restaurants(name)").eq("client_id", authUser.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("support_tickets").select("*").eq("user_id", authUser.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setOrders(ordersResult.data || []);
    setTickets(ticketsResult.data || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);
  const selectedOrder = useMemo(() => orders.find((order) => order.id === orderId), [orders, orderId]);
  const selectedCategory = CATEGORIES.find((item) => item.key === category);

  const runDiagnosis = async () => {
    if (!category || (selectedCategory?.needsOrder && !selectedOrder)) return;
    const ageMinutes = selectedOrder ? (Date.now() - new Date(selectedOrder.updated_at || selectedOrder.created_at).getTime()) / 60000 : 0;
    let result: any = { resolved: false, priority: "normal", title: "Nous avons besoin de quelques précisions", explanation: "Décrivez ce qui se passe afin que notre équipe dispose du contexte complet.", action: null, attempted: ["Diagnostic guidé lancé"] };

    if (category === "order" && selectedOrder) {
      if (selectedOrder.status === "delivered") result = { resolved: true, title: "Cette commande est indiquée comme livrée", explanation: "Vous pouvez consulter son détail ou signaler un problème précis avec les articles reçus.", action: { label: "Voir la commande", path: `/client/orders/${orderId}` }, priority: "normal", attempted: ["Statut de commande vérifié"] };
      else if (selectedOrder.status === "cancelled") result = { resolved: false, title: "Cette commande a été annulée", explanation: "Un conseiller doit vérifier la raison de l'annulation si elle ne vous paraît pas normale.", priority: "high", attempted: ["Annulation confirmée dans Foodiz"] };
      else result = { resolved: true, title: `Votre commande est ${statusLabel(selectedOrder.status)}`, explanation: "Son statut est bien actif. Le suivi affiche les prochaines étapes en temps réel.", action: { label: "Ouvrir le suivi", path: `/client/orders/${orderId}/tracking` }, priority: "normal", attempted: ["Statut de commande vérifié"] };
    }

    if (category === "payment" && selectedOrder) {
      if (selectedOrder.payment_status === "completed") result = { resolved: true, title: "Le paiement est confirmé", explanation: "Foodiz a bien enregistré le paiement de cette commande.", action: { label: "Voir la commande", path: `/client/orders/${orderId}` }, priority: "normal", attempted: ["Statut du paiement vérifié"] };
      else if (selectedOrder.payment_status === "failed") result = { resolved: false, title: "Le paiement a échoué", explanation: "Aucun paiement confirmé n'est enregistré. Ne communiquez jamais vos informations bancaires au support.", priority: "high", attempted: ["Échec du paiement confirmé"] };
      else if (ageMinutes < 15) result = { resolved: true, title: "Le paiement est encore en cours de traitement", explanation: "Patientez quelques minutes puis actualisez la commande. Ne relancez pas plusieurs paiements simultanément.", action: { label: "Actualiser", path: `/client/orders/${orderId}` }, priority: "normal", attempted: ["Délai du paiement contrôlé"] };
      else result = { resolved: false, title: "Le paiement semble bloqué", explanation: "Le délai normal est dépassé. Le support vérifiera la transaction sans vous demander vos données de carte.", priority: "urgent", attempted: ["Statut et ancienneté du paiement vérifiés"] };
    }

    if (category === "delivery" && selectedOrder) {
      if (selectedOrder.status === "delivered") result = { resolved: true, title: "La livraison est terminée", explanation: "Si vous n'avez rien reçu malgré ce statut, créez un ticket urgent ci-dessous.", action: { label: "Voir la commande", path: `/client/orders/${orderId}` }, priority: "urgent", attempted: ["Statut de livraison vérifié"] };
      else if (["pickup", "picked_up", "delivering"].includes(selectedOrder.status) && ageMinutes > 45) result = { resolved: false, title: "La livraison n'évolue plus normalement", explanation: "Le support recevra automatiquement le statut et l'ancienneté de la dernière mise à jour.", priority: "urgent", attempted: ["Progression et délai de livraison contrôlés"] };
      else result = { resolved: true, title: `Livraison : ${statusLabel(selectedOrder.status)}`, explanation: "Le suivi en direct contient la position et les prochaines étapes disponibles.", action: { label: "Voir le suivi", path: `/client/orders/${orderId}/tracking` }, priority: "normal", attempted: ["Progression de livraison vérifiée"] };
    }

    if (category === "advantage") {
      const [{ data: wallet }, { data: locked }] = await Promise.all([
        supabase.from("client_wallets").select("points_balance").eq("user_id", user.id).single(),
        supabase.from("client_locked_advantages").select("title,points_cost").eq("user_id", user.id).maybeSingle(),
      ]);
      result = locked
        ? { resolved: true, title: `Avantage verrouillé : ${locked.title}`, explanation: `Votre solde est de ${wallet?.points_balance || 0} points. L'avantage coûte ${locked.points_cost} points et sera débité uniquement après paiement confirmé.`, action: { label: "Voir Foodiz Club", path: "/client/advantages" }, priority: "normal", attempted: ["Solde et avantage verrouillé vérifiés"] }
        : { resolved: true, title: "Aucun avantage n'est verrouillé", explanation: `Votre solde est de ${wallet?.points_balance || 0} points. Choisissez un avantage dans Foodiz Club avant de passer commande.`, action: { label: "Choisir un avantage", path: "/client/advantages" }, priority: "normal", attempted: ["Solde Foodiz Club vérifié"] };
    }

    if (category === "account") result = { resolved: true, title: "Gérez votre compte directement", explanation: "Vous pouvez modifier vos informations et adresses, ou demander un nouveau mot de passe depuis l'écran de connexion.", action: { label: "Mes informations", path: "/client/account/personal-info" }, priority: "normal", attempted: ["Solutions autonomes du compte proposées"] };
    setDiagnosis(result);
  };

  const createTicket = async () => {
    if (!user || !category || !message.trim()) return;
    setSending(true);
    let duplicateQuery = supabase.from("support_tickets").select("id").eq("user_id", user.id).eq("category", category).in("status", ["open", "in_progress"]);
    duplicateQuery = orderId ? duplicateQuery.eq("order_id", orderId) : duplicateQuery.is("order_id", null);
    const { data: duplicate } = await duplicateQuery.limit(1).maybeSingle();
    if (duplicate) {
      toast.error("Une demande similaire est déjà en cours de traitement.");
      setSending(false);
      return;
    }
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id, user_email: user.email, user_role: "client", category,
      subcategory: diagnosis?.title || null, order_id: orderId || null,
      subject: `${selectedCategory?.label || "Support"}${orderId ? ` - #${orderId.slice(0, 8)}` : ""}`,
      message: message.trim(), status: "open", priority: diagnosis?.priority || "normal",
      source: "guided", diagnostic: { order_status: selectedOrder?.status, payment_status: selectedOrder?.payment_status, diagnosis: diagnosis?.title, explanation: diagnosis?.explanation },
      attempted_actions: diagnosis?.attempted || [],
    });
    if (error) toast.error("Impossible d'envoyer la demande.");
    else { toast.success("Demande envoyée avec son diagnostic."); setMessage(""); setDiagnosis(null); setCategory(null); setOrderId(""); await load(); }
    setSending(false);
  };

  return (
    <div className="relative min-h-screen border-x-2 border-foodiz-gold/20 bg-foodiz-black pb-24 animate-fade-in-up">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(216,168,79,.13),transparent_35%)]" />
      <header className="sticky top-0 z-30 border-b border-foodiz-gold/10 bg-foodiz-card/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <button onClick={() => navigate('/client/account')} className="text-foodiz-gold">
            <ChevronLeft size={24}/>
          </button>
          <h1 className="foodiz-title text-lg">Centre d'aide</h1>
          <div className="w-6"/>
        </div>
      </header>

      <main className="relative mx-auto max-w-lg space-y-8 px-4 py-8">
        <section className="rounded-[2rem] border border-foodiz-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,.16),rgba(17,17,17,.98)_48%,rgba(7,7,7,.98))] p-6 shadow-[0_25px_70px_rgba(0,0,0,.38)]">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-foodiz-gold/25 bg-foodiz-gold/10 text-foodiz-gold">
              <Sparkles size={24}/>
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.25em] text-foodiz-gold">Support Foodiz</p>
              <h2 className="foodiz-title mt-2 text-2xl">On vous aide sans vous faire tourner en rond.</h2>
              <p className="mt-3 text-sm leading-relaxed text-foodiz-gray">
                Foodiz vérifie d'abord les informations disponibles puis crée une demande claire, priorisée et exploitable.
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {SUPPORT_PROMISES.map(({ label, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-foodiz-gold/10 bg-black/25 p-3 text-center">
                <Icon size={17} className="mx-auto text-foodiz-gold"/>
                <p className="mt-2 text-[10px] font-semibold text-foodiz-gray">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="foodiz-title text-xl">Que se passe-t-il ?</h2>
          <p className="mt-2 text-sm text-foodiz-gray">Choisissez le sujet : Foodiz vous guide étape par étape.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {CATEGORIES.map((item) => (
              <button
                key={item.key}
                onClick={() => { setCategory(item.key); setDiagnosis(null); }}
                className={`foodiz-card p-4 text-left transition-all ${category === item.key ? 'border-foodiz-gold bg-foodiz-gold/5' : 'border-foodiz-gold/10'}`}
              >
                <item.icon size={19} className="text-foodiz-gold"/>
                <p className="mt-3 text-sm text-foodiz-cream">{item.label}</p>
              </button>
            ))}
          </div>
        </section>

        {category && (
          <section className="foodiz-card space-y-4 p-5">
            <h3 className="foodiz-title text-base">Diagnostic guidé</h3>
            {selectedCategory?.needsOrder && (
              <select
                value={orderId}
                onChange={(e) => { setOrderId(e.target.value); setDiagnosis(null); }}
                className="w-full rounded-xl border border-foodiz-gold/20 bg-foodiz-black p-3 text-sm text-foodiz-cream"
              >
                <option value="">Choisir la commande concernée</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    #{order.id.slice(0,8)} · {order.restaurant?.name || 'Établissement'} · {new Date(order.created_at).toLocaleDateString('fr-FR')}
                  </option>
                ))}
              </select>
            )}
            <button onClick={runDiagnosis} disabled={selectedCategory?.needsOrder && !orderId} className="foodiz-btn flex w-full items-center justify-center gap-2 py-3 disabled:opacity-40">
              <RefreshCw size={15}/>
              Analyser ma situation
            </button>
          </section>
        )}

        {diagnosis && (
          <section className={`foodiz-card border p-5 ${diagnosis.resolved ? 'border-foodiz-green/20 bg-foodiz-green/5' : 'border-foodiz-gold/20'}`}>
            <div className="flex gap-3">
              {diagnosis.resolved ? <CheckCircle2 className="shrink-0 text-foodiz-green"/> : <AlertCircle className="shrink-0 text-foodiz-gold"/>}
              <div>
                <h3 className="font-semibold text-foodiz-cream">{diagnosis.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-foodiz-gray">{diagnosis.explanation}</p>
              </div>
            </div>
            {diagnosis.action && (
              <button onClick={() => navigate(diagnosis.action.path)} className="mt-4 flex items-center gap-1 text-xs text-foodiz-gold">
                {diagnosis.action.label}<ChevronRight size={14}/>
              </button>
            )}
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="mb-3 text-xs text-foodiz-gray">Le problème n'est pas résolu ? Décrivez uniquement ce qui manque.</p>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Précisez le problème rencontré..." className="h-24 w-full resize-none rounded-xl border border-foodiz-gold/20 bg-foodiz-black p-3 text-sm text-foodiz-cream outline-none"/>
              <button disabled={sending || !message.trim()} onClick={createTicket} className="foodiz-btn mt-3 flex w-full items-center justify-center gap-2 py-3 disabled:opacity-40">
                <Send size={15}/>{sending ? 'Envoi...' : 'Transmettre au support'}
              </button>
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="foodiz-title text-lg">Réponses rapides</h2>
          {FAQ_ITEMS.map((item) => (
            <article key={item.title} className="rounded-2xl border border-foodiz-gold/10 bg-white/[0.02] p-4">
              <h3 className="text-sm font-semibold text-foodiz-cream">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-foodiz-gray">{item.text}</p>
            </article>
          ))}
        </section>

        <section>
          <h2 className="foodiz-title mb-4 flex items-center gap-2 text-lg">
            <LifeBuoy size={18} className="text-foodiz-gold"/>
            Mes demandes
          </h2>
          {loading ? (
            <p className="animate-pulse text-sm text-foodiz-gray">Chargement...</p>
          ) : tickets.length === 0 ? (
            <div className="foodiz-card p-5 text-center text-xs text-foodiz-gray">Aucune demande en cours.</div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="foodiz-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foodiz-cream">{ticket.subject}</p>
                      <p className="mt-1 text-[10px] text-foodiz-gray">{new Date(ticket.created_at).toLocaleString('fr-FR')}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[9px] uppercase ${ticket.status === 'closed' || ticket.status === 'resolved' ? 'border-foodiz-green/20 text-foodiz-green' : 'border-foodiz-gold/20 text-foodiz-gold'}`}>{ticket.status}</span>
                  </div>
                  <p className="mt-3 text-xs text-foodiz-gray">{ticket.message}</p>
                  {ticket.admin_response && (
                    <div className="mt-3 rounded-xl border border-foodiz-green/15 bg-foodiz-green/5 p-3">
                      <p className="mb-1 text-[9px] uppercase text-foodiz-green">Réponse Foodiz</p>
                      <p className="text-xs text-foodiz-cream">{ticket.admin_response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
