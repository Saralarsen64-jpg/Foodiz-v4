import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Flame, Apple, Pizza, Coffee } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

const CATEGORIES = [
  { label: "Restaurants", icon: Flame, path: "/client/restaurants" },
  { label: "Market", icon: Apple, path: "/client/market" },
  { label: "Burgers", icon: Pizza, path: "/client/restaurants?category=burgers" },
  { label: "Boissons", icon: Coffee, path: "/client/restaurants?category=drinks" },
];

export default function SearchPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  return (
    <div className="animate-fade-in-up">
      <h1 className="foodiz-title text-2xl mb-4">Recherche</h1>
      <div className="relative mb-6">
        <GoldIcon icon={Search} size={18} className="absolute left-4 top-1/2 -translate-y-1/2" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Que voulez-vous manger ?" className="w-full bg-foodiz-card border border-foodiz-gold/15 rounded-2xl py-3.5 pl-12 pr-4 text-foodiz-cream placeholder-foodiz-gray/50 text-sm outline-none focus:border-foodiz-gold/40 transition-all" autoFocus />
      </div>
      <h2 className="foodiz-title text-sm mb-3 text-foodiz-gold">Catégories populaires</h2>
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => (
          <button key={cat.label} onClick={() => navigate(cat.path)} className="foodiz-card p-4 flex items-center gap-3 hover:border-foodiz-gold/30 transition-all">
            <div className="w-10 h-10 rounded-full bg-foodiz-gradient-gold flex items-center justify-center">
              <GoldIcon icon={cat.icon} size={18} />
            </div>
            <span className="text-sm font-medium text-foodiz-cream">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
