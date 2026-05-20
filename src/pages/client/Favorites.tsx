import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Heart, Star, Clock, Truck, BadgeCheck } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

const INITIAL_FAVORITES = [
  { id: "r1", name: "Maison K", note: 4.9, temps: "20-30 min", frais: 2.50, image: "/images/restaurant-maison-k.jpg", emoji: "🍔", verified: true },
  { id: "r2", name: "Sushi Ko", note: 4.7, temps: "20-30 min", frais: 3.00, image: "/images/restaurant-sushi.jpg", emoji: "🍣", verified: true },
  { id: "m1", name: "Marché Bio", note: 4.8, temps: "20-30 min", frais: 1.50, image: "/images/market-bio.jpg", emoji: "🥬", verified: true },
];

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState(INITIAL_FAVORITES);

  const removeFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((fav) => fav.id !== id));
  };

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
        <ChevronLeft size={18} /> Retour
      </button>

      <div className="flex items-center gap-3 mb-6">
        <GoldIcon icon={Heart} size={22} />
        <h1 className="foodiz-title text-2xl">Mes favoris</h1>
      </div>

      <div className="space-y-3">
        {favorites.map((fav) => (
          <button
            key={fav.id}
            onClick={() => navigate(`/client/establishments/${fav.id}`)}
            className="w-full foodiz-card p-2 pr-4 flex items-center gap-3 text-left hover:border-foodiz-gold/30 transition-all"
          >
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-foodiz-card">
              <img
                src={fav.image}
                alt={fav.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML = `<span style="font-size:28px;display:flex;align-items:center;justify-content:center;height:100%">${fav.emoji}</span>`;
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="foodiz-title text-sm">{fav.name}</h3>
                {fav.verified && <BadgeCheck size={14} className="text-foodiz-gold shrink-0" />}
              </div>
              <div className="flex items-center gap-3 mt-1 text-foodiz-gray text-xs">
                <span className="flex items-center gap-1"><GoldIcon icon={Star} size={11} /> {fav.note}</span>
                <span className="flex items-center gap-1"><GoldIcon icon={Clock} size={11} /> {fav.temps}</span>
                <span className="flex items-center gap-1"><GoldIcon icon={Truck} size={11} /> {fav.frais.toFixed(2).replace(".", ",")} €</span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFavorite(fav.id);
              }}
              className="text-foodiz-gold"
            >
              <Heart size={16} fill="currentColor" />
            </button>
          </button>
        ))}
      </div>

      {favorites.length === 0 && (
        <div className="text-center py-12">
          <Heart size={40} className="mx-auto text-foodiz-gold/30 mb-3" />
          <p className="text-foodiz-gray text-sm">Aucun favori pour le moment</p>
          <p className="text-[10px] text-foodiz-gray/50 mt-1">Ajoutez des restaurants et marchés à vos favoris</p>
        </div>
      )}
    </div>
  );
}
