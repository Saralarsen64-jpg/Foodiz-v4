import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Users, ShoppingBag, Euro, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingTickets: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Récupération des VRAIES statistiques depuis la base de données
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      const { count: ticketsCount } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open');

      setStats({
        totalUsers: usersCount || 0,
        totalOrders: ordersCount || 0,
        totalRevenue: 0, // À calculer plus tard depuis la table orders
        pendingTickets: ticketsCount || 0
      });
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: "Utilisateurs Totaux", value: stats.totalUsers, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Commandes Passées", value: stats.totalOrders, icon: ShoppingBag, color: "text-foodiz-gold", bg: "bg-foodiz-gold/10" },
    { label: "Tickets en Attente", value: stats.pendingTickets, icon: TrendingUp, color: "text-foodiz-red", bg: "bg-foodiz-red/10" },
    { label: "Chiffre d'Affaires", value: `${stats.totalRevenue} €`, icon: Euro, color: "text-foodiz-green", bg: "bg-foodiz-green/10" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="foodiz-title text-3xl text-foodiz-cream mb-2">Dashboard Administrateur</h1>
        <p className="text-foodiz-gray text-sm">Bienvenue sur le centre de contrôle Foodiz. Connecté avec : admin@foodiz.co</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {statCards.map((stat, idx) => (
          <div key={idx} className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/10">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon size={24} className={stat.color} />
              </div>
            </div>
            <p className="text-foodiz-gray text-xs uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-foodiz-cream">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/10">
          <h2 className="foodiz-title text-xl text-foodiz-cream mb-4">Actions Rapides</h2>
          <div className="space-y-3">
            <button onClick={() => navigate("/admin/partner-applications")} className="w-full p-4 rounded-xl bg-foodiz-black border border-foodiz-gold/20 text-left hover:border-foodiz-gold/50 transition-colors flex justify-between items-center group">
              <span className="text-foodiz-cream">Gérer les demandes Partenaires</span>
              <span className="text-foodiz-gold group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <button onClick={() => navigate("/admin/courier-applications")} className="w-full p-4 rounded-xl bg-foodiz-black border border-foodiz-gold/20 text-left hover:border-foodiz-gold/50 transition-colors flex justify-between items-center group">
              <span className="text-foodiz-cream">Gérer les demandes Livreurs</span>
              <span className="text-foodiz-gold group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <button onClick={() => navigate("/admin/support")} className="w-full p-4 rounded-xl bg-foodiz-black border border-foodiz-gold/20 text-left hover:border-foodiz-gold/50 transition-colors flex justify-between items-center group">
              <span className="text-foodiz-cream">Voir les tickets Support</span>
              <span className="text-foodiz-gold group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
        
        <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/10 flex flex-col items-center justify-center text-center">
          <p className="text-foodiz-gray text-sm mb-2">Système Foodiz v1.0</p>
          <p className="text-foodiz-gold text-xs">Tous les systèmes sont opérationnels.</p>
        </div>
      </div>
    </div>
  );
}