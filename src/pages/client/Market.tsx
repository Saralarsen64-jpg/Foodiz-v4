import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Star, Clock, MapPin, ShoppingCart } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; var dLat = deg2rad(lat2 - lat1); var dLon = deg2rad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); return R * c;
}
function deg2rad(deg: number) { return deg * (Math.PI / 180) }

export default function MarketPage() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<any[]>([]);
  const [cityName, setCityName] = useState("votre position");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('latitude, longitude').eq('id', user.id).single();
        if (profile?.latitude && profile?.longitude) {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${profile.latitude}&lon=${profile.longitude}`);
            const data = await res.json();
            setCityName(data.address.city || data.address.town || "votre position");
          } catch(e) {}

          // On récupère les établissements (ici on prend tous les actifs, tu pourras filtrer par catégorie plus tard si besoin)
          const { data: restos } = await supabase.from('restaurants').select('*').eq('is_active', true);
          if (restos) {
            const filtered = restos.filter((r: any) => {
              if (r.latitude && r.longitude) {
                return getDistanceFromLatLonInKm(profile.latitude, profile.longitude, r.latitude, r.longitude) <= 10;
              }
              return true;
            });
            setMarkets(filtered);
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
          <h1 className="foodiz-title text-lg">Market Foodiz</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-2 text-foodiz-gray text-xs mb-6">
          <MapPin size={14} className="text-foodiz-gold" />
          <span>Autour de {cityName} (10km max)</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-foodiz-gray animate-pulse">Recherche des marchés...</div>
        ) : markets.length === 0 ? (
          <div className="foodiz-card p-12 text-center bg-[#0A0A0A] border-foodiz-gold/10">
            <ShoppingCart size={48} className="mx-auto text-foodiz-gray/20 mb-4" />
            <h3 className="text-foodiz-cream text-lg font-medium mb-2">Aucun market trouvé</h3>
            <p className="text-foodiz-gray text-sm">Il n'y a pas de marchés partenaires dans un rayon de 10km autour de {cityName} pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {markets.map((m) => (
              <button key={m.id} onClick={() => navigate(`/client/establishments/${m.id}`)} className="foodiz-card p-3 text-left hover:border-foodiz-gold/30 transition-all">
                <div className="w-full h-24 rounded-xl overflow-hidden mb-3 bg-foodiz-card">
                  {m.cover_image ? <img src={m.cover_image} alt={m.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🛒</div>}
                </div>
                <h3 className="foodiz-title text-sm">{m.name}</h3>
                <div className="flex items-center gap-2 mt-1 text-foodiz-gray text-[10px]">
                  <span className="flex items-center gap-0.5"><Star size={9} className="text-foodiz-gold" /> 4.8</span>
                  <span>• 20-30 min</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}