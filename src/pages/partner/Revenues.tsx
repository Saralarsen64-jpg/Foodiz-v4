import { useNavigate } from "react-router-dom";
import { ChevronLeft, TrendingUp, DollarSign, ShoppingBag, TrendingDown } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

const MONTHLY_DATA = [
  { month: "Jan", revenue: 3200 },
  { month: "Fév", revenue: 3800 },
  { month: "Mar", revenue: 4200 },
  { month: "Avr", revenue: 5100 },
  { month: "Mai", revenue: 4800 },
  { month: "Juin", revenue: 5500 },
];

export default function PartnerRevenues() {
  const navigate = useNavigate();
  const maxRev = Math.max(...MONTHLY_DATA.map(d => d.revenue));

  return (
    <div className="min-h-screen bg-foodiz-black">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">Revenus & Analyses</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "CA du mois", value: "5 500 €", icon: DollarSign, change: "+15 %", up: true },
            { label: "CA annuel", value: "26 600 €", icon: TrendingUp, change: "+22 %", up: true },
            { label: "Panier moyen", value: "24,50 €", icon: ShoppingBag, change: "+3 %", up: true },
            { label: "Commandes", value: "224", icon: TrendingDown, change: "+18 %", up: true },
          ].map((kpi) => (
            <div key={kpi.label} className="foodiz-card p-4">
              <div className="flex items-center justify-between mb-2">
                <GoldIcon icon={kpi.icon} size={18} />
                <span className={`text-[10px] font-medium ${kpi.up ? "text-foodiz-green" : "text-foodiz-red"}`}>{kpi.change}</span>
              </div>
              <p className="text-xl font-bold font-serif text-foodiz-cream">{kpi.value}</p>
              <p className="text-[10px] text-foodiz-gray mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="foodiz-card p-5">
          <h3 className="foodiz-title text-sm mb-4">Évolution du chiffre d'affaires</h3>
          <div className="flex items-end gap-2 h-40">
            {MONTHLY_DATA.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-foodiz-gray">{(d.revenue / 1000).toFixed(1)}k</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-foodiz-gold/50 to-foodiz-gold/20 hover:from-foodiz-gold/70 transition-all"
                  style={{ height: `${(d.revenue / maxRev) * 100}%` }}
                />
                <span className="text-[10px] text-foodiz-gray">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="foodiz-card p-5">
          <h3 className="foodiz-title text-sm mb-4">Produits les plus vendus</h3>
          <div className="space-y-3">
            {[
              { name: "Burger Artisanal", qty: 142, revenue: 1136 },
              { name: "Frites Maison", qty: 98, revenue: 294 },
              { name: "Limonade Maison", qty: 76, revenue: 380 },
              { name: "Tiramisu", qty: 54, revenue: 432 },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-foodiz-gray w-4">{i + 1}</span>
                  <span className="text-sm text-foodiz-cream">{p.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-foodiz-gray">{p.qty} vendus</span>
                  <span className="text-foodiz-gold text-xs font-semibold">{p.revenue.toFixed(2).replace(".", ",")} €</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
