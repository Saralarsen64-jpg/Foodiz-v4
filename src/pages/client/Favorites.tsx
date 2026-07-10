import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Heart, Star } from "lucide-react";

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Jointure pour récupérer les infos du restaurant depuis la table des favoris
        const { data } = await supabase
          .from('client_favorites')
          .select('restaurant_id, restaurants(id, name, cover_image, cuisine_type)')
          .eq('user_id', user.id);
        
        if (data) {
          const restos = data.map((item: any) => item.restaurants).filter(Boolean);
          const { data: reviews } = await supabase.from("reviews").select("restaurant_rating, orders!inner(restaurant_id)").in("orders.restaurant_id", restos.map((restaurant: any) => restaurant.id));
          setFavorites(restos.map((restaurant: any) => {
            const values = (reviews || []).filter((review: any) => review.orders?.restaurant_id === restaurant.id).map((review: any) => review.restaurant_rating).filter(Boolean);
            return { ...restaurant, rating: values.length ? (values.reduce((sum: number, value: number) => sum + value, 0) / values.length).toFixed(1) : "Nouveau" };
          }));
        }
      }
      setLoading(false);
    };
    fetchFavorites();
  }, []);

  const handleRemove = async (restaurantId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('client_favorites').delete().eq('user_id', user.id).eq('restaurant_id', restaurantId);
      setFavorites(favorites.filter(r => r.id !== restaurantId));
    }
  };

  return (
    <div className="min-h-screen bg-weello-black pb-24 animate-fade-in-up border-x-2 border-weello-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />
      
      <header className="bg-weello-card border-b border-weello-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/client/account")} className="text-weello-gold"><ChevronLeft size={24} /></button>
          <h1 className="weello-title text-lg">Mes Favoris</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="text-center py-10 text-weello-gray animate-pulse">Chargement des favoris...</div>
        ) : favorites.length === 0 ? (
          <div className="weello-card p-12 text-center bg-[#0A0A0A] border-weello-gold/10">
            <Heart size={48} className="mx-auto text-weello-gray/20 mb-4" />
            <h3 className="text-weello-cream text-lg font-medium mb-2">Aucun favori</h3>
            <p className="text-weello-gray text-sm">Ajoutez des restaurants à vos favoris pour les retrouver ici.</p>
          </div>
        ) : (
          favorites.map((resto) => (
            <div key={resto.id} className="weello-card p-3 flex items-center gap-4 bg-[#0A0A0A] border-weello-gold/10">
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-weello-black">
                {resto.cover_image ? (
                  <img src={resto.cover_image} alt={resto.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-weello-cream font-bold text-sm">{resto.name}</h3>
                <p className="text-weello-gray text-xs">{resto.cuisine_type || "Gastronomie"}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star size={10} className="text-weello-gold fill-weello-gold" />
                  <span className="text-[10px] text-weello-cream">{resto.rating}</span>
                </div>
              </div>
              <button onClick={() => handleRemove(resto.id)} className="p-2 text-weello-red hover:bg-weello-red/10 rounded-full transition-colors">
                <Heart size={18} className="fill-weello-red" />
              </button>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
