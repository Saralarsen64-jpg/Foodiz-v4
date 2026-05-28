import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { MapPin, Gift, Search, Star, Sandwich, Coffee, IceCream, Wine, ShoppingBag, User } from "lucide-react";

export default function ClientHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState(0);
  const [address, setAddress] = useState("Paris 11ème");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: wallet } = await supabase.from('client_wallets').select('points_balance').eq('user_id', user.id).single();
        if (wallet) setPoints(wallet.points_balance || 0);
        const { data: restos } = await supabase.from('restaurants').select('*').eq('is_active', true).limit(10);
        if (restos) setRestaurants(restos);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const categories = [
    { name: "Burgers", icon: Sandwich, color: "bg-orange-500/10 text-orange-500" },
    { name: "Cafés", icon: Coffee, color: "bg-amber-700/10 text-amber-700" },
    { name: "Desserts", icon: IceCream, color: "bg-pink-500/10 text-pink-500" },
    { name: "Vins", icon: Wine, color: "bg-purple-500/10 text-purple-500" },
  ];

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up">
      {/* Header Premium avec Logo */}
      <header className="px-6 pt-10 pb-6 bg-foodiz-card border-b border-foodiz-gold/10">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-6">
            {/* Logo affiché directement en image pour éviter les bugs de composant */}
            <img src="https://i.imgur.com/gtCArFr.png" alt="Foodiz" className="h-10 w-auto" />
            <div className="flex gap-3">
                <button onClick={() => navigate("/client/cart")} className="p-2 rounded-full bg-foodiz-black border border-foodiz-gold/20 text-foodiz-gold">
                    <ShoppingBag size={20} />
                </button>
                <button onClick={() => navigate("/client/account")} className="p-2 rounded-full bg-foodiz-black border border-foodiz-gold/20 text-foodiz-gold">
                    <User size={20} />
                </button>
            </div>
          </div>
          
          {/* Localisation Cliquable */}
          <div 
            className="flex items-center gap-2 text-foodiz-gray text-sm mb-2 cursor-pointer hover:text-foodiz-gold transition-colors group"
            onClick={() => navigate("/client/account/addresses")}
          >
            <MapPin size={14} className="text-foodiz-gold group-hover:scale-110 transition-transform" />
            <span>Livraison à <span className="text-foodiz-cream font-medium underline decoration-dotted underline-offset-4">{address}</span></span>
          </div>
          
          <h1 className="foodiz-title text-2xl text-foodiz-cream mt-2">
            Bon appétit !
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-8">
        
        {/* Wallet Points Réel */}
        <div className="foodiz-card p-6 bg-gradient-to-r from-foodiz-gold/10 to-foodiz-card border border-foodiz-gold/30 relative overflow-hidden cursor-pointer group" onClick={() => navigate("/client/advantages")}>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-foodiz-gold font-bold mb-1">Mes Points Foodiz</p>
              <p className="text-3xl font-serif italic text-foodiz-cream">{points} <span className="text-lg text-foodiz-gray not-italic">pts</span></p>
            </div>
            <div className="w-12 h-12 rounded-full bg-foodiz-gold flex items-center justify-center text-foodiz-black group-hover:scale-105 transition-transform">
              <Gift size={24} />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foodiz-gray" size={20} />
          <input 
            type="text" 
            readOnly
            placeholder="Rechercher un plat, un restaurant..." 
            className="w-full foodiz-card border border-foodiz-gold/10 rounded-xl py-4 pl-12 pr-4 text-foodiz-cream outline-none focus:border-foodiz-gold/50 transition-colors cursor-pointer"
            onClick={() => navigate("/client/search")}
          />
        </div>

        {/* Categories */}
        <div>
          <h2 className="foodiz-title text-lg mb-4">Catégories</h2>
          <div className="grid grid-cols-4 gap-4">
            {categories.map((cat) => (
              <button key={cat.name} onClick={() => navigate("/client/restaurants")} className="flex flex-col items-center gap-3 group">
                <div className={`w-16 h-16 rounded-2xl ${cat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <cat.icon size={28} />
                </div>
                <span className="text-xs text-foodiz-gray group-hover:text-foodiz-cream transition-colors">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Restaurants */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="foodiz-title text-lg">Restaurants à la une</h2>
            <button onClick={() => navigate("/client/restaurants")} className="text-xs text-foodiz-gold hover:underline">Voir tout</button>
          </div>
          
          {loading ? (
            <div className="text-center py-10 text-foodiz-gray animate-pulse">Chargement des meilleurs restos...</div>
          ) : restaurants.length === 0 ? (
            <div className="foodiz-card p-8 text-center border-foodiz-gold/10">
              <p className="text-foodiz-gray text-sm">Aucun restaurant disponible dans votre zone pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {restaurants.map((resto) => (
                <div key={resto.id} onClick={() => navigate(`/client/establishments/${resto.id}`)} className="foodiz-card p-3 flex gap-4 cursor-pointer hover:border-foodiz-gold/30 transition-all group">
                  <div className="w-24 h-24 rounded-xl bg-foodiz-black border border-foodiz-gold/10 overflow-hidden shrink-0">
                    {resto.cover_image ? (
                      <img src={resto.cover_image} alt={resto.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-foodiz-gray/20"><Star size={24} /></div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-foodiz-cream font-bold text-lg font-serif italic group-hover:text-foodiz-gold transition-colors">{resto.name}</h3>
                    <p className="text-xs text-foodiz-gray mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-foodiz-green"></span> {resto.cuisine_type || "Gastronomie"} • 20-30 min
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <Star size={12} className="text-foodiz-gold fill-foodiz-gold" />
                      <span className="text-xs text-foodiz-cream font-bold">4.8</span>
                      <span className="text-[10px] text-foodiz-gray">(120+ avis)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-foodiz-card border-t border-foodiz-gold/10 px-6 py-3 flex justify-between items-center z-50">
          <button onClick={() => navigate("/client")} className="flex flex-col items-center gap-1 text-foodiz-gold">
            <Search size={20} />
            <span className="text-[9px]">Explorer</span>
          </button>
          <button onClick={() => navigate("/client/market")} className="flex flex-col items-center gap-1 text-foodiz-gray hover:text-foodiz-gold transition-colors">
            <ShoppingBag size={20} />
            <span className="text-[9px]">Market</span>
          </button>
          <button onClick={() => navigate("/client/orders")} className="flex flex-col items-center gap-1 text-foodiz-gray hover:text-foodiz-gold transition-colors">
            <Gift size={20} />
            <span className="text-[9px]">Commandes</span>
          </button>
          <button onClick={() => navigate("/client/account")} className="flex flex-col items-center gap-1 text-foodiz-gray hover:text-foodiz-gold transition-colors">
            <User size={20} />
            <span className="text-[9px]">Compte</span>
          </button>
      </div>
    </div>
  );
}