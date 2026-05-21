import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { TrendingUp, Users, DollarSign, AlertTriangle, ChevronRight, LogOut, ShieldCheck } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import Logo from "../../components/Logo";

export default function AdminEconomics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    foodizMargin: 0,
    pendingApprovals: 0,
    totalUsers: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // 1. CA Global et Marge Foodiz (Commandes livrées)
        const { data: orders } = await supabase
          .from('orders')
          .select('final_client_total_cents, foodiz_margin_cents')
          .eq('status', 'delivered');

        const revenue = orders ? orders.reduce((sum, o) => sum + (o.final_client_total_cents || 0), 0) / 100 : 0;
        const margin = orders ? orders.reduce((sum, o) => sum + (o.foodiz_margin_cents || 0), 0) / 100 : 0;

        // 2. Utilisateurs en attente de validation
        const { count: pendingCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', false)
          .neq('role', 'client');

        // 3. Total utilisateurs
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalRevenue: revenue,
          foodizMargin: margin,
          pendingApprovals: pendingCount || 0,
          totalUsers: userCount || 0
        });
      } catch (error) {
        console.error("Erreur chargement stats admin:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#FFF8EA] relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-4">
            <span className="text-xs text-foodiz-gold border border-foodiz-gold/30 px-3 py-1 rounded-full uppercase tracking-widest font-bold">Admin God Mode</span>
            <button onClick={handleLogout} className="flex items-center gap-2 text-foodiz-gray hover:text-foodiz-red transition-colors text-sm">
              <LogOut size={16} /> Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="foodiz-title text-3xl mb-2">Tableau de Bord Financier</h1>
            <p className="text-foodiz-gray">Vue d'ensemble de l'écosystème Foodiz en temps réel.</p>
          </div>
          <button onClick={() => navigate("/admin/approvals")} className="foodiz-btn flex items-center gap-2">
            <ShieldCheck size={18} /> Gérer les validations ({stats.pendingApprovals})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-foodiz-gray animate-pulse">Chargement des données financières...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-foodiz-gold/10 flex items-center justify-center">
                  <DollarSign size={20} className="text-foodiz-gold" />
                </div>
                <h3 className="text-xs font-bold text-foodiz-gray uppercase tracking-wider">CA Global (Livé)</h3>
              </div>
              <p className="text-3xl font-serif italic text-foodiz-cream">{stats.totalRevenue.toFixed(2)} €</p>
              <p className="text-xs text-foodiz-green mt-2 flex items-center gap-1"><TrendingUp size={12} /> Revenus totaux clients</p>
            </div>

            <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-foodiz-green/10 flex items-center justify-center">
                  <TrendingUp size={20} className="text-foodiz-green" />
                </div>
                <h3 className="text-xs font-bold text-foodiz-gray uppercase tracking-wider">Marge Nette Foodiz</h3>
              </div>
              <p className="text-3xl font-serif italic text-foodiz-green">{stats.foodizMargin.toFixed(2)} €</p>
              <p className="text-xs text-foodiz-gray mt-2">Bénéfice plateforme (hors coûts)</p>
            </div>

            <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-foodiz-red/10 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-foodiz-red" />
                </div>
                <h3 className="text-xs font-bold text-foodiz-gray uppercase tracking-wider">Validations en attente</h3>
              </div>
              <p className="text-3xl font-serif italic text-foodiz-red">{stats.pendingApprovals}</p>
              <button onClick={() => navigate("/admin/approvals")} className="text-xs text-foodiz-gold mt-2 hover:underline flex items-center gap-1">Voir la liste <ChevronRight size={12}/></button>
            </div>

            <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-foodiz-gold/10 flex items-center justify-center">
                  <Users size={20} className="text-foodiz-gold" />
                </div>
                <h3 className="text-xs font-bold text-foodiz-gray uppercase tracking-wider">Utilisateurs Totaux</h3>
              </div>
              <p className="text-3xl font-serif italic text-foodiz-cream">{stats.totalUsers}</p>
              <p className="text-xs text-foodiz-gray mt-2">Clients, Partenaires & Livreurs</p>
            </div>
          </div>
        )}

        {/* Section Actions Rapides Admin */}
        <div className="foodiz-card p-8 bg-gradient-to-br from-foodiz-gold/5 to-foodiz-card border-foodiz-gold/20">
          <h2 className="foodiz-title text-xl mb-6">Outils d'Administration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={() => navigate("/admin/approvals")} className="p-4 rounded-xl bg-foodiz-black border border-foodiz-gold/10 hover:border-foodiz-gold/40 transition-all text-left group">
              <h3 className="text-foodiz-cream font-bold group-hover:text-foodiz-gold transition-colors">Gérer les Inscriptions</h3>
              <p className="text-xs text-foodiz-gray mt-1">Valider ou refuser les partenaires et livreurs.</p>
            </button>
            <button className="p-4 rounded-xl bg-foodiz-black border border-foodiz-gold/10 hover:border-foodiz-gold/40 transition-all text-left group">
              <h3 className="text-foodiz-cream font-bold group-hover:text-foodiz-gold transition-colors">Dispatch Financier</h3>
              <p className="text-xs text-foodiz-gray mt-1">Voir les virements partenaires et livreurs.</p>
            </button>
            <button className="p-4 rounded-xl bg-foodiz-black border border-foodiz-gold/10 hover:border-foodiz-gold/40 transition-all text-left group">
              <h3 className="text-foodiz-cream font-bold group-hover:text-foodiz-gold transition-colors">Logs Anti-Fraude</h3>
              <p className="text-xs text-foodiz-gray mt-1">Surveiller les comptes suspects.</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}