import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { MapPin, Gift, Search, Star, Sandwich, Coffee, IceCream, Wine, ShoppingBag, User } from "lucide-react";

export default function ClientHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState(0);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Récupérer les VRAIS points
        const { data: wallet } = await supabase.from('client_wallets').select('points_balance').eq('user_id', user.id).single();
        if (wallet) setPoints(wallet.points_balance || 0);

        // Récupérer les VRAIS restaurants
        const { data: restos } = await supabase.from('restaurants').select('*').eq('is_active', true).limit(10);
        if (restos) setRestaurants(restos);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const categories = [
    { name: "Burgers", icon: Sandwich, color: "bg-orange-500/10 text-orange-500" }, // Icône Burger corrigée
    { name: "Cafés", icon: Coffee, color: "bg-amber-700/10 text-amber-700" },
    { name: "Desserts", icon: IceCream, color: "bg-pink-500/10 text-pink-500" },
    { name: "Vins", icon: Wine, color: "bg-purple-500/10 text-purple-500" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#FFF8EA] pb-24">
      {/* Header avec Logo Direct (Pixel Perfect) */}
      <header className="px-6 pt-8 pb-4 bg-[#111111] border-b border-[#D8A84F]/10">
        <div className="max-w-lg mx-auto flex justify-between items-center mb-6">
            {/* Logo affiché directement en image pour éviter les bugs */}
            <img src="https://i.imgur.com/gtCArFr.png" alt="Foodiz" className="h-10 w-auto" />
            <div className="flex gap-3">
                <button onClick={() => navigate("/client/cart")} className="p-2 rounded-full bg-[#050505] border border-[#D8A84F]/20 text-[#D8A84F]">
                    <ShoppingBag size={20} />
                </button>
                <button onClick={() => navigate("/client/account")} className="p-2 rounded-full bg-[#050505] border border-[#D8A84F]/20 text-[#D8A84F]">
                    <User size={20} />
                </button>
            </div>
        </div>
        
        <div className="max-w-lg mx-auto flex items-center gap-2 text-[#B8B8B8] text-sm mb-2">
            <MapPin size={14} className="text-[#D8A84F]" />
            <span>Livraison à <span className="text-[#FFF8EA] font-medium">Paris 11ème</span></span>
        </div>
        
        <h1 className="max-w-lg mx-auto text-2xl font-serif italic text-[#FFF8EA]">
          Bon appétit !
        </h1>
      </header>

      <main className="max-w-lg mx-auto px-6 py-6 space-y-8">
        
        {/* Wallet Points Réel */}
        <div className="bg-[#111111] p-5 rounded-2xl border border-[#D8A84F]/30 relative overflow-hidden cursor-pointer" onClick={() => navigate("/client/advantages")}>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#D8A84F] font-bold mb-1">Mes Points Foodiz</p>
              <p className="text-3xl font-serif italic text-[#FFF8EA]">{points} <span className="text-base text-[#B8B8B8] not-italic">pts</span></p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#D8A84F] flex items-center justify-center text-[#050505]">
              <Gift size={20} />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B8B8B8]" size={20} />
          <input 
            type="text" 
            placeholder="Rechercher un plat, un restaurant..." 
            className="w-full bg-[#111111] border border-[#D8A84F]/10 rounded-xl py-3 pl-12 pr-4 text-[#FFF8EA] outline-none focus:border-[#D8A84F]/50 transition-colors"
            onClick={() => navigate("/client/search")}
          />
        </div>

        {/* Categories */}
        <div>
          <h2 className="text-lg font-bold text-[#FFF8EA] mb-4">Catégories</h2>
          <div className="grid grid-cols-4 gap-4">
            {categories.map((cat) => (
              <button key={cat.name} onClick={() => navigate("/client/restaurants")} className="flex flex-col items-center gap-2 group">
                <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <cat.icon size={24} />
                </div>
                <span className="text-[10px] text-[#B8B8B8] group-hover:text-[#FFF8EA] transition-colors">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Restaurants */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-[#FFF8EA]">Restaurants</h2>
            <button onClick={() => navigate("/client/restaurants")} className="text-xs text-[#D8A84F]">Voir tout</button>
          </div>
          
          {loading ? (
            <div className="text-center py-10 text-[#B8B8B8]">Chargement...</div>
          ) : restaurants.length === 0 ? (
            <div className="bg-[#111111] p-8 rounded-2xl text-center border border-[#D8A84F]/10">
              <p className="text-[#B8B8B8] text-sm">Aucun restaurant disponible pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {restaurants.map((resto) => (
                <div key={resto.id} onClick={() => navigate(`/client/establishments/${resto.id}`)} className="bg-[#111111] p-3 rounded-2xl flex gap-4 cursor-pointer hover:border-[#D8A84F]/30 border border-transparent transition-all">
                  <div className="w-20 h-20 rounded-xl bg-[#050505] overflow-hidden shrink-0">
                    {resto.cover_image ? (
                      <img src={resto.cover_image} alt={resto.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#B8B8B8]/20"><Star size={20} /></div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-[#FFF8EA] font-bold text-base font-serif italic">{resto.name}</h3>
                    <p className="text-[10px] text-[#B8B8B8] mt-1">{resto.cuisine_type || "Gastronomie"} • 20-30 min</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Star size={10} className="text-[#D8A84F] fill-[#D8A84F]" />
                      <span className="text-[10px] text-[#FFF8EA] font-bold">4.8</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation Bar (Pour que tout soit cliquable) */}
      <div className="fixed bottom-0 left-0 w-full bg-[#111111] border-t border-[#D8A84F]/10 px-6 py-3 flex justify-between items-center z-50">
          <button onClick={() => navigate("/client")} className="flex flex-col items-center gap-1 text-[#D8A84F]">
            <Search size={20} />
            <span className="text-[9px]">Explorer</span>
          </button>
          <button onClick={() => navigate("/client/market")} className="flex flex-col items-center gap-1 text-[#B8B8B8]">
            <ShoppingBag size={20} />
            <span className="text-[9px]">Market</span>
          </button>
          <button onClick={() => navigate("/client/orders")} className="flex flex-col items-center gap-1 text-[#B8B8B8]">
            <Gift size={20} />
            <span className="text-[9px]">Commandes</span>
          </button>
          <button onClick={() => navigate("/client/account")} className="flex flex-col items-center gap-1 text-[#B8B8B8]">
            <User size={20} />
            <span className="text-[9px]">Compte</span>
          </button>
      </div>
    </div>
  );
}