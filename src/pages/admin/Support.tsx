import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Crown,
  FileText,
  HeartHandshake,
  LifeBuoy,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TimerReset,
  UserRound,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

const activeStatuses = ["open", "in_progress"];
const closedStatuses = ["closed", "resolved"];

const CATEGORY_LABELS: Record<string, string> = {
  order: "Commande",
  payment: "Paiement",
  delivery: "Livraison",
  advantage: "Points & avantages",
  account: "Compte",
  partner: "Partenaire",
  courier: "Livreur",
  other: "Autre",
};

const ROLE_LABELS: Record<string, string> = {
  client: "Client",
  partner: "Partenaire",
  courier: "Livreur",
  admin: "Admin",
};

const SLA_HOURS: Record<string, number> = {
  urgent: 1,
  high: 4,
  normal: 24,
  low: 48,
};

const QUICK_REPLIES = [
  {
    title: "Demande prise en charge",
    category: "all",
    body: "Bonjour,\n\nMerci pour votre message. Je prends votre demande en charge et je vérifie les informations disponibles côté Foodiz afin de vous répondre précisément.\n\nL’équipe Foodiz",
  },
  {
    title: "Retard livraison",
    category: "delivery",
    body: "Bonjour,\n\nNous avons bien reçu votre signalement concernant la livraison. Foodiz vérifie le statut de la commande, l’estimation de trajet et les dernières mises à jour afin d’appliquer la solution la plus juste.\n\nMerci pour votre patience,\nL’équipe Foodiz",
  },
  {
    title: "Paiement sécurisé",
    category: "payment",
    body: "Bonjour,\n\nVotre demande liée au paiement est en cours de vérification. Pour votre sécurité, Foodiz ne vous demandera jamais vos informations complètes de carte bancaire par message.\n\nL’équipe Foodiz",
  },
  {
    title: "Dossier professionnel",
    category: "partner",
    body: "Bonjour,\n\nVotre dossier professionnel est en cours d’analyse. Nous vérifions les justificatifs transmis afin de garantir une activation conforme et sécurisée.\n\nL’équipe Foodiz",
  },
  {
    title: "Dossier livreur",
    category: "courier",
    body: "Bonjour,\n\nVotre dossier livreur est en cours de contrôle. Foodiz vérifie l’identité, le SIRET, le justificatif d’activité et la cohérence des informations avant toute activation opérationnelle.\n\nL’équipe Foodiz",
  },
];

function ageHours(ticket: any) {
  return Math.max(0, (Date.now() - new Date(ticket.created_at).getTime()) / 3600000);
}

function formatHours(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}j`;
}

function ticketSla(ticket: any) {
  const priority = ticket.priority || "normal";
  const target = SLA_HOURS[priority] || SLA_HOURS.normal;
  const age = ageHours(ticket);
  const remaining = target - age;
  return {
    target,
    age,
    remaining,
    overdue: activeStatuses.includes(ticket.status) && remaining < 0,
    soon: activeStatuses.includes(ticket.status) && remaining >= 0 && remaining <= Math.min(2, target / 2),
  };
}

function priorityRank(priority: string) {
  return { urgent: 0, high: 1, normal: 2, low: 3 }[priority] ?? 4;
}

function profileName(profile: any) {
  if (!profile) return "Utilisateur Foodiz";
  return profile.full_name
    || [profile.first_name, profile.last_name].filter(Boolean).join(" ")
    || profile.email
    || "Utilisateur Foodiz";
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    const [{ data: ticketRows, error }, { data: eventRows }] = await Promise.all([
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
      supabase.from("support_ticket_events").select("*").order("created_at", { ascending: false }).limit(250),
    ]);
    if (error) toast.error(error.message);

    const rows = ticketRows || [];
    const userIds = Array.from(new Set(rows.map((ticket) => ticket.user_id).filter(Boolean)));
    if (userIds.length) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id,role,email,first_name,last_name,full_name,phone,city")
        .in("id", userIds);
      setProfilesById(Object.fromEntries((profileRows || []).map((profile) => [profile.id, profile])));
    } else {
      setProfilesById({});
    }

    setTickets(rows);
    setEvents(eventRows || []);
    setLoading(false);
  };

  useEffect(() => {
    void fetchTickets();
    const channel = supabase.channel("foodiz_care_support_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => void fetchTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const enrichedTickets = useMemo(() => tickets.map((ticket) => {
    const profile = profilesById[ticket.user_id];
    const role = ticket.user_role || profile?.role || "client";
    const sla = ticketSla(ticket);
    return {
      ...ticket,
      profile,
      careRole: role,
      careCity: profile?.city || "Ville inconnue",
      careName: profileName(profile),
      sla,
    };
  }), [profilesById, tickets]);

  const stats = useMemo(() => {
    const active = enrichedTickets.filter((ticket) => activeStatuses.includes(ticket.status));
    const closedToday = enrichedTickets.filter((ticket) => {
      if (!closedStatuses.includes(ticket.status) || !ticket.resolved_at) return false;
      return new Date(ticket.resolved_at).toDateString() === new Date().toDateString();
    });
    return {
      active: active.length,
      urgent: active.filter((ticket) => ticket.priority === "urgent").length,
      overdue: active.filter((ticket) => ticket.sla.overdue).length,
      soon: active.filter((ticket) => ticket.sla.soon).length,
      closed: enrichedTickets.filter((ticket) => closedStatuses.includes(ticket.status)).length,
      closedToday: closedToday.length,
      avgAgeHours: active.length
        ? Math.round(active.reduce((sum, ticket) => sum + ticket.sla.age, 0) / active.length)
        : 0,
    };
  }, [enrichedTickets]);

  const cityOptions = useMemo(
    () => Array.from(new Set(enrichedTickets.map((ticket) => ticket.careCity).filter(Boolean))).sort(),
    [enrichedTickets],
  );

  const filteredTickets = useMemo(() => enrichedTickets
    .filter((ticket) => {
      const statusMatch = statusFilter === "all"
        || (statusFilter === "active" ? activeStatuses.includes(ticket.status) : closedStatuses.includes(ticket.status));
      const categoryMatch = categoryFilter === "all" || ticket.category === categoryFilter;
      const roleMatch = roleFilter === "all" || ticket.careRole === roleFilter;
      const cityMatch = cityFilter === "all" || ticket.careCity === cityFilter;
      const priorityMatch = priorityFilter === "all"
        || (priorityFilter === "overdue" ? ticket.sla.overdue : ticket.priority === priorityFilter);
      const haystack = [
        ticket.subject,
        ticket.message,
        ticket.user_email,
        ticket.careName,
        ticket.careCity,
        ticket.order_id,
      ].join(" ").toLowerCase();
      const searchMatch = !search.trim() || haystack.includes(search.trim().toLowerCase());
      return statusMatch && categoryMatch && roleMatch && cityMatch && priorityMatch && searchMatch;
    })
    .sort((a, b) => {
      if (a.sla.overdue !== b.sla.overdue) return a.sla.overdue ? -1 : 1;
      const priorityDelta = priorityRank(a.priority) - priorityRank(b.priority);
      if (priorityDelta !== 0) return priorityDelta;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }), [categoryFilter, cityFilter, enrichedTickets, priorityFilter, roleFilter, search, statusFilter]);

  const handleResolve = async (ticketId: string) => {
    if (!replyText.trim()) return toast.error("Écrivez une réponse avant de clôturer.");
    setBusy(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setBusy(false);
      return toast.error("Session admin expirée. Reconnectez-vous.");
    }
    try {
      const response = await fetch("/api/admin/support-ticket-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "resolve",
          ticketId,
          response: replyText.trim(),
          summary: replyText.trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Le ticket n’a pas pu être traité.");
      toast.success("Ticket traité, historisé et utilisateur notifié.");
      setReplyText("");
      setActiveTicketId(null);
      await fetchTickets();
    } catch (error: any) {
      toast.error(error?.message || "Le ticket n’a pas pu être traité.");
    }
    setBusy(false);
  };

  const eventCount = (ticketId: string) => events.filter((event) => event.ticket_id === ticketId).length;

  const applyQuickReply = (template: string) => {
    setReplyText((current) => current.trim() ? `${current.trim()}\n\n${template}` : template);
  };

  return (
    <AdminShell
      title="Foodiz Care Cockpit"
      subtitle="Pilotage support, satisfaction, SLA et sécurité relationnelle"
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "File active", value: stats.active, icon: LifeBuoy, color: "text-foodiz-gold", detail: "tickets ouverts" },
          { label: "Urgents", value: stats.urgent, icon: Zap, color: "text-foodiz-red", detail: "réponse < 1h" },
          { label: "SLA dépassé", value: stats.overdue, icon: TimerReset, color: stats.overdue ? "text-foodiz-red" : "text-foodiz-green", detail: "à reprendre vite" },
          { label: "À surveiller", value: stats.soon, icon: Clock3, color: "text-amber-300", detail: "échéance proche" },
          { label: "Traités aujourd’hui", value: stats.closedToday, icon: CheckCircle2, color: "text-foodiz-green", detail: `${stats.closed} au total` },
        ].map((item) => (
          <article
            key={item.label}
            className="foodiz-card border-foodiz-gold/15 bg-[radial-gradient(circle_at_top_right,rgba(216,168,79,0.13),transparent_42%)] p-5 shadow-[0_0_35px_rgba(216,168,79,0.04)]"
          >
            <item.icon size={20} className={item.color}/>
            <p className="mt-4 text-[10px] uppercase tracking-widest text-foodiz-gray">{item.label}</p>
            <p className="mt-2 text-3xl font-serif italic text-foodiz-cream">{item.value}</p>
            <p className="mt-1 text-[10px] text-foodiz-gray">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <article className="foodiz-card overflow-hidden border-foodiz-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,.12),rgba(8,8,8,.98)_35%,rgba(5,5,5,.98))]">
          <div className="border-b border-foodiz-gold/10 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-foodiz-gold/25 bg-foodiz-gold/10 text-foodiz-gold">
                <Crown size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.25em] text-foodiz-gold">Standard numéro 1</p>
                <h2 className="foodiz-title mt-1 text-2xl">Promesse Foodiz Care</h2>
                <p className="mt-2 text-sm leading-relaxed text-foodiz-gray">
                  Chaque ticket doit être lisible, priorisé, contextualisé et traité avec une réponse humaine. L’objectif : moins d’effort pour le client, plus de contrôle côté admin.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {[
              ["Urgent", "< 1h", "Retard critique, paiement, client bloqué"],
              ["Important", "< 4h", "Commande, dossier pro, incident sensible"],
              ["Normal", "< 24h", "Question compte, avantage, information"],
            ].map(([title, sla, detail]) => (
              <div key={title} className="rounded-2xl border border-foodiz-gold/10 bg-black/25 p-4">
                <p className="text-sm font-semibold text-foodiz-cream">{title}</p>
                <p className="mt-2 text-2xl font-serif italic text-foodiz-gold">{sla}</p>
                <p className="mt-2 text-[10px] leading-relaxed text-foodiz-gray">{detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="foodiz-card border-foodiz-gold/20 p-5">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck size={19} className="text-foodiz-gold" />
            <div>
              <h2 className="font-semibold text-foodiz-cream">Sécurité admin</h2>
              <p className="text-xs text-foodiz-gray">Réponses historisées via RPC, notification utilisateur, pas de données carte demandées.</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              "Ne jamais demander de carte bancaire complète.",
              "Ne jamais valider un dossier hors workflow admin.",
              "Toujours laisser une trace claire du motif de résolution.",
              "Escalader tout abus, fraude ou usurpation.",
            ].map((rule) => (
              <div key={rule} className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <Sparkles size={14} className="mt-0.5 shrink-0 text-foodiz-gold" />
                <p className="text-xs leading-relaxed text-foodiz-gray">{rule}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="foodiz-card border-foodiz-gold/15 p-4">
        <div className="mb-4 flex items-center gap-2 text-foodiz-gold">
          <SlidersHorizontal size={16} />
          <p className="text-[10px] font-black uppercase tracking-[.25em]">Pilotage de la file</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(5,minmax(120px,.6fr))_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-foodiz-gold/20 bg-foodiz-black px-3 py-2">
            <Search size={14} className="text-foodiz-gold" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher client, ville, commande…"
              className="w-full bg-transparent text-xs text-foodiz-cream outline-none placeholder:text-foodiz-gray"
            />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-foodiz-gold/20 bg-foodiz-black px-3 py-2 text-xs text-foodiz-cream">
            <option value="active">À traiter</option>
            <option value="closed">Historique traité</option>
            <option value="all">Toutes</option>
          </select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="rounded-xl border border-foodiz-gold/20 bg-foodiz-black px-3 py-2 text-xs text-foodiz-cream">
            <option value="all">Priorités</option>
            <option value="overdue">SLA dépassé</option>
            <option value="urgent">Urgent</option>
            <option value="high">Important</option>
            <option value="normal">Normal</option>
            <option value="low">Bas</option>
          </select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-xl border border-foodiz-gold/20 bg-foodiz-black px-3 py-2 text-xs text-foodiz-cream">
            <option value="all">Catégories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-xl border border-foodiz-gold/20 bg-foodiz-black px-3 py-2 text-xs text-foodiz-cream">
            <option value="all">Rôles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} className="rounded-xl border border-foodiz-gold/20 bg-foodiz-black px-3 py-2 text-xs text-foodiz-cream">
            <option value="all">Villes</option>
            {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
          <button onClick={() => void fetchTickets()} className="flex items-center justify-center gap-2 rounded-xl border border-foodiz-gold/20 px-4 py-2 text-xs text-foodiz-gold">
            <RefreshCw size={14}/>
            Actualiser
          </button>
        </div>
      </section>

      {loading ? (
        <div className="foodiz-card p-8 text-center text-foodiz-gray animate-pulse">Chargement de Foodiz Care...</div>
      ) : filteredTickets.length === 0 ? (
        <div className="foodiz-card p-8 text-center text-sm text-foodiz-gray">
          Aucune demande dans cette file. C’est calme — le meilleur bruit possible.
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {filteredTickets.map((ticket) => {
            const isActive = activeStatuses.includes(ticket.status);
            const availableReplies = QUICK_REPLIES.filter((reply) => reply.category === "all" || reply.category === ticket.category || reply.category === ticket.careRole);
            return (
              <article
                key={ticket.id}
                className={`foodiz-card overflow-hidden border-foodiz-gold/15 bg-[#070707] ${ticket.sla.overdue ? "ring-1 ring-foodiz-red/35" : isActive ? "shadow-[0_0_45px_rgba(216,168,79,0.07)]" : "opacity-80"}`}
              >
                <div className="border-b border-foodiz-gold/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <MessageSquare size={17} className="text-foodiz-gold"/>
                        <h2 className="font-semibold text-foodiz-cream">{ticket.subject}</h2>
                      </div>
                      <p className="text-[10px] text-foodiz-gray">
                        {ticket.careName} · {ticket.user_email || "email inconnu"} · {new Date(ticket.created_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] uppercase ${isActive ? "border-foodiz-gold/25 bg-foodiz-gold/10 text-foodiz-gold" : "border-foodiz-green/20 bg-foodiz-green/5 text-foodiz-green"}`}>
                      {isActive ? "À traiter" : "Traité"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] uppercase text-foodiz-gray">{CATEGORY_LABELS[ticket.category] || "Autre"}</span>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] uppercase text-foodiz-gray">{ROLE_LABELS[ticket.careRole] || ticket.careRole}</span>
                    <span className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[9px] text-foodiz-gray"><MapPin size={11}/>{ticket.careCity}</span>
                    <span className={`rounded-full border px-2 py-1 text-[9px] uppercase ${ticket.priority === "urgent" ? "border-foodiz-red/20 text-foodiz-red" : ticket.priority === "high" ? "border-foodiz-gold/20 text-foodiz-gold" : "border-white/10 text-foodiz-gray"}`}>{ticket.priority}</span>
                    {ticket.order_id && <span className="rounded-full border border-foodiz-gold/20 px-2 py-1 text-[9px] text-foodiz-gold">Commande #{ticket.order_id.slice(0, 8)}</span>}
                    <span className={`rounded-full border px-2 py-1 text-[9px] ${ticket.sla.overdue ? "border-foodiz-red/20 text-foodiz-red" : ticket.sla.soon ? "border-amber-300/20 text-amber-300" : "border-foodiz-green/20 text-foodiz-green"}`}>
                      {ticket.sla.overdue ? `SLA dépassé de ${formatHours(Math.abs(ticket.sla.remaining))}` : `SLA ${formatHours(Math.max(0, ticket.sla.remaining))}`}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                      <UserRound size={15} className="text-foodiz-gold"/>
                      <p className="mt-2 text-[10px] text-foodiz-gray">Contact</p>
                      <p className="mt-1 truncate text-xs text-foodiz-cream">{ticket.profile?.phone || "Téléphone non renseigné"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                      <Clock3 size={15} className="text-foodiz-gold"/>
                      <p className="mt-2 text-[10px] text-foodiz-gray">Âge</p>
                      <p className="mt-1 text-xs text-foodiz-cream">{formatHours(ticket.sla.age)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                      <FileText size={15} className="text-foodiz-gold"/>
                      <p className="mt-2 text-[10px] text-foodiz-gray">Historique</p>
                      <p className="mt-1 text-xs text-foodiz-cream">{eventCount(ticket.id)} événement(s)</p>
                    </div>
                  </div>

                  <p className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm leading-relaxed text-foodiz-gray whitespace-pre-wrap">
                    {ticket.message}
                  </p>

                  {ticket.diagnostic && Object.keys(ticket.diagnostic).length > 0 && (
                    <div className="rounded-2xl border border-foodiz-gold/10 bg-foodiz-gold/[0.03] p-4">
                      <p className="mb-2 flex items-center gap-2 text-[10px] uppercase text-foodiz-gold">
                        <Sparkles size={13}/>
                        Diagnostic automatique
                      </p>
                      <p className="text-xs text-foodiz-gray">
                        {ticket.diagnostic.title || ticket.diagnostic.diagnosis || "Contexte disponible"}
                      </p>
                      {ticket.diagnostic.explanation && <p className="mt-2 text-[10px] leading-relaxed text-foodiz-gray">{ticket.diagnostic.explanation}</p>}
                      {ticket.attempted_actions?.length > 0 && <p className="mt-2 text-[10px] text-foodiz-gray">Déjà tenté : {ticket.attempted_actions.join(", ")}</p>}
                    </div>
                  )}

                  {ticket.admin_response && (
                    <div className="rounded-2xl border border-foodiz-green/15 bg-foodiz-green/[0.04] p-4">
                      <p className="mb-1 text-[10px] uppercase text-foodiz-green">Réponse Foodiz</p>
                      <p className="text-sm text-foodiz-cream whitespace-pre-wrap">{ticket.admin_response}</p>
                      {ticket.resolved_at && <p className="mt-2 text-[10px] text-foodiz-gray">Traité le {new Date(ticket.resolved_at).toLocaleString("fr-FR")}</p>}
                    </div>
                  )}

                  {isActive && (
                    activeTicketId === ticket.id ? (
                      <div className="space-y-3 rounded-2xl border border-foodiz-gold/15 bg-black/25 p-4">
                        <div>
                          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-foodiz-gold">
                            <HeartHandshake size={13}/>
                            Réponses rapides
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {availableReplies.map((reply) => (
                              <button
                                key={reply.title}
                                type="button"
                                onClick={() => applyQuickReply(reply.body)}
                                className="rounded-full border border-foodiz-gold/20 px-3 py-1.5 text-[10px] text-foodiz-gold transition hover:bg-foodiz-gold/10"
                              >
                                {reply.title}
                              </button>
                            ))}
                          </div>
                        </div>
                        <textarea
                          value={replyText}
                          onChange={(event) => setReplyText(event.target.value)}
                          placeholder="Réponse au client et résumé de traitement..."
                          className="h-32 w-full resize-none rounded-2xl border border-foodiz-gold/25 bg-foodiz-black p-4 text-sm text-foodiz-cream outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setActiveTicketId(null)} className="rounded-xl px-4 py-2 text-xs text-foodiz-gray">Annuler</button>
                          <button disabled={busy} onClick={() => void handleResolve(ticket.id)} className="foodiz-btn flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-50">
                            <Send size={14}/>
                            Traiter et historiser
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setActiveTicketId(ticket.id); setReplyText(ticket.admin_response || ""); }}
                        className="foodiz-btn-outline flex items-center gap-2 px-4 py-2 text-xs"
                      >
                        <MessageSquare size={14}/>
                        Traiter ce ticket
                      </button>
                    )
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </AdminShell>
  );
}
