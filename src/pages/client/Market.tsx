import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Star, Clock, MapPin, ShoppingCart } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import { loadClientCatalog } from "../../lib/clientCatalog";

export default function MarketPage() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<any[]>([]);
  const [cityName, setCityName] = useState("votre position");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catalog = await loadClientCatalog();
        setCityName(catalog.coverage.city || "votre adresse");
        const filtered = catalog.restaurants.filter((restaurant) => /market|épicerie/i.test(restaurant.cuisine_type || ""));
        if (filtered.length) {
          const { data: reviews } = await supabase.from("reviews").select("restaurant_rating, orders!inner(restaurant_id)").in("orders.restaurant_id", filtered.map((restaurant) => restaurant.id));
          setMarkets(filtered.map((market) => {
              const values = (reviews || []).filter((review: any) => review.orders?.restaurant_id === market.id).map((review: any) => review.restaurant_rating).filter(Boolean);
              return { ...market, rating: values.length ? (values.reduce((sum: number, value: number) => sum + value, 0) / values.length).toFixed(1) : "Nouveau" };
          }));
        } else setMarkets([]);
      } catch { setMarkets([]); }
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
          <h1 className="weello-title text-lg">Market Weello</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-2 text-weello-gray text-xs mb-6">
          <MapPin size={14} className="text-weello-gold" />
          <span>Autour de {cityName} (10km max)</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-weello-gray animate-pulse">Recherche des marchés...</div>
        ) : markets.length === 0 ? (
          <div className="weello-card p-12 text-center bg-[#0A0A0A] border-weello-gold/10">
            <ShoppingCart size={48} className="mx-auto text-weello-gray/20 mb-4" />
            <h3 className="text-weello-cream text-lg font-medium mb-2">Aucun market trouvé</h3>
            <p className="text-weello-gray text-sm">Il n'y a pas de marchés partenaires dans un rayon de 10km autour de {cityName} pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {markets.map((m) => (
              <button key={m.id} onClick={() => navigate(`/client/establishments/${m.id}`)} className="weello-card p-3 text-left hover:border-weello-gold/30 transition-all">
                <div className="w-full h-24 rounded-xl overflow-hidden mb-3 bg-weello-card">
                  {m.cover_image ? <img src={m.cover_image} alt={m.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🛒</div>}
                </div>
                <h3 className="weello-title text-sm">{m.name}</h3>
                <div className="flex items-center gap-2 mt-1 text-weello-gray text-[10px]">
                  <span className="flex items-center gap-0.5"><Star size={9} className="text-weello-gold" /> {m.rating}</span>
                  <span>• Délai à confirmer</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
