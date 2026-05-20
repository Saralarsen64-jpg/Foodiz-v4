import { useNavigate } from "react-router-dom";
import { ChevronLeft, TrendingUp, Users, DollarSign, Activity } from "lucide-react";

export default function AdminFoodizStats() {
  const navigate = useNavigate();

  // Mock data for Foodiz+ stats
  const foodizPlusSubscribers = 42;
  const monthlyRecurringRevenue = (12 * 39.99) + (20 * 79.99) + (10 * 119.99); // Mock calculation
  const totalCommissionsToday = 1245.80; // Mock from dispatch engine

  return (
    <div className="min-h-screen bg-[#050505] text-[#FFF8EA] relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/admin")} className="text-foodiz-gold">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-foodiz-gold" />
            <h1 className="foodiz-title text-lg uppercase tracking-widest">Foodiz+ & Finances</h1>
          </div>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-foodiz-gold/10 flex items-center justify-center">
                <Users size={20} className="text-foodiz-gold" />
              </div>
              <h3 className="text-sm font-bold text-foodiz-gray uppercase tracking-wider">Abonnés Foodiz+</h3>
            </div>
            <p className="text-3xl font-serif italic text-foodiz-cream">{foodizPlusSubscribers}</p>
            <p className="text-xs text-foodiz-green mt-2 flex items-center gap-1"><TrendingUp size={12} /> +5 ce mois</p>
          </div>

          <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-foodiz-gold/10 flex items-center justify-center">
                <DollarSign size={20} className="text-foodiz-gold" />
              </div>
              <h3 className="text-sm font-bold text-foodiz-gray uppercase tracking-wider">Revenus Récurrents (MRR)</h3>
            </div>
            <p className="text-3xl font-serif italic text-foodiz-cream">{monthlyRecurringRevenue.toFixed(2)} €</p>
            <p className="text-xs text-foodiz-gray mt-2">Abonnements mensuels/annuels</p>
          </div>

          <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-foodiz-green/10 flex items-center justify-center">
                <TrendingUp size={20} className="text-foodiz-green" />
              </div>
              <h3 className="text-sm font-bold text-foodiz-gray uppercase tracking-wider">Commissions Today</h3>
            </div>
            <p className="text-3xl font-serif italic text-foodiz-green">{totalCommissionsToday.toFixed(2)} €</p>
            <p className="text-xs text-foodiz-gray mt-2">Part Foodiz sur toutes les commandes</p>
          </div>
        </div>

        {/* Recent Foodiz+ Subscriptions (Mock) */}
        <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/20">
          <h2 className="foodiz-title text-lg mb-6">Derniers abonnements Foodiz+</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] uppercase tracking-widest text-foodiz-gray border-b border-foodiz-gold/10">
                <tr>
                  <th className="pb-3 pl-2">Partenaire</th>
                  <th className="pb-3">Pack</th>
                  <th className="pb-3">Période</th>
                  <th className="pb-3 text-right pr-2">Montant</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-foodiz-gold/5">
                <tr className="hover:bg-foodiz-gold/5 transition-colors">
                  <td className="py-4 pl-2 text-foodiz-cream">Maison K</td>
                  <td className="py-4"><span className="text-foodiz-gold border border-foodiz-gold/30 px-2 py-1 rounded text-[10px]">DOMINATION</span></td>
                  <td className="py-4 text-foodiz-gray">Annuel</td>
                  <td className="py-4 text-right pr-2 text-foodiz-cream font-bold">1223.89 €</td>
                </tr>
                <tr className="hover:bg-foodiz-gold/5 transition-colors">
                  <td className="py-4 pl-2 text-foodiz-cream">Sushi Ko</td>
                  <td className="py-4"><span className="text-foodiz-gold border border-foodiz-gold/30 px-2 py-1 rounded text-[10px]">BOOST</span></td>
                  <td className="py-4 text-foodiz-gray">Mensuel</td>
                  <td className="py-4 text-right pr-2 text-foodiz-cream font-bold">79.99 €</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
