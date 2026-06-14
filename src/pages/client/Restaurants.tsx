import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Star, Clock, MapPin } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

// Fonction de calcul de distance (Haversine)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; var dLat = deg2rad(lat2 - lat1); var dLon = deg2rad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); return R * c;
}
function deg2rad(deg: number) { return deg * (Math.PI / 180) }

export default function RestaurantsPage() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [cityName, setCityName] = useState("votre position");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Récupérer la position GPS enregistrée du client
        const { data: profile } = await supabase.from('profiles').select('latitude, longitude').eq('id', user.id).single();
        
        if (profile?.latitude && profile?.longitude) {
          // Trouver le nom de la ville
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${profile.latitude}&lon=${profile.longitude}`);
            const data = await res.json();
            setCityName(data.address.city || data.address.town || "votre position");
          } catch(e) {}

          // 2. Récupérer les VRAIS restaurants actifs
          const { data: restos } = await supabase.from('restaurants').select('*').eq('is_active', true);
          if (restos) {
            // 3. Filtrer à 10km max
            const filtered = restos.filter((r: any) => {
              if (r.latitude && r.longitude) {
                return getDistanceFromLatLonInKm(profile.latitude, profile.longitude, r.latitude, r.longitude) <= 10;
              }
              return true; // Si le resto n'a pas de GPS, on l'affiche par sécurité (à retirer en prod stricte)
            });
            const { data: reviews } = await supabase.from("reviews").select("restaurant_rating, orders!inner(restaurant_id)").in("orders.restaurant_id", filtered.map((restaurant: any) => restaurant.id));
            setRestaurants(filtered.map((restaurant: any) => {
              const values = (reviews || []).filter((review: any) => review.orders?.restaurant_id === restaurant.id).map((review: any) => review.restaurant_rating).filter(Boolean);
              return { ...restaurant, rating: values.length ? (values.reduce((sum: number, value: number) => sum + value, 0) / values.length).toFixed(1) : "Nouveau" };
            }));
          }
        }
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
          <span>Autour de {cityName} (10km max)</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-foodiz-gray animate-pulse">Recherche des restaurants...</div>
        ) : restaurants.length === 0 ? (
          <div className="foodiz-card p-12 text-center bg-[#0A0A0A] border-foodiz-gold/10">
            <h3 className="text-foodiz-cream text-lg font-medium mb-2">Aucun restaurant trouvé</h3>
            <p className="text-foodiz-gray text-sm">Il n'y a pas de restaurants partenaires dans un rayon de 10km autour de {cityName} pour le moment.</p>
            <button onClick={() => navigate("/client")} className="mt-6 text-foodiz-gold text-xs underline">Retour à l'accueil</button>
          </div>
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
