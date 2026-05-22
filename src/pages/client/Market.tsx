import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, Clock, ChevronRight } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

const MARKETS = [
  { id: "m1", name: "Marché Bio", note: 4.8, temps: "20-30 min", image: "/images/market-bio.jpg" },
  { id: "m2", name: "Épicerie Fine", note: 4.7, temps: "25-35 min", image: "/images/market-epicerie.jpg" },
  { id: "m3", name: "Primeur du Coin", note: 4.5, temps: "15-25 min", image: "/images/market-bio.jpg" },
];

export default function MarketPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  return (
    <div className="animate-fade-in-up">
      <h1 className="foodiz-title text-2xl mb-4">Market</h1>
      <div className="relative mb-5">
        <GoldIcon icon={Search} size={18} className="absolute left-4 top-1/2 -translate-y-1/2" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit, un marché..." className="w-full bg-foodiz-card border border-foodiz-gold/15 rounded-2xl py-3.5 pl-12 pr-4 text-foodiz-cream placeholder-foodiz-gray/50 text-sm outline-none focus:border-foodiz-gold/40 transition-all" />
      </div>
      <div className="space-y-3">
        {MARKETS.map((r) => (
          <button key={r.id} onClick={() => navigate(`/client/establishments/${r.id}`)} className="w-full foodiz-card p-2 pr-4 flex gap-3 text-left hover:border-foodiz-gold/30 transition-all">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-foodiz-card border border-foodiz-gold/10">
              <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0 py-1">
              <h3 className="foodiz-title text-sm">{r.name}</h3>
              <div className="flex items-center gap-3 mt-1.5 text-foodiz-gray text-xs">
                <span className="flex items-center gap-1"><GoldIcon icon={Star} size={11} /> {r.note}</span>
                <span className="flex items-center gap-1"><GoldIcon icon={Clock} size={11} /> {r.temps}</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-foodiz-gold/30 self-center shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
