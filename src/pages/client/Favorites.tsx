import { useNavigate } from "react-router-dom";
import { ChevronLeft, Heart, Store } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

export default function FavoritesPage() {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6"><ChevronLeft size={18} /> Compte</button>
      <h1 className="foodiz-title text-2xl mb-6">Mes favoris</h1>
      <div className="space-y-3">
        <button onClick={() => navigate("/client/establishments/r1")} className="w-full foodiz-card p-4 flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-xl bg-foodiz-gradient-gold flex items-center justify-center"><Store size={20} className="text-foodiz-gold" /></div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foodiz-cream">Maison K</h3>
            <p className="text-xs text-foodiz-gray mt-1">Burgers · 20-30 min</p>
          </div>
          <Heart size={18} className="text-foodiz-red fill-foodiz-red" />
        </button>
      </div>
    </div>
  );
}
