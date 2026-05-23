import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  TrendingUp, 
  Users, 
  Calendar, 
  Award,
  Crown
} from "lucide-react";

// Mock Data for Chart
const CHART_DATA = {
  day: [120, 150, 180, 220, 190, 250, 310, 280, 350, 420, 380, 450],
  week: [1200, 1500, 1800, 2200, 1900, 2500, 3100],
  month: [12000, 15000, 18000, 22000, 19000, 25000, 31000, 28000, 35000, 42000, 38000, 45000, 48000, 52000, 55000, 58000, 62000, 65000, 68000, 72000, 75000, 78000, 82000, 85000, 88000, 92000, 95000, 98000, 102000, 105000],
  year: [120000, 150000, 180000, 220000, 190000, 250000, 310000, 280000, 350000, 420000, 380000, 450000]
};

const TOP_CLIENTS = [
  { id: 1, name: "Alexandre M.", spent: 1240.50, orders: 42, favorite: "Burger Artisanal" },
  { id: 2, name: "Sarah B.", spent: 980.00, orders: 35, favorite: "Sushi Ko" },
  { id: 3, name: "Marc D.", spent: 850.20, orders: 28, favorite: "Pizza Truffe" },
  { id: 4, name: "Julie L.", spent: 720.00, orders: 24, favorite: "Salade Caesar" },
  { id: 5, name: "Thomas P.", spent: 650.50, orders: 22, favorite: "Burger Truffe" },
  { id: 6, name: "Emma R.", spent: 540.00, orders: 18, favorite: "Tiramisu" },
  { id: 7, name: "Lucas F.", spent: 480.20, orders: 16, favorite: "Bowl Buddha" },
  { id: 8, name: "Chloé V.", spent: 420.00, orders: 14, favorite: "Limonade Maison" },
  { id: 9, name: "Hugo G.", spent: 380.50, orders: 12, favorite: "Poulet Rôti" },
  { id: 10, name: "Léa S.", spent: 320.00, orders: 10, favorite: "Crème Brûlée" },
];

export default function PartnerAnalytics() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("week");

  const data = CHART_DATA[period];
  const maxVal = Math.max(...data);

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      {/* Golden Side Borders */}
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />

      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold">
            <ChevronLeft size={24} />
          </button>
          <h1 className="foodiz-title text-lg">Analytics & Clients VIP</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        
        {/* Smart Dynamic Chart */}
        <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="foodiz-title text-xl text-foodiz-cream flex items-center gap-2">
                <TrendingUp size={20} className="text-foodiz-gold" /> Évolution du Chiffre d'Affaires
              </h2>
              <p className="text-xs text-foodiz-gray mt-1">Analyse intelligente de vos revenus Foodiz</p>
            </div>
            <div className="flex bg-foodiz-black/50 p-1 rounded-xl border border-foodiz-gold/10">
              {(["day", "week", "month", "year"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    period === p ? "bg-foodiz-gold text-foodiz-black shadow-lg" : "text-foodiz-gray hover:text-foodiz-cream"
                  }`}
                >
                  {p === "day" ? "Jour" : p === "week" ? "Semaine" : p === "month" ? "Mois" : "Année"}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Gold Bar Chart */}
          <div className="h-64 flex items-end justify-between gap-2 md:gap-4 px-2">
            {data.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center group relative">
                {/* Tooltip */}
                <div className="absolute -top-10 bg-foodiz-gold text-foodiz-black text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {val.toLocaleString()} €
                </div>
                {/* Bar */}
                <div 
                  className="w-full bg-gradient-to-t from-foodiz-gold/20 to-foodiz-gold rounded-t-sm group-hover:to-[#E0B45C] transition-all duration-300 relative overflow-hidden"
                  style={{ height: `${(val / maxVal) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {/* Label (simplified for demo) */}
                {period === "week" && (
                  <span className="text-[9px] text-foodiz-gray mt-2 uppercase">
                    {["L", "M", "M", "J", "V", "S", "D"][i]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Top 10 Best Clients */}
        <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="foodiz-title text-xl text-foodiz-cream flex items-center gap-2">
              <Crown size={20} className="text-foodiz-gold" /> Top 10 Clients VIP
            </h2>
            <div className="flex items-center gap-2 text-xs text-foodiz-gold bg-foodiz-gold/10 px-3 py-1 rounded-full border border-foodiz-gold/20">
              <Users size={14} /> Base totale: 1,240 clients
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] uppercase tracking-widest text-foodiz-gray border-b border-foodiz-gold/10">
                <tr>
                  <th className="pb-3 pl-2">Rang</th>
                  <th className="pb-3">Client</th>
                  <th className="pb-3">Plat Préféré</th>
                  <th className="pb-3 text-center">Commandes</th>
                  <th className="pb-3 text-right pr-2">Total Dépensé</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-foodiz-gold/5">
                {TOP_CLIENTS.map((client, index) => (
                  <tr key={client.id} className="hover:bg-foodiz-gold/5 transition-colors group">
                    <td className="py-4 pl-2">
                      {index < 3 ? (
                        <div className="w-6 h-6 rounded-full bg-foodiz-gold text-foodiz-black flex items-center justify-center font-bold text-xs">
                          {index + 1}
                        </div>
                      ) : (
                        <span className="text-foodiz-gray font-mono text-xs">#{index + 1}</span>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-foodiz-card border border-foodiz-gold/20 flex items-center justify-center text-foodiz-gold font-serif italic">
                          {client.name.charAt(0)}
                        </div>
                        <span className="text-foodiz-cream font-medium group-hover:text-foodiz-gold transition-colors">
                          {client.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-foodiz-gray text-xs italic">
                      {client.favorite}
                    </td>
                    <td className="py-4 text-center text-foodiz-cream font-mono">
                      {client.orders}
                    </td>
                    <td className="py-4 text-right pr-2 font-serif italic text-foodiz-gold font-bold">
                      {client.spent.toFixed(2).replace(".", ",")} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
