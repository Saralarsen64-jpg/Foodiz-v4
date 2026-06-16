import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, LifeBuoy, MessageSquare, RefreshCw, Send, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

const activeStatuses = ["open", "in_progress"];

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    const [{ data: ticketRows, error }, { data: eventRows }] = await Promise.all([
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
      supabase.from("support_ticket_events").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (error) toast.error(error.message);
    setTickets(ticketRows || []);
    setEvents(eventRows || []);
    setLoading(false);
  };

  useEffect(() => {
    void fetchTickets();
    const channel = supabase.channel("support_tickets_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => void fetchTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const stats = useMemo(() => ({
    active: tickets.filter((ticket) => activeStatuses.includes(ticket.status)).length,
    urgent: tickets.filter((ticket) => activeStatuses.includes(ticket.status) && ticket.priority === "urgent").length,
    closed: tickets.filter((ticket) => ["closed", "resolved"].includes(ticket.status)).length,
    avgAgeHours: (() => {
      const active = tickets.filter((ticket) => activeStatuses.includes(ticket.status));
      if (!active.length) return 0;
      return Math.round(active.reduce((sum, ticket) => sum + (Date.now() - new Date(ticket.created_at).getTime()) / 3600000, 0) / active.length);
    })(),
  }), [tickets]);

  const filteredTickets = tickets.filter((ticket) => {
    const statusMatch = statusFilter === "all"
      || (statusFilter === "active" ? activeStatuses.includes(ticket.status) : ["closed", "resolved"].includes(ticket.status));
    return statusMatch && (categoryFilter === "all" || ticket.category === categoryFilter);
  });

  const handleResolve = async (ticketId: string) => {
    if (!replyText.trim()) return toast.error("Écrivez une réponse avant de clôturer.");
    setBusy(true);
    const { error } = await supabase.rpc("admin_resolve_support_ticket", {
      target_ticket_id: ticketId,
      target_response: replyText.trim(),
      target_summary: replyText.trim(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Ticket traité, historisé et utilisateur notifié.");
      setReplyText("");
      setActiveTicketId(null);
      await fetchTickets();
    }
    setBusy(false);
  };

  const eventCount = (ticketId: string) => events.filter((event) => event.ticket_id === ticketId).length;

  return <AdminShell title="Support client" subtitle="File de traitement, diagnostic automatique et historique des demandes résolues">
    <section className="grid gap-4 md:grid-cols-4">
      {[
        { label: "À traiter", value: stats.active, icon: LifeBuoy, color: "text-foodiz-gold" },
        { label: "Urgents", value: stats.urgent, icon: AlertCircle, color: "text-foodiz-red" },
        { label: "Historique", value: stats.closed, icon: CheckCircle2, color: "text-foodiz-green" },
        { label: "Âge moyen", value: `${stats.avgAgeHours}h`, icon: Clock3, color: "text-foodiz-cream" },
      ].map((item) => <article key={item.label} className="foodiz-card border-foodiz-gold/15 bg-[radial-gradient(circle_at_top_right,rgba(216,168,79,0.12),transparent_42%)] p-5 shadow-[0_0_35px_rgba(216,168,79,0.04)]"><item.icon size={20} className={item.color}/><p className="mt-4 text-[10px] uppercase tracking-widest text-foodiz-gray">{item.label}</p><p className="mt-2 text-3xl font-serif italic text-foodiz-cream">{item.value}</p></article>)}
    </section>

    <section className="foodiz-card flex flex-wrap items-center gap-3 p-4">
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-foodiz-gold/20 bg-foodiz-black px-3 py-2 text-xs text-foodiz-cream">
        <option value="active">À traiter</option><option value="closed">Historique traité</option><option value="all">Toutes</option>
      </select>
      <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-xl border border-foodiz-gold/20 bg-foodiz-black px-3 py-2 text-xs text-foodiz-cream">
        <option value="all">Toutes catégories</option>{["order","payment","delivery","advantage","account","partner","courier","other"].map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
      <button onClick={() => void fetchTickets()} className="ml-auto flex items-center gap-2 rounded-xl border border-foodiz-gold/20 px-4 py-2 text-xs text-foodiz-gold"><RefreshCw size={14}/>Actualiser</button>
    </section>

    {loading ? <div className="foodiz-card p-8 text-center text-foodiz-gray animate-pulse">Chargement des demandes...</div> : filteredTickets.length === 0 ? <div className="foodiz-card p-8 text-center text-sm text-foodiz-gray">Aucune demande dans cette file.</div> : <section className="grid gap-4 xl:grid-cols-2">
      {filteredTickets.map((ticket) => {
        const isActive = activeStatuses.includes(ticket.status);
        const age = Math.max(0, Math.round((Date.now() - new Date(ticket.created_at).getTime()) / 3600000));
        return <article key={ticket.id} className={`foodiz-card overflow-hidden border-foodiz-gold/15 bg-[#070707] ${isActive ? "shadow-[0_0_45px_rgba(216,168,79,0.07)]" : "opacity-80"}`}>
          <div className="border-b border-foodiz-gold/10 p-5">
            <div className="flex items-start justify-between gap-4">
              <div><div className="mb-2 flex items-center gap-2"><MessageSquare size={17} className="text-foodiz-gold"/><h2 className="font-semibold text-foodiz-cream">{ticket.subject}</h2></div><p className="text-[10px] text-foodiz-gray">De {ticket.user_email || "utilisateur"} · {new Date(ticket.created_at).toLocaleString("fr-FR")} · {age}h</p></div>
              <span className={`rounded-full border px-3 py-1 text-[10px] uppercase ${isActive ? "border-foodiz-gold/25 bg-foodiz-gold/10 text-foodiz-gold" : "border-foodiz-green/20 bg-foodiz-green/5 text-foodiz-green"}`}>{isActive ? "À traiter" : "Traité"}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full border border-white/10 px-2 py-1 text-[9px] uppercase text-foodiz-gray">{ticket.category || "other"}</span><span className={`rounded-full border px-2 py-1 text-[9px] uppercase ${ticket.priority === "urgent" ? "border-foodiz-red/20 text-foodiz-red" : ticket.priority === "high" ? "border-foodiz-gold/20 text-foodiz-gold" : "border-white/10 text-foodiz-gray"}`}>{ticket.priority}</span>{ticket.order_id && <span className="rounded-full border border-foodiz-gold/20 px-2 py-1 text-[9px] text-foodiz-gold">Commande #{ticket.order_id.slice(0, 8)}</span>}<span className="rounded-full border border-white/10 px-2 py-1 text-[9px] text-foodiz-gray">{eventCount(ticket.id)} événement(s)</span></div>
          </div>
          <div className="space-y-4 p-5">
            <p className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm leading-relaxed text-foodiz-gray whitespace-pre-wrap">{ticket.message}</p>
            {ticket.diagnostic && Object.keys(ticket.diagnostic).length > 0 && <div className="rounded-2xl border border-foodiz-gold/10 bg-foodiz-gold/[0.03] p-4"><p className="mb-2 flex items-center gap-2 text-[10px] uppercase text-foodiz-gold"><Sparkles size={13}/>Diagnostic automatique</p><p className="text-xs text-foodiz-gray">{ticket.diagnostic.title || ticket.diagnostic.diagnosis || "Contexte disponible"}</p>{ticket.attempted_actions?.length > 0 && <p className="mt-2 text-[10px] text-foodiz-gray">Déjà tenté : {ticket.attempted_actions.join(", ")}</p>}</div>}
            {ticket.admin_response && <div className="rounded-2xl border border-foodiz-green/15 bg-foodiz-green/[0.04] p-4"><p className="mb-1 text-[10px] uppercase text-foodiz-green">Réponse Foodiz</p><p className="text-sm text-foodiz-cream whitespace-pre-wrap">{ticket.admin_response}</p>{ticket.resolved_at && <p className="mt-2 text-[10px] text-foodiz-gray">Traité le {new Date(ticket.resolved_at).toLocaleString("fr-FR")}</p>}</div>}
            {isActive && (activeTicketId === ticket.id ? <div className="space-y-3"><textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder="Réponse au client et résumé de traitement..." className="h-28 w-full resize-none rounded-2xl border border-foodiz-gold/25 bg-foodiz-black p-4 text-sm text-foodiz-cream outline-none"/><div className="flex justify-end gap-2"><button onClick={() => setActiveTicketId(null)} className="rounded-xl px-4 py-2 text-xs text-foodiz-gray">Annuler</button><button disabled={busy} onClick={() => void handleResolve(ticket.id)} className="foodiz-btn flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-50"><Send size={14}/>Traiter et historiser</button></div></div> : <button onClick={() => { setActiveTicketId(ticket.id); setReplyText(ticket.admin_response || ""); }} className="foodiz-btn-outline flex items-center gap-2 px-4 py-2 text-xs"><MessageSquare size={14}/>Traiter ce ticket</button>)}
          </div>
        </article>;
      })}
    </section>}
  </AdminShell>;
}
