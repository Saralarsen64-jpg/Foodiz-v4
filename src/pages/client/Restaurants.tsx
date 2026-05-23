import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Star,
  Clock,
  Truck,
  ChevronRight,
  BadgeCheck,
  Sparkles,
} from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

const CATEGORIES = [
  "Toutes", "Halal", "Burgers", "Pizzas", "Asiatique", "Gastronomique", "Gourmandises"
];

const RESTAURANTS = [
  { id: "r1", name: "Maison K", note: 4.9, temps: "20-30 min", frais: 2.50, min: 12, verified: true, halal: true, image: "/images/restaurant-maison-k.jpg", emoji: "🍔" },
  { id: "r2", name: "Le Bistrot Parisien", note: 4.8, temps: "25-35 min", frais: 2.00, min: 15, verified: true, image: "/images/restaurant-bistrot.jpg", emoji: "🥖" },
  { id: "r3", name: "Sushi Ko", note: 4.7, temps: "20-30 min", frais: 3.00, min: 18, verified: true, image: "/images/restaurant-sushi.jpg", emoji: "🍣" },
  { id: "r4", name: "Bella Napoli", note: 4.6, temps: "25-40 min", frais: 2.50, min: 10, image: "/images/restaurant-pizza.jpg", emoji: "🍕" },
  { id: "r5", name: "Le Dragon d'Or", note: 4.5, temps: "30-40 min", frais: 3.00, min: 14, halal: true, image: "/images/restaurant-sushi.jpg", emoji: "🥟" },
  { id: "r6", name: "Green Kitchen", note: 4.4, temps: "20-30 min", frais: 1.50, min: 8, image: "/images/market-bio.jpg", emoji: "🥗" },
];

export default function RestaurantsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("Toutes");

  const filtered = RESTAURANTS.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCat === "Toutes" || (activeCat === "Halal" && r.halal);
    return matchSearch && matchCat;
  });

  return (
    <div className="animate-fade-in-up">
      <h1 className="foodiz-title text-2xl mb-4">Restaurants</h1>

      {/* Search */}
      <div className="relative mb-5">
        <GoldIcon icon={Search} size={18} className="absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un restaurant..."
          className="w-full bg-foodiz-card border border-foodiz-gold/15 rounded-2xl py-3.5 pl-12 pr-4 text-foodiz-cream placeholder-foodiz-gray/50 text-sm outline-none focus:border-foodiz-gold/40 transition-all"
        />
      </div>

      {/* Foodiz Advantage Banner */}
      <div className="foodiz-card p-4 mb-5 bg-foodiz-gradient-gold border-foodiz-gold/20 flex items-center gap-3">
        <GoldIcon icon={Sparkles} size={20} />
        <div className="flex-1">
          <p className="text-sm font-medium text-foodiz-cream">Avantages Foodiz disponibles</p>
          <p className="text-[11px] text-foodiz-gray mt-0.5">Économisez avec vos points fidélité</p>
        </div>
        <ChevronRight size={16} className="text-foodiz-gold/50" />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${
              activeCat === cat
                ? "bg-foodiz-gold text-foodiz-black"
                : "bg-foodiz-card border border-foodiz-gold/15 text-foodiz-gray hover:border-foodiz-gold/30"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Restaurant List */}
      <div className="space-y-3">
        {filtered.map((r) => (
          <button
            key={r.id}
            onClick={() => navigate(`/client/establishments/${r.id}`)}
            className="w-full foodiz-card p-2 pr-4 flex gap-3 text-left hover:border-foodiz-gold/30 transition-all"
          >
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-foodiz-card border border-foodiz-gold/10">
              <img
                src={r.image}
                alt={r.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    `<span style="font-size:32px;display:flex;align-items:center;justify-content:center;height:100%">${r.emoji}</span>`;
                }}
              />
            </div>
            <div className="flex-1 min-w-0 py-1">
              <div className="flex items-center gap-2">
                <h3 className="foodiz-title text-sm">{r.name}</h3>
                {r.verified && <BadgeCheck size={14} className="text-foodiz-gold shrink-0" />}
                {r.halal && (
                  <span className="text-[9px] text-foodiz-green bg-foodiz-green/10 px-1.5 py-0.5 rounded font-medium shrink-0">
                    Halal
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-foodiz-gray text-xs flex-wrap">
                <span className="flex items-center gap-1">
                  <GoldIcon icon={Star} size={11} /> {r.note}
                </span>
                <span className="flex items-center gap-1">
                  <GoldIcon icon={Clock} size={11} /> {r.temps}
                </span>
                <span className="flex items-center gap-1">
                  <GoldIcon icon={Truck} size={11} /> {r.frais.toFixed(2).replace(".", ",")} €
                </span>
              </div>
              <p className="text-[10px] text-foodiz-gray/50 mt-1">
                Min. {r.min.toFixed(2).replace(".", ",")} €
              </p>
            </div>
            <ChevronRight size={16} className="text-foodiz-gold/30 self-center shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
