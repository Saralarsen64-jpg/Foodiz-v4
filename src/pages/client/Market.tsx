import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Star,
  Clock,
  ChevronRight,
  BadgeCheck,
  Sparkles,
  Apple,
  Croissant,
  Candy,
  Coffee,
  Leaf,
} from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

const FILTERS = [
  { label: "Toutes", icon: Apple },
  { label: "Fruits & Légumes", icon: Leaf },
  { label: "Épicerie salée", icon: Croissant },
  { label: "Épicerie sucrée", icon: Candy },
  { label: "Boissons", icon: Coffee },
  { label: "Bio", icon: Leaf },
];

const MARKETS = [
  { id: "m1", name: "Marché Bio", note: 4.7, temps: "20-30 min", frais: 1.50, min: 8, verified: true, image: "/images/market-bio.jpg", emoji: "🥬" },
  { id: "m2", name: "Épicerie Fine", note: 4.8, temps: "25-35 min", frais: 2.00, min: 12, verified: true, image: "/images/market-epicerie.jpg", emoji: "🧀" },
  { id: "m3", name: "Primeur du Coin", note: 4.5, temps: "15-25 min", frais: 1.00, min: 5, image: "/images/market-bio.jpg", emoji: "🍎" },
  { id: "m4", name: "La Cave à Vins", note: 4.9, temps: "25-40 min", frais: 3.00, min: 20, verified: true, image: "/images/market-epicerie.jpg", emoji: "🍷" },
  { id: "m5", name: "Boulangerie Moderne", note: 4.6, temps: "15-20 min", frais: 1.00, min: 5, image: "/images/restaurant-bistrot.jpg", emoji: "🥖" },
  { id: "m6", name: "Traiteur Italien", note: 4.8, temps: "20-30 min", frais: 2.50, min: 10, verified: true, image: "/images/restaurant-pizza.jpg", emoji: "🍝" },
];

export default function MarketPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("Toutes");

  const filtered = MARKETS.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in-up">
      <h1 className="foodiz-title text-2xl mb-4">Market</h1>

      {/* Search */}
      <div className="relative mb-5">
        <GoldIcon icon={Search} size={18} className="absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une épicerie..."
          className="w-full bg-foodiz-card border border-foodiz-gold/15 rounded-2xl py-3.5 pl-12 pr-4 text-foodiz-cream placeholder-foodiz-gray/50 text-sm outline-none focus:border-foodiz-gold/40 transition-all"
        />
      </div>

      {/* Foodiz Advantage Banner */}
      <div className="foodiz-card p-4 mb-5 bg-foodiz-gradient-gold border-foodiz-gold/20 flex items-center gap-3">
        <GoldIcon icon={Sparkles} size={20} />
        <div className="flex-1">
          <p className="text-sm font-medium text-foodiz-cream">Avantages Foodiz disponibles</p>
          <p className="text-[11px] text-foodiz-gray mt-0.5">Économisez sur vos courses avec vos points</p>
        </div>
        <ChevronRight size={16} className="text-foodiz-gold/50" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setActiveFilter(f.label)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all ${
              activeFilter === f.label
                ? "bg-foodiz-gold text-foodiz-black"
                : "bg-foodiz-card border border-foodiz-gold/15 text-foodiz-gray hover:border-foodiz-gold/30"
            }`}
          >
            <f.icon size={14} />
            {f.label}
          </button>
        ))}
      </div>

      {/* Market Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((m) => (
          <button
            key={m.id}
            onClick={() => navigate(`/client/establishments/${m.id}`)}
            className="foodiz-card p-3 text-left hover:border-foodiz-gold/30 transition-all"
          >
            <div className="w-full h-24 rounded-xl overflow-hidden mb-3 bg-foodiz-card border border-foodiz-gold/10">
              <img
                src={m.image}
                alt={m.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    `<span style="font-size:32px;display:flex;align-items:center;justify-content:center;height:100%">${m.emoji}</span>`;
                }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="foodiz-title text-sm">{m.name}</h3>
              {m.verified && <BadgeCheck size={12} className="text-foodiz-gold shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-1 text-foodiz-gray text-[10px]">
              <span className="flex items-center gap-0.5">
                <Star size={10} className="text-foodiz-gold" /> {m.note}
              </span>
              <span className="flex items-center gap-0.5">
                <Clock size={10} className="text-foodiz-gold" /> {m.temps}
              </span>
            </div>
            <p className="text-[10px] text-foodiz-gray/50 mt-1">
              Livraison {m.frais.toFixed(2).replace(".", ",")} € · Min. {m.min} €
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
