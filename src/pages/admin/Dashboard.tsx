import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  Wallet,
  Users,
  Bike,
  Store,
  LifeBuoy,
  ChevronRight,
  AlertTriangle,
  Clock3,
  BarChart3,
  Megaphone,
} from "lucide-react";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";
import { loadSupportTickets } from "../../utils/supportStore";
import { loadSubscriptions } from "../../utils/subscriptionStore";
import { loadCampaigns } from "../../utils/marketingStore";

type AdminStats = {
  totalRevenueCents: number;
  pendingPayoutsCents: number;
  clientsCount: number;
  partnersCount: number;
  couriersCount: number;
  partnerPendingCount: number;
  courierPendingCount: number;
  supportOpenCount: number;
  activeSubscriptionsCount: number;
  campaignsCount: number;
};

const INITIAL_STATS: AdminStats = {
  totalRevenueCents: 0,
  pendingPayoutsCents: 0,
  clientsCount: 0,
  partnersCount: 0,
  couriersCount: 0,
  partnerPendingCount: 0,
  courierPendingCount: 0,
  supportOpenCount: 0,
  activeSubscriptionsCount: 0,
  campaignsCount: 0,
};

function money(cents: number) {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [
          clientsRes,
          partnersRes,
          couriersRes,
          partnerPendingRes,
          courierPendingRes,
          ordersRes,
        ] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "partner"),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "courier"),
          supabase.from("partner_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("courier_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("orders").select("customer_total", { count: "exact" }).limit(1000),
        ]);

        const supportTickets = loadSupportTickets();
        const subscriptions = loadSubscriptions();
        const campaigns = loadCampaigns();
        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];

        const totalRevenueCents = orders.reduce((sum: number, order: any) => {
          const euros = Number(order?.customer_total || 0);
          return sum + Math.round(euros * 100);
        }, 0);

        const pendingPayoutsCents = 158920;

        setStats({
          totalRevenueCents,
          pendingPayoutsCents,
          clientsCount: clientsRes.count || 0,
          partnersCount: partnersRes.count || 0,
          couriersCount: couriersRes.count || 0,
          partnerPendingCount: partnerPendingRes.count || 0,
          courierPendingCount: courierPendingRes.count || 0,
          supportOpenCount: supportTickets.filter((t) => t.status === "open").length,
          activeSubscriptionsCount: subscriptions.filter((s) => s.status === "active").length,
          campaignsCount: campaigns.length,
        });
      } catch {
        setStats({
          ...INITIAL_STATS,
          supportOpenCount: loadSupportTickets().filter((t) => t.status === "open").length,
          activeSubscriptionsCount: loadSubscriptions().filter((s) => s.status === "active").length,
          campaignsCount: loadCampaigns().length,
        });
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const kpis = [
    { label: "CA plateforme", value: money(stats.totalRevenueCents), icon: DollarSign, tone: "gold" },
    { label: "Virements à traiter", value: money(stats.pendingPayoutsCents), icon: Wallet, tone: "gold" },
    { label: "Clients actifs", value: String(stats.clientsCount), icon: Users, tone: "cream" },
    { label: "Partenaires", value: String(stats.partnersCount), icon: Store, tone: "cream" },
    { label: "Livreurs", value: String(stats.couriersCount), icon: Bike, tone: "green" },
    { label: "Abonnements Foodiz+", value: String(stats.activeSubscriptionsCount), icon: Megaphone, tone: "gold" },
  ];

  const urgentTasks = [
    {
      title: "Partenaires à valider",
      count: stats.partnerPendingCount,
      action: () => navigate("/admin/partner-applications"),
      cta: "Traiter",
    },
    {
      title: "Livreurs à valider",
      count: stats.courierPendingCount,
      action: () => navigate("/admin/courier-applications"),
      cta: "Traiter",
    },
    {
      title: "Tickets support ouverts",
      count: stats.supportOpenCount,
      action: () => navigate("/admin/support"),
      cta: "Voir",
    },
    {
      title: "Campagnes Foodiz+",
      count: stats.campaignsCount,
      action: () => navigate("/admin/marketing-campaigns"),
      cta: "Analyser",
    },
  ];

  const modules = [
    { label: "Économie", desc: "Répartition Foodiz complète", path: "/admin/economics", icon: BarChart3 },
    { label: "Virements", desc: "Décaissements partenaire & livreur", path: "/admin/payouts", icon: Wallet },
    { label: "Support", desc: "Demandes remontées client / partner / courier", path: "/admin/support", icon: LifeBuoy },
    { label: "Abonnements", desc: "Foodiz+ et revenus récurrents", path: "/admin/subscriptions", icon: Megaphone },
  ];

  return (
    <AdminShell
      title="Cockpit Admin Foodiz"
      subtitle="Supervision plateforme, validations, support et performance"
    >
      <div className="foodiz-card p-6 bg-[linear-gradient(135deg,rgba(216,168,79,0.12),rgba(17,17,17,0.96)_30%,rgba(5,5,5,1)_100%)] border-foodiz-gold/20 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-foodiz-gold font-bold mb-2">Direction & exploitation</p>
            <h2 className="foodiz-title text-3xl mb-2">Vue consolidée de la plateforme</h2>
            <p className="text-foodiz-gray text-sm max-w-2xl leading-relaxed">
              Gardez la main sur les flux financiers, les validations, les tickets support et les abonnements Foodiz+ depuis un centre de contrôle unique.
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-foodiz-gold/10 bg-white/[0.02] p-5 min-w-[250px]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-foodiz-gray font-bold mb-2">État plateforme</p>
            <p className="text-foodiz-gold text-3xl font-serif italic font-bold">{loading ? "…" : money(stats.totalRevenueCents)}</p>
            <p className="text-foodiz-gray text-xs mt-2">Revenu client total actuellement remonté</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="foodiz-card p-5 bg-[linear-gradient(145deg,rgba(216,168,79,0.05),rgba(17,17,17,0.98)_25%,rgba(10,10,10,1)_100%)]">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-foodiz-gold/10 border border-foodiz-gold/15 flex items-center justify-center">
                <kpi.icon size={18} className={kpi.tone === "green" ? "text-foodiz-green" : kpi.tone === "cream" ? "text-foodiz-cream" : "text-foodiz-gold"} />
              </div>
            </div>
            <p className="text-2xl font-serif italic text-foodiz-cream font-bold">{loading ? "…" : kpi.value}</p>
            <p className="text-[10px] text-foodiz-gray mt-1 uppercase tracking-widest">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="foodiz-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-foodiz-gold" />
            <h3 className="foodiz-title text-lg">Tâches admin à réaliser</h3>
          </div>
          <div className="space-y-3">
            {urgentTasks.map((task) => (
              <button
                key={task.title}
                onClick={task.action}
                className="w-full rounded-[1.2rem] border border-foodiz-gold/10 bg-white/[0.02] hover:border-foodiz-gold/25 transition-all p-4 flex items-center justify-between text-left"
              >
                <div>
                  <p className="text-sm text-foodiz-cream font-medium">{task.title}</p>
                  <p className="text-[10px] text-foodiz-gray mt-1 uppercase tracking-widest">{task.count} élément(s)</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-foodiz-gold text-xl font-serif italic font-bold">{task.count}</span>
                  <span className="text-[10px] text-foodiz-gold uppercase tracking-widest">{task.cta}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="foodiz-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock3 size={16} className="text-foodiz-gold" />
            <h3 className="foodiz-title text-lg">Vision rapide</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-[1.2rem] border border-foodiz-gold/10 bg-white/[0.02] p-4">
              <p className="text-foodiz-cream font-medium">Priorité du jour</p>
              <p className="text-foodiz-gray text-xs mt-2 leading-relaxed">
                Traiter d’abord les validations en attente et les tickets support ouverts avant les virements de fin de journée.
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-foodiz-gold/10 bg-white/[0.02] p-4">
              <p className="text-foodiz-cream font-medium">Foodiz+</p>
              <p className="text-foodiz-gray text-xs mt-2 leading-relaxed">
                {stats.activeSubscriptionsCount} abonnement(s) actifs et {stats.campaignsCount} campagne(s) recensée(s).
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-foodiz-gold/10 bg-white/[0.02] p-4">
              <p className="text-foodiz-cream font-medium">Support</p>
              <p className="text-foodiz-gray text-xs mt-2 leading-relaxed">
                {stats.supportOpenCount} ticket(s) ouverts provenant des clients, partenaires ou livreurs.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="foodiz-title text-lg">Modules critiques</h3>
          <span className="text-[10px] text-foodiz-gray uppercase tracking-widest">Admin ops</span>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {modules.map((module) => (
            <button
              key={module.label}
              onClick={() => navigate(module.path)}
              className="foodiz-card p-5 text-left hover:border-foodiz-gold/30 transition-all bg-[linear-gradient(145deg,rgba(216,168,79,0.04),rgba(17,17,17,0.98)_25%,rgba(10,10,10,1)_100%)]"
            >
              <div className="w-11 h-11 rounded-2xl bg-foodiz-gold/10 border border-foodiz-gold/15 flex items-center justify-center mb-3">
                <module.icon size={18} className="text-foodiz-gold" />
              </div>
              <p className="text-sm text-foodiz-cream font-medium">{module.label}</p>
              <p className="text-[10px] text-foodiz-gray mt-1 leading-relaxed">{module.desc}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[10px] text-foodiz-gold uppercase tracking-widest">Ouvrir</span>
                <ChevronRight size={14} className="text-foodiz-gold/40" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
