import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bike, DollarSign, Star, Clock, Bell, ChevronRight, MapPin } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import Logo from "../../components/Logo";

export default function CourierDashboard() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [rating, setRating] = useState("4,9");

  useEffect(() => {
    const saved = localStorage.getItem("foodiz_reviews_v1");
    if (saved) {
      const reviews = JSON.parse(saved);
      const courierReviews = reviews.filter((r: any) => r.courierRating > 0);
      if (courierReviews.length > 0) {
        const avg = courierReviews.reduce((sum: number, r: any) => sum + r.courierRating, 0) / courierReviews.length;
        // Start from base 4.9 for demo and adjust
        const finalRating = ((4.9 * 10 + avg) / 11).toFixed(1).replace(".", ",");
        setRating(finalRating);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-foodiz-black">
      {/* Header */}
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Logo size="sm" />
          <button onClick={() => navigate("/courier/deliveries/history")} className="relative">
            <Bell size={20} className="text-foodiz-gold" />
            <span className="absolute -top-1 -right-1 bg-foodiz-gold text-foodiz-black text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">2</span>
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Online Toggle */}
        <div className="foodiz-card p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-foodiz-cream">Vous êtes</p>
            <p className={`text-lg font-bold font-serif ${isOnline ? "text-foodiz-green" : "text-foodiz-gray"}`}>
              {isOnline ? "En ligne" : "Hors ligne"}
            </p>
          </div>
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`relative w-14 h-8 rounded-full transition-all ${isOnline ? "bg-foodiz-green" : "bg-foodiz-card border border-foodiz-gold/20"}`}
          >
            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-lg ${isOnline ? "left-7" : "left-1"}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Gains du jour", value: "48,50 €", icon: DollarSign },
            { label: "Livraisons", value: "6", icon: Bike },
            { label: "Score", value: rating, icon: Star },
          ].map((s) => (
            <div key={s.label} className="foodiz-card p-3 text-center">
              <GoldIcon icon={s.icon} size={16} className="mx-auto mb-1" />
              <p className="text-lg font-bold font-serif text-foodiz-cream">{s.value}</p>
              <p className="text-[9px] text-foodiz-gray">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate("/courier/deliveries/available")}
            className="foodiz-card p-4 text-left hover:border-foodiz-gold/30 transition-all">
            <GoldIcon icon={Bike} size={22} />
            <p className="text-sm text-foodiz-cream mt-2 font-medium">Livraisons disponibles</p>
            <p className="text-[10px] text-foodiz-gray mt-0.5">3 courses près de vous</p>
          </button>
          <button onClick={() => navigate("/courier/deliveries/current")}
            className="foodiz-card p-4 text-left hover:border-foodiz-gold/30 transition-all">
            <GoldIcon icon={MapPin} size={22} />
            <p className="text-sm text-foodiz-cream mt-2 font-medium">Livraison en cours</p>
            <p className="text-[10px] text-foodiz-gray mt-0.5">1 course active</p>
          </button>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="foodiz-title text-sm">Activité récente</h3>
            <button onClick={() => navigate("/courier/deliveries/history")} className="text-foodiz-gold text-[10px] flex items-center gap-1">
              Voir tout <ChevronRight size={10} />
            </button>
          </div>
          <div className="space-y-2">
            {[
              { restaurant: "Maison K", gain: "4,50 €", time: "Il y a 15 min" },
              { restaurant: "Sushi Ko", gain: "5,00 €", time: "Il y a 35 min" },
              { restaurant: "Marché Bio", gain: "3,50 €", time: "Il y a 1h" },
            ].map((a, i) => (
              <div key={i} className="foodiz-card p-3 flex items-center gap-3">
                <Clock size={14} className="text-foodiz-gold/50 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-foodiz-cream">{a.restaurant}</p>
                  <p className="text-[10px] text-foodiz-gray">{a.time}</p>
                </div>
                <span className="text-foodiz-gold text-xs font-semibold">+{a.gain}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
