import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Search, MapPin, Gift, Star, Clock, ChevronRight, Flame, Beef, Pizza, Cookie, Wine, ShoppingCart, Sandwich, Salad, Navigation, User, ShoppingBag, Bell } from "lucide-react";

const CATEGORIES = [
  { label: "Market", icon: ShoppingCart, path: "/client/market" },
  { label: "Restos", icon: Flame, path: "/client/restaurants" },
  { label: "Burgers", icon: Sandwich, path: "/client/restaurants?category=burgers" },
  { label: "Pizzas", icon: Pizza, path: "/client/restaurants?category=pizzas" },
  { label: "Asiatique", icon: Salad, path: "/client/restaurants?category=asian" },
  { label: "Gastro", icon: Wine, path: "/client/restaurants?category=gastronomic" },
];

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; var dLat = deg2rad(lat2 - lat1); var dLon = deg2rad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); return R * c;
}
function deg2rad(deg: number) { return deg * (Math.PI / 180) }

export default function ClientHome() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [cityName, setCityName] = useState("");
  const [points, setPoints] = useState(0);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loadingRestos, setLoadingRestos] = useState(false);

  const fetchCityName = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      setCityName(data.address.city || data.address.town || data.address.village || "Ma Position");
    } catch (error) { setCityName("Ma Position"); }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: wallet } = await supabase.from('client_wallets').select('points_balance').eq('user_id', user.id).single();
        if (wallet) setPoints(wallet.points_balance || 0);
        const { data: profile } = await supabase.from('profiles').select('latitude, longitude').eq('id', user.id).single();
        if (profile?.latitude && profile?.longitude) {
          setLocationEnabled(true);
          fetchCityName(profile.latitude, profile.longitude);
          fetchRestaurants(profile.latitude, profile.longitude);
        }
      }
    };
    fetchInitialData();
  }, []);

  const fetchRestaurants = async (lat: number, lng: number) => {
    setLoadingRestos(true);
    const { data: restos } = await supabase.from('restaurants').select('*').eq('is_active', true);
    if (restos) {
      const filteredRestos = restos.filter((r: any) => {
        if (r.latitude && r.longitude) return getDistanceFromLatLonInKm(lat, lng, r.latitude, r.longitude) <= 10;
        return true;
      });
      setRestaurants(filteredRestos.map((r: any) => ({ id: r.id, name: r.name, note: 4.8, temps: "20-30 min", image: r.cover_image, emoji: "🍽️" })));
    }
    setLoadingRestos(false);
  };

  const enableLocation = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude; const lng = position.coords.longitude;
      setLocationEnabled(true);
      await fetchCityName(lat, lng);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').update({ latitude: lat, longitude: lng }).eq('id', user.id);
      fetchRestaurants(lat, lng);
    }, () => alert("Veuillez autoriser l'accès à votre position."));
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up relative overflow-x-hidden">
      {/* Bordures dorées latérales subtiles */}
      <div className="pointer-events-none fixed top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-foodiz-gold/20 to-transparent z-50" />
      <div className="pointer-events-none fixed top-0 bottom-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-foodiz-gold/20 to-transparent z-50" />

      {/* HEADER ÉLÉGANT ET AÉRÉ */}
      <header className="px-6 pt-12 pb-8 bg-gradient-to-b from-foodiz-card to-foodiz-black border-b border-foodiz-gold/10">
        <div className="max-w-lg mx-auto flex justify-between items-center mb-8">
          <img src="https://i.imgur.com/gtCArFr.png" alt="Foodiz" className="h-10 w-auto" />
          <div className="flex gap-3">
            <button onClick={() => navigate("/client/account/notifications")} className="p-2.5 rounded-full bg-foodiz-black border border-foodiz-gold/20 text-foodiz-gold hover:bg-foodiz-gold/10 transition-colors">
              <Bell size={18} />
            </button>
            <button onClick={() => navigate("/client/account")} className="p-2.5 rounded-full bg-foodiz-black border border-foodiz-gold/20 text-foodiz-gold hover:bg-foodiz-gold/10 transition-colors">
              <User size={18} />
            </button>
          </div>
        </div>
        
        <div className="max-w-lg mx-auto">
          <button onClick={enableLocation} className="flex items-center gap-2 text-foodiz-gray text-sm mb-2 hover:text-foodiz-gold transition-colors group">
            <div className={`p-1 rounded-full ${locationEnabled ? 'bg-foodiz-green/20 text-foodiz-green' : 'bg-foodiz-gold/10 text-foodiz-gold'}`}>
              <Navigation size={12} />
            </div>
            <span className="group-hover:underline decoration-dotted underline-offset-4">
              {locationEnabled ? `Livraison à ${cityName}` : "Définir ma localisation"}
            </span>
          </button>
          <h1 className="foodiz-title text-3xl text-foodiz-cream mt-2">
            Bon appétit !
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-10">
        
        {/* BARRE DE RECHERCHE FLOTTANTE */}
        <div className="relative -mt-12 z-10">
          <div className="foodiz-card p-2 flex items-center bg-foodiz-card border border-foodiz-gold/20 shadow-xl shadow-black/50 rounded-2xl">
            <Search className="ml-3 text-foodiz-gray" size={20} />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Un plat, un restaurant..." 
              className="flex-1 bg-transparent text-foodiz-cream px-4 py-2 outline-none text-sm placeholder-foodiz-gray/50" 
            />
          </div>
        </div>

        {/* CARTE POINTS FIDÉLITÉ */}
        <div onClick={() => navigate("/client/advantages")} className="foodiz-card p-5 bg-gradient-to-r from-foodiz-gold/10 to-foodiz-card border border-foodiz-gold/30 relative overflow-hidden cursor-pointer group rounded-2xl">
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-foodiz-gold font-bold mb-1">Foodiz Club</p>
              <p className="text-2xl font-serif italic text-foodiz-cream">{points.toLocaleString('fr-FR')} <span className="text-sm text-foodiz-gray not-italic font-sans">pts</span></p>
            </div>
            <div className="w-10 h-10 rounded-full bg-foodiz-gold flex items-center justify-center text-foodiz-black group-hover:scale-110 transition-transform">
              <Gift size={20} />
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-foodiz-gold/10 rounded-full blur-xl"></div>
        </div>

        {/* CATÉGORIES (Scroll horizontal élégant) */}
        <div>
          <h2 className="foodiz-title text-lg mb-4">Catégories</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
            {CATEGORIES.map((cat) => (
              <button key={cat.label} onClick={() => navigate(cat.path)} className="flex flex-col items-center gap-3 min-w-[70px] group">
                <div className="w-16 h-16 rounded-2xl bg-foodiz-card border border-foodiz-gold/10 flex items-center justify-center text-foodiz-gold group-hover:border-foodiz-gold/40 group-hover:bg-foodiz-gold/5 transition-all">
                  <cat.icon size={24} />
                </div>
                <span className="text-[10px] text-foodiz-gray group-hover:text-foodiz-cream transition-colors">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CARTES IMMERSIVES (Market & Restaurants) - ESPACE GÉNÉREUX */}
        <div className="pt-4">
          <h2 className="foodiz-title text-lg mb-6">Explorer</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: "Restaurants", image: "/images/auth-restaurant.jpg", path: "/client/restaurants", color: "from-orange-900/40" },
              { title: "Market", image: "/images/market-bio.jpg", path: "/client/market", color: "from-green-900/40" }
            ].map((card) => (
              <button
                key={card.title}
                onClick={() => navigate(card.path)}
                className="group relative overflow-hidden rounded-3xl border border-foodiz-gold/20 hover:border-foodiz-gold/50 transition-all duration-500 shadow-xl shadow-black/30 aspect-[3/4]"
              >
                <img src={card.image} alt={card.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" />
                <div className={`absolute inset-0 bg-gradient-to-t ${card.color} via-foodiz-black/60 to-transparent`} />
                
                <div className="absolute bottom-0 left-0 right-0 p-5 text-left">
                  <h3 className="text-2xl font-serif italic text-foodiz-cream mb-1">{card.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-foodiz-gold text-[10px] tracking-widest uppercase font-bold">Voir tout</span>
                    <ChevronRight size={12} className="text-foodiz-gold group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RESTAURANTS À PROXIMITÉ */}
        <div className="pb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="foodiz-title text-lg">Autour de vous</h2>
            <button onClick={() => navigate("/client/restaurants")} className="text-xs text-foodiz-gold hover:underline">Voir tout</button>
          </div>
          
          {!locationEnabled ? (
            <div className="foodiz-card p-8 text-center border-foodiz-gold/10 bg-foodiz-gold/5">
              <p className="text-foodiz-gold text-sm font-medium mb-1">Localisation requise</p>
              <p className="text-foodiz-gray text-xs">Activez le GPS en haut de page pour voir les restos.</p>
            </div>
          ) : loadingRestos ? (
            <div className="text-center py-10 text-foodiz-gray text-sm animate-pulse">Recherche des meilleurs restos...</div>
          ) : restaurants.length === 0 ? (
            <div className="foodiz-card p-8 text-center border-foodiz-gold/10">
              <p className="text-foodiz-gray text-sm">Aucun restaurant dans un rayon de 10km.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {restaurants.map((r) => (
                <button key={r.id} onClick={() => navigate(`/client/establishments/${r.id}`)} className="w-full foodiz-card p-3 flex gap-4 cursor-pointer hover:border-foodiz-gold/30 transition-all group bg-[#0A0A0A]">
                  <div className="w-20 h-20 rounded-2xl bg-foodiz-black border border-foodiz-gold/10 overflow-hidden shrink-0">
                    {r.image ? (
                      <img src={r.image} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">{r.emoji}</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center text-left">
                    <h3 className="text-foodiz-cream font-bold text-base font-serif italic group-hover:text-foodiz-gold transition-colors">{r.name}</h3>
                    <p className="text-[10px] text-foodiz-gray mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-foodiz-green"></span> Gastronomie • {r.temps}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <Star size={10} className="text-foodiz-gold fill-foodiz-gold" />
                      <span className="text-[10px] text-foodiz-cream font-bold">{r.note}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* BARRE DE NAVIGATION DU BAS (Flottante, centrée et cliquable) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-lg bg-foodiz-card/95 backdrop-blur-md border border-foodiz-gold/20 rounded-2xl px-6 py-4 flex justify-between items-center z-50 shadow-2xl shadow-black/50">
          <button onClick={() => navigate("/client")} className="flex flex-col items-center gap-1 text-foodiz-gold">
            <Search size={20} />
            <span className="text-[9px] font-medium">Explorer</span>
          </button>
          <button onClick={() => navigate("/client/market")} className="flex flex-col items-center gap-1 text-foodiz-gray hover:text-foodiz-gold transition-colors">
            <ShoppingBag size={20} />
            <span className="text-[9px] font-medium">Market</span>
          </button>
          <button onClick={() => navigate("/client/orders")} className="flex flex-col items-center gap-1 text-foodiz-gray hover:text-foodiz-gold transition-colors">
            <Gift size={20} />
            <span className="text-[9px] font-medium">Commandes</span>
          </button>
          <button onClick={() => navigate("/client/account")} className="flex flex-col items-center gap-1 text-foodiz-gray hover:text-foodiz-gold transition-colors">
            <User size={20} />
            <span className="text-[9px] font-medium">Compte</span>
          </button>
      </div>
    </div>
  );
}