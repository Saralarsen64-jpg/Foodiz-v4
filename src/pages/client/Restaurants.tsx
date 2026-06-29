import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Star, Clock, MapPin } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import CityExpansionCard from "../../components/CityExpansionCard";

export default function RestaurantsPage() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [cityName, setCityName] = useState("votre position");
  const [loading, setLoading] = useState(true);
  const [coverageStatus, setCoverageStatus] = useState<"available" | "coming_soon" | "address_required">("address_required");
  const [expansionRequested, setExpansionRequested] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return setLoading(false);
      const response = await fetch("/api/client-catalog", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setRestaurants((payload.restaurants || []).map((restaurant: any) => ({
          ...restaurant,
          rating: "Nouveau",
        })));
        setCoverageStatus(payload.coverage?.status || "address_required");
        setCityName(payload.coverage?.city || "votre adresse");
        setRadiusKm(Number(payload.coverage?.radiusKm || 10));
        setExpansionRequested(Boolean(payload.expansionRequest));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up border-x-2 border-foodiz-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />

      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/client")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Restaurants</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-2 text-foodiz-gray text-xs mb-6">
          <MapPin size={14} className="text-foodiz-gold" />
          <span>Autour de {cityName} ({radiusKm} km max)</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-foodiz-gray animate-pulse">Recherche des restaurants...</div>
        ) : restaurants.length === 0 ? (
          <CityExpansionCard
            status={coverageStatus}
            city={cityName}
            alreadyRequested={expansionRequested}
            onRequested={() => setExpansionRequested(true)}
          />
        ) : (
          <div className="space-y-4">
            {restaurants.map((r) => (
              <button key={r.id} onClick={() => navigate(`/client/establishments/${r.id}`)} className="w-full foodiz-card p-3 flex items-center gap-4 text-left hover:border-foodiz-gold/30 transition-all">
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-foodiz-card">
                  {r.cover_image ? <img src={r.cover_image} alt={r.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
                </div>
                <div className="flex-1">
                  <h3 className="foodiz-title text-base">{r.name}</h3>
                  <p className="text-foodiz-gray text-xs mt-1">{r.cuisine_type || "Gastronomie"}</p>
                  <div className="flex items-center gap-3 mt-2 text-foodiz-gray text-xs">
                    <span className="flex items-center gap-1"><GoldIcon icon={Star} size={12} /> {r.rating}</span>
                    <span className="flex items-center gap-1"><GoldIcon icon={Clock} size={12} /> Délai à confirmer</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
