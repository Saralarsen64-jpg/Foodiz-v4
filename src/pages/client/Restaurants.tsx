import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Star, Clock, MapPin } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import { loadClientCatalog } from "../../lib/clientCatalog";

export default function RestaurantsPage() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [cityName, setCityName] = useState("votre position");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catalog = await loadClientCatalog();
        setCityName(catalog.coverage.city || "votre adresse");
        const filtered = catalog.restaurants;
        if (filtered.length) {
          const { data: reviews } = await supabase.from("reviews").select("restaurant_rating, orders!inner(restaurant_id)").in("orders.restaurant_id", filtered.map((restaurant) => restaurant.id));
          setRestaurants(filtered.map((restaurant) => {
              const values = (reviews || []).filter((review: any) => review.orders?.restaurant_id === restaurant.id).map((review: any) => review.restaurant_rating).filter(Boolean);
              return { ...restaurant, rating: values.length ? (values.reduce((sum: number, value: number) => sum + value, 0) / values.length).toFixed(1) : "Nouveau" };
          }));
        } else setRestaurants([]);
      } catch { setRestaurants([]); }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-weello-black pb-24 animate-fade-in-up border-x-2 border-weello-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />

      <header className="bg-weello-card border-b border-weello-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/client")} className="text-weello-gold"><ChevronLeft size={24} /></button>
          <h1 className="weello-title text-lg">Restaurants</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-2 text-weello-gray text-xs mb-6">
          <MapPin size={14} className="text-weello-gold" />
          <span>Autour de {cityName} (10km max)</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-weello-gray animate-pulse">Recherche des restaurants...</div>
        ) : restaurants.length === 0 ? (
          <div className="weello-card p-12 text-center bg-[#0A0A0A] border-weello-gold/10">
            <h3 className="text-weello-cream text-lg font-medium mb-2">Aucun restaurant trouvé</h3>
            <p className="text-weello-gray text-sm">Il n'y a pas de restaurants partenaires dans un rayon de 10km autour de {cityName} pour le moment.</p>
            <button onClick={() => navigate("/client")} className="mt-6 text-weello-gold text-xs underline">Retour à l'accueil</button>
          </div>
        ) : (
          <div className="space-y-4">
            {restaurants.map((r) => (
              <button key={r.id} onClick={() => navigate(`/client/establishments/${r.id}`)} className="w-full weello-card p-3 flex items-center gap-4 text-left hover:border-weello-gold/30 transition-all">
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-weello-card">
                  {r.cover_image ? <img src={r.cover_image} alt={r.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
                </div>
                <div className="flex-1">
                  <h3 className="weello-title text-base">{r.name}</h3>
                  <p className="text-weello-gray text-xs mt-1">{r.cuisine_type || "Gastronomie"}</p>
                  <div className="flex items-center gap-3 mt-2 text-weello-gray text-xs">
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
