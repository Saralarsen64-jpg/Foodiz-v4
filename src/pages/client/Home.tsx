import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Search, MapPin, Gift, Star, Clock, Truck, ChevronRight, Flame, Beef, Pizza, Cookie, Wine, ShoppingCart, Sandwich, Salad } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

const CATEGORIES = [
  { label: "Market", icon: ShoppingCart, path: "/client/market" },
  { label: "Restaurants", icon: Flame, path: "/client/restaurants" },
  { label: "Halal", icon: Beef, path: "/client/restaurants?category=halal" },
  { label: "Burgers", icon: Sandwich, path: "/client/restaurants?category=burgers" },
  { label: "Pizzas", icon: Pizza, path: "/client/restaurants?category=pizzas" },
  { label: "Asiatique", icon: Salad, path: "/client/restaurants?category=asian" },
  { label: "Gastronomique", icon: Wine, path: "/client/restaurants?category=gastronomic" },
  { label: "Gourmandises", icon: Cookie, path: "/client/restaurants?category=gourmandises" },
];

const MARKETS = [
  { id: "m1", name: "Marché Bio", note: 4.8, temps: "20-30 min", image: "/images/market-bio.jpg" },
  { id: "m2", name: "Épicerie Fine", note: 4.7, temps: "25-35 min", image: "/images/market-epicerie.jpg" },
  { id: "m3", name: "Primeur du Coin", note: 4.5, temps: "15-25 min", image: "/images/market-bio.jpg" },
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
  const [points, setPoints] = useState(0);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loadingRestos, setLoadingRestos] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: wallet } = await supabase.from('client_wallets').select('points_balance').eq('user_id', user.id).single();
        if (wallet) setPoints(wallet.points_balance || 0);
      }
    };
    fetchInitialData();
  }, []);

  const enableLocation = async () => {
    if (!navigator.geolocation) return;
    setLoadingRestos(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const userLat = position.coords.latitude; const userLng = position.coords.longitude;
      setLocationEnabled(true);
      const { data: restos } = await supabase.from('restaurants').select('*').eq('is_active', true);
      if (restos) {
        const filteredRestos = restos.filter((r: any) => {
          if (r.latitude && r.longitude) return getDistanceFromLatLonInKm(userLat, userLng, r.latitude, r.longitude) <= 10;
          return true;
        });
        setRestaurants(filteredRestos.map((r: any) => ({ id: r.id, name: r.name, note: 4.8, temps: "20-30 min", frais: 2.50, image: r.cover_image || "/images/restaurant-maison-k.jpg", emoji: "🍽️" })));
      }
      setLoadingRestos(false);
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up relative min-h-screen bg-foodiz-black pb-20">
      <div className="pointer-events-none absolute top-36 bottom-24 left-0 w-[2px] bg-gradient-to-b from-transparent via-foodiz-gold/50 to-transparent shadow-[0_0_14px_rgba(216,168,79,0.35)]" />
      <div className="pointer-events-none absolute top-36 bottom-24 right-0 w-[2px] bg-gradient-to-b from-transparent via-foodiz-gold/50 to-transparent shadow-[0_0_14px_rgba(216,168,79,0.35)]" />

      <div className="relative -mx-4 overflow-hidden rounded-b-[2rem] border-b border-foodiz-gold/15 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
        <img src="https://i.imgur.com/gtCArFr.png" alt="Foodiz" className="w-full h-auto block" />
        <button onClick={enableLocation} className="absolute bottom-3 left-4 rounded-full border border-foodiz-gold/20 bg-black/45 backdrop-blur-sm px-3 py-1.5 text-[10px] font-medium text-foodiz-cream hover:border-foodiz-gold/40 transition-all">
          {locationEnabled ? (loadingRestos ? "Recherche des restos à -10km..." : "Localisation activée (-10km)") : "Activer ma localisation"}
        </button>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-foodiz-black/25 to-foodiz-black" />
      </div>

      <section className="relative -mt-8 rounded-[2rem] border border-foodiz-gold/20 bg-[radial-gradient(circle_at_top,rgba(216,168,79,0.08),transparent_35%),rgba(10,10,10,0.98)] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.45),0_0_28px_rgba(216,168,79,0.06)]">
      <div className="flex items-center gap-2 text-foodiz-cream/80">
        <GoldIcon icon={MapPin} size={16} />
        <span className="text-sm font-medium">{locationEnabled ? "Autour de vous (10km max)" : "Paris 11e — Livré en 20-35 min"}</span>
      </div>

      <div className="relative mt-4">
        <GoldIcon icon={Search} size={18} className="absolute left-4 top-1/2 -translate-y-1/2" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un restaurant, un plat..." className="w-full bg-foodiz-card border border-foodiz-gold/15 rounded-2xl py-3.5 pl-12 pr-4 text-foodiz-cream placeholder-foodiz-gray/50 text-sm outline-none focus:border-foodiz-gold/40 transition-all" />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        {[{ title: "Restaurants", image: "/images/auth-restaurant.jpg", path: "/client/restaurants" }, { title: "Market", image: "/images/market-bio.jpg", path: "/client/market" }].map((card) => (
          <button key={card.title} onClick={() => navigate(card.path)} className="group relative overflow-hidden rounded-2xl border border-foodiz-gold/20 hover:border-foodiz-gold/50 transition-all duration-500 shadow-xl shadow-black/30 aspect-[4/5]">
            <img src={card.image} alt={card.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-foodiz-black via-foodiz-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-foodiz-black/30 via-transparent to-foodiz-gold/5" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foodiz-gold/70 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-xl font-semibold italic text-foodiz-cream" style={{ fontFamily: "'Playfair Display', serif" }}>{card.title}</h3>
              <div className="flex items-center gap-1.5 mt-1"><span className="text-foodiz-gold text-[10px] tracking-widest uppercase font-medium">Découvrir</span><ChevronRight size={11} className="text-foodiz-gold" /></div>
            </div>
            <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-foodiz-black/40 backdrop-blur-sm border border-foodiz-gold/40 flex items-center justify-center group-hover:bg-foodiz-gold group-hover:border-foodiz-gold transition-all"><ChevronRight size={12} className="text-foodiz-gold group-hover:text-foodiz-black transition-colors" /></div>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="foodiz-title text-lg mb-4">Catégories</h2>
        <div className="grid grid-cols-4 gap-3">
          {CATEGORIES.map((cat) => (
            <button key={cat.label} onClick={() => navigate(cat.path)} className="flex flex-col items-center gap-2 p-3 foodiz-card hover:border-foodiz-gold/30 transition-all">
              <div className="w-10 h-10 rounded-full bg-foodiz-gradient-gold flex items-center justify-center"><GoldIcon icon={cat.icon} size={18} /></div>
              <span className="text-[10px] text-foodiz-cream/80 font-medium text-center leading-tight">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => navigate("/client/advantages")} className="foodiz-card p-5 bg-gradient-to-r from-foodiz-gold/10 to-foodiz-card border-foodiz-gold/20 w-full text-left mt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1"><GoldIcon icon={Gift} size={18} /><span className="foodiz-title text-base">Foodiz Club</span></div>
            <p className="text-foodiz-gray text-xs mt-1">Cumulez des points à chaque commande et débloquez des avantages exclusifs.</p>
            <span className="mt-3 text-foodiz-gold text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all">Voir mes avantages <ChevronRight size={12} /></span>
          </div>
          <div className="text-right"><div className="text-foodiz-gold text-2xl font-bold font-serif">{points.toLocaleString('fr-FR')}</div><div className="text-foodiz-gray text-[10px]">points</div></div>
        </div>
      </button>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-4"><h2 className="foodiz-title text-lg">Restaurants à proximité</h2><button onClick={() => navigate("/client/restaurants")} className="text-foodiz-gold text-xs font-semibold flex items-center gap-1">Voir tout <ChevronRight size={12} /></button></div>
        {!locationEnabled ? (<div className="foodiz-card p-6 text-center border-foodiz-gold/10"><p className="text-foodiz-gray text-sm mb-2">Activez votre localisation pour voir les restaurants autour de vous.</p></div>) : loadingRestos ? (<div className="text-center py-6 text-foodiz-gray text-sm animate-pulse">Recherche des restaurants à -10km...</div>) : restaurants.length === 0 ? (<div className="foodiz-card p-6 text-center border-foodiz-gold/10"><p className="text-foodiz-gray text-sm">Aucun restaurant disponible dans un rayon de 10km pour le moment.</p></div>) : (
          <div className="space-y-3">
            {restaurants.map((r) => (
              <button key={r.id} onClick={() => navigate(`/client/establishments/${r.id}`)} className="w-full foodiz-card p-2 pr-4 flex items-center gap-3 text-left hover:border-foodiz-gold/30 transition-all">
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-foodiz-card"><img src={r.image} alt={r.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.innerHTML = `<span style="font-size:28px">${r.emoji}</span>`; }} /></div>
                <div className="flex-1 min-w-0"><h3 className="foodiz-title text-sm">{r.name}</h3><div className="flex items-center gap-3 mt-1 text-foodiz-gray text-xs flex-wrap"><span className="flex items-center gap-1"><GoldIcon icon={Star} size={11} /> {r.note}</span><span className="flex items-center gap-1"><GoldIcon icon={Clock} size={11} /> {r.temps}</span><span className="flex items-center gap-1"><GoldIcon icon={Truck} size={11} /> {r.frais.toFixed(2).replace(".", ",")} €</span></div></div><ChevronRight size={16} className="text-foodiz-gold/50 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-4"><h2 className="foodiz-title text-lg">Market</h2><button onClick={() => navigate("/client/market")} className="text-foodiz-gold text-xs font-semibold flex items-center gap-1">Voir tout <ChevronRight size={12} /></button></div>
        <div className="grid grid-cols-2 gap-3">
          {MARKETS.map((m) => (
            <button key={m.id} onClick={() => navigate(`/client/establishments/${m.id}`)} className="foodiz-card p-3 text-left hover:border-foodiz-gold/30 transition-all">
              <div className="w-full h-20 rounded-xl overflow-hidden mb-3 bg-foodiz-card"><img src={m.image} alt={m.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.innerHTML = `<span style="font-size:28px">🛒</span>`; }} /></div>
              <h3 className="foodiz-title text-xs">{m.name}</h3><div className="flex items-center gap-2 mt-0.5 text-foodiz-gray text-[10px]"><span className="flex items-center gap-0.5"><Star size={9} className="text-foodiz-gold" /> {m.note}</span><span>• {m.temps}</span></div>
            </button>
          ))}
        </div>
      </div>
      </section>
    </div>
  );
}