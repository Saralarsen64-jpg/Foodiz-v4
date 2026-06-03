import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Users, ShoppingBag, Euro, TrendingUp, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalUsers: 0, totalOrders: 0, totalRevenue: 0, pendingTickets: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin');
      const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      const { count: ticketsCount } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open');
      
      // Calcul du CA Réel (somme des commandes livrées)
      const { data: orders } = await supabase.from('orders').select('final_client_total_cents').eq('status', 'delivered');
      const revenue = orders ? orders.reduce((acc, curr) => acc + (curr.final_client_total_cents || 0), 0) / 100 : 0;

      setStats({
        totalUsers: usersCount || 0,
        totalOrders: ordersCount || 0,
        totalRevenue: revenue,
        pendingTickets: ticketsCount || 0
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-8 text-foodiz-gray animate-pulse">Chargement des statistiques...</div>;

  const statCards = [
    { label: "Utilisateurs Actifs", value: stats.totalUsers, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Commandes Totales", value: stats.totalOrders, icon: ShoppingBag, color: "text-foodiz-gold", bg: "bg-foodiz-gold/10" },
    { label: "Chiffre d'Affaires", value: `${stats.totalRevenue.toFixed(2)} €`, icon: Euro, color: "text-foodiz-green", bg: "bg-foodiz-green/10" },
    { label: "Tickets en Attente", value: stats.pendingTickets, icon: TrendingUp, color: "text-foodiz-red", bg: "bg-foodiz-red/10" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="foodiz-title text-3xl text-foodiz-cream mb-2">Dashboard Administrateur</h1>
        <p className="text-foodiz-gray text-sm">Centre de contrôle Foodiz. Connecté avec : admin@foodiz.co</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {statCards.map((stat, idx) => (
          <div key={idx} className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/10">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}><stat.icon size={24} className={stat.color} /></div>
            </div>
            <p className="text-foodiz-gray text-xs uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-foodiz-cream">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/10">
          <h2 className="foodiz-title text-xl text-foodiz-cream mb-4 flex items-center gap-2"><Activity size={20} className="text-foodiz-gold"/> Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => navigate("/admin/orders")} className="p-4 rounded-xl bg-foodiz-black border border-foodiz-gold/20 text-left hover:border-foodiz-gold/50 transition-colors group">
              <span className="text-foodiz-cream block font-bold mb-1">Vue "Dieu" des Commandes</span>
              <span className="text-foodiz-gray text-xs group-hover:text-foodiz-gold transition-colors">Suivre les commandes en temps réel</span>
            </button>
            <button onClick={() => navigate("/admin/broadcast")} className="p-4 rounded-xl bg-foodiz-black border border-foodiz-gold/20 text-left hover:border-foodiz-gold/50 transition-colors group">
              <span className="text-foodiz-cream block font-bold mb-1">Notification Globale</span>
              <span className="text-foodiz-gray text-xs group-hover:text-foodiz-gold transition-colors">Envoyer une promo à tous les clients</span>
            </button>
            <button onClick={() => navigate("/admin/partner-applications")} className="p-4 rounded-xl bg-foodiz-black border border-foodiz-gold/20 text-left hover:border-foodiz-gold/50 transition-colors group">
              <span className="text-foodiz-cream block font-bold mb-1">Gérer les Partenaires</span>
              <span className="text-foodiz-gray text-xs group-hover:text-foodiz-gold transition-colors">Valider, suspendre ou bannir</span>
            </button>
            <button onClick={() => navigate("/admin/support")} className="p-4 rounded-xl bg-foodiz-black border border-foodiz-gold/20 text-left hover:border-foodiz-gold/50 transition-colors group">
              <span className="text-foodiz-cream block font-bold mb-1">Support Client</span>
              <span className="text-foodiz-gray text-xs group-hover:text-foodiz-gold transition-colors">Répondre aux tickets en attente</span>
            </button>
          </div>
        </div>
        
        <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/10 flex flex-col items-center justify-center text-center">
          <p className="text-foodiz-gray text-sm mb-2">Système Foodiz v1.0</p>
          <div className="w-3 h-3 rounded-full bg-foodiz-green animate-pulse mb-2"></div>
          <p className="text-foodiz-green text-xs font-bold">Tous les systèmes sont opérationnels.</p>
        </div>
      </div>
    </div>
  );
}