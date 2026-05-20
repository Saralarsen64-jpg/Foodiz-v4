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
  { id: "r1", name: "Maison K", note: 4.9, temps: "20-30 min", frais: 2.50, min: 12, verified: true, halal: true, image: "/images/restaurant-maison-k.jpg", emoji: "🍔", signature: "Signature Foodiz" },
  { id: "r2", name: "Le Bistrot Parisien", note: 4.8, temps: "25-35 min", frais: 2.00, min: 15, verified: true, image: "/images/restaurant-bistrot.jpg", emoji: "🥖", signature: "Cuisine française" },
  { id: "r3", name: "Sushi Ko", note: 4.7, temps: "20-30 min", frais: 3.00, min: 18, verified: true, image: "/images/restaurant-sushi.jpg", emoji: "🍣", signature: "Omakase contemporain" },
  { id: "r4", name: "Bella Napoli", note: 4.6, temps: "25-40 min", frais: 2.50, min: 10, image: "/images/restaurant-pizza.jpg", emoji: "🍕", signature: "Four italien" },
  { id: "r5", name: "Le Dragon d'Or", note: 4.5, temps: "30-40 min", frais: 3.00, min: 14, halal: true, image: "/images/restaurant-sushi.jpg", emoji: "🥟", signature: "Saveurs asiatiques" },
  { id: "r6", name: "Green Kitchen", note: 4.4, temps: "20-30 min", frais: 1.50, min: 8, image: "/images/market-bio.jpg", emoji: "🥗", signature: "Healthy premium" },
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
    <div className="animate-fade-in-up space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2rem] border border-foodiz-gold/15 bg-[linear-gradient(135deg,rgba(216,168,79,0.12),rgba(17,17,17,0.95)_30%,rgba(5,5,5,1)_100%)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.45),0_0_24px_rgba(216,168,79,0.05)]">
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-foodiz-gold/70 to-transparent" />
        <div className="absolute -top-10 right-0 h-28 w-28 rounded-full bg-foodiz-gold/8 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-foodiz-gold uppercase tracking-[0.25em] font-bold mb-2">Foodiz sélection</p>
            <h1 className="foodiz-title text-2xl mb-2">Restaurants</h1>
            <p className="text-foodiz-gray text-sm leading-relaxed max-w-[240px]">
              Une sélection locale raffinée, pensée pour sublimer chaque envie du moment.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-foodiz-gold/12 border border-foodiz-gold/20 flex items-center justify-center shrink-0">
            <GoldIcon icon={Sparkles} size={18} />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <GoldIcon icon={Search} size={18} className="absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un restaurant..."
          className="w-full bg-foodiz-card/90 border border-foodiz-gold/15 rounded-[1.4rem] py-3.5 pl-12 pr-4 text-foodiz-cream placeholder-foodiz-gray/50 text-sm outline-none focus:border-foodiz-gold/40 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
        />
      </div>

      {/* Foodiz Advantage Banner */}
      <div className="foodiz-card p-4 bg-gradient-to-r from-foodiz-gold/10 to-foodiz-card border-foodiz-gold/20 flex items-center gap-3">
        <GoldIcon icon={Sparkles} size={20} />
        <div className="flex-1">
          <p className="text-sm font-medium text-foodiz-cream">Avantages Foodiz disponibles</p>
          <p className="text-[11px] text-foodiz-gray mt-0.5">Économisez avec vos points fidélité</p>
        </div>
        <ChevronRight size={16} className="text-foodiz-gold/50" />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`shrink-0 px-4 py-2.5 rounded-full text-xs font-medium transition-all ${
              activeCat === cat
                ? "bg-foodiz-gold text-foodiz-black shadow-[0_10px_20px_rgba(216,168,79,0.2)]"
                : "bg-foodiz-card border border-foodiz-gold/15 text-foodiz-gray hover:border-foodiz-gold/30"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Restaurant List */}
      <div className="space-y-4">
        {filtered.map((r) => (
          <button
            key={r.id}
            onClick={() => navigate(`/client/establishments/${r.id}`)}
            className="w-full overflow-hidden rounded-[1.6rem] border border-foodiz-gold/15 bg-[#0D0D0D] text-left shadow-[0_18px_40px_rgba(0,0,0,0.32)] hover:border-foodiz-gold/35 hover:-translate-y-0.5 transition-all"
          >
            <div className="relative h-32 overflow-hidden">
              <img
                src={r.image}
                alt={r.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    `<span style="font-size:42px;display:flex;align-items:center;justify-content:center;height:100%">${r.emoji}</span>`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foodiz-black via-foodiz-black/40 to-transparent" />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-sm border border-foodiz-gold/20 text-[9px] uppercase tracking-[0.18em] text-foodiz-gold font-bold">
                {r.signature}
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-2">
                {r.halal && (
                  <span className="text-[9px] text-foodiz-green bg-foodiz-green/10 px-2 py-1 rounded-full font-medium border border-foodiz-green/20">
                    Halal
                  </span>
                )}
                {r.verified && (
                  <span className="w-7 h-7 rounded-full bg-black/45 backdrop-blur-sm border border-foodiz-gold/20 flex items-center justify-center">
                    <BadgeCheck size={14} className="text-foodiz-gold" />
                  </span>
                )}
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="foodiz-title text-base">{r.name}</h3>
                  <p className="text-[11px] text-foodiz-gray mt-1">Cuisine premium locale</p>
                </div>
                <ChevronRight size={16} className="text-foodiz-gold/30 shrink-0 mt-1" />
              </div>

              <div className="flex items-center gap-3 mt-4 text-foodiz-gray text-xs flex-wrap">
                <span className="flex items-center gap-1 rounded-full px-2.5 py-1 bg-white/[0.03] border border-foodiz-gold/10">
                  <GoldIcon icon={Star} size={11} /> {r.note}
                </span>
                <span className="flex items-center gap-1 rounded-full px-2.5 py-1 bg-white/[0.03] border border-foodiz-gold/10">
                  <GoldIcon icon={Clock} size={11} /> {r.temps}
                </span>
                <span className="flex items-center gap-1 rounded-full px-2.5 py-1 bg-white/[0.03] border border-foodiz-gold/10">
                  <GoldIcon icon={Truck} size={11} /> {r.frais.toFixed(2).replace(".", ",")} €
                </span>
                <span className="ml-auto text-[10px] text-foodiz-gray/60">
                  Minimum {r.min.toFixed(2).replace(".", ",")} €
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
