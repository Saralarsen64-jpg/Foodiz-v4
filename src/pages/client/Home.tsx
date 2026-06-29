import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Search, Gift, Star, ChevronRight, Flame, Pizza, Wine, ShoppingCart, Sandwich, Salad, Navigation, User, ShoppingBag, Bell, MapPinned, Route, ShieldCheck } from "lucide-react";
import { FoodizActionCard, FoodizHero, FoodizMetricCard, FoodizPill } from "../../components/FoodizWebUI";
import CityExpansionCard from "../../components/CityExpansionCard";

const CATEGORIES = [
  { label: "Market", icon: ShoppingCart, path: "/client/market" },
  { label: "Restos", icon: Flame, path: "/client/restaurants" },
  { label: "Burgers", icon: Sandwich, path: "/client/restaurants?category=burgers" },
  { label: "Pizzas", icon: Pizza, path: "/client/restaurants?category=pizzas" },
  { label: "Asiatique", icon: Salad, path: "/client/restaurants?category=asian" },
  { label: "Gastro", icon: Wine, path: "/client/restaurants?category=gastronomic" },
];

export default function ClientHome() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [cityName, setCityName] = useState("");
  const [points, setPoints] = useState(0);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loadingRestos, setLoadingRestos] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [coverageStatus, setCoverageStatus] = useState<"available" | "coming_soon" | "address_required">("address_required");
  const [expansionRequested, setExpansionRequested] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Points
        const { data: wallet } = await supabase.from('client_wallets').select('points_balance').eq('user_id', user.id).single();
        if (wallet) setPoints(wallet.points_balance || 0);
        
        // 2. Notifications non lues
        const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
        if (count) setUnreadCount(count);

        // 3. Localisation et catalogue filtré côté serveur.
        const [{ data: profile }, { data: { session } }] = await Promise.all([
          supabase.from('profiles').select('first_name,city').eq('id', user.id).single(),
          supabase.auth.getSession(),
        ]);
        setFirstName(profile?.first_name || "");
        try {
          const response = await fetch("/api/client-catalog", {
            headers: { Authorization: `Bearer ${session?.access_token || ""}` },
            cache: "no-store",
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "Catalogue indisponible");
          const coverage = payload.coverage || { status: "address_required" };
          setCoverageStatus(coverage.status);
          setLocationEnabled(coverage.status !== "address_required");
          setCityName(coverage.city || profile?.city || "mon adresse");
          setExpansionRequested(Boolean(payload.expansionRequest));
          setRestaurants((payload.restaurants || []).map((restaurant: any) => ({
            id: restaurant.id,
            name: restaurant.name,
            note: "Nouveau",
            temps: "Délai à confirmer",
            image: restaurant.cover_image,
            emoji: "🍽️",
            cuisine: restaurant.cuisine_type || "Restaurant",
          })));
        } catch {
          setCoverageStatus("address_required");
          setRestaurants([]);
        }
      }
      setLoadingRestos(false);
    };
    setLoadingRestos(true);
    fetchInitialData();
  }, []);

  const enableLocation = () => navigate("/client/account/addresses");

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/client/search?q=${encodeURIComponent(query)}` : "/client/search");
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up relative overflow-x-hidden">
      <div className="pointer-events-none fixed top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-foodiz-gold/20 to-transparent z-50" />
      <div className="pointer-events-none fixed top-0 bottom-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-foodiz-gold/20 to-transparent z-50" />

      {/* HEADER ÉLÉGANT ET AÉRÉ */}
      <header className="px-6 pt-12 pb-8 bg-gradient-to-b from-foodiz-card to-foodiz-black border-b border-foodiz-gold/10">
        <div className="max-w-lg mx-auto flex justify-between items-center mb-8">
          <img src="/images/Logo-Foodiz.PNG" alt="Foodiz" className="h-10 w-auto" />
          <div className="flex gap-3">
            <button onClick={() => navigate("/client/notifications")} className="relative p-2.5 rounded-full bg-foodiz-black border border-foodiz-gold/20 text-foodiz-gold hover:bg-foodiz-gold/10 transition-colors">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-foodiz-red rounded-full border-2 border-foodiz-black"></span>
              )}
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
            {firstName ? `Bonjour ${firstName}` : "Bon appétit !"}
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-10">
        
        {/* BARRE DE RECHERCHE FLOTTANTE */}
        <div className="relative -mt-12 z-10">
          <form onSubmit={submitSearch} className="foodiz-card p-2 flex items-center bg-foodiz-card border border-foodiz-gold/20 shadow-xl shadow-black/50 rounded-2xl">
            <Search className="ml-3 text-foodiz-gray" size={20} />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Un plat, un restaurant..." 
              className="flex-1 bg-transparent text-foodiz-cream px-4 py-2 outline-none text-sm placeholder-foodiz-gray/50" 
            />
          </form>
        </div>

        <FoodizHero
          eyebrow="Expérience Foodiz"
          title="Votre ville, vos envies, votre livraison suivie."
          description="Foodiz réunit les bonnes adresses locales, un suivi live rassurant et un programme fidélité gourmand — sans perdre l’esprit premium noir, doré et kraft."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FoodizMetricCard
              label="Points"
              value={points.toLocaleString("fr-FR")}
              helper="Foodiz Club"
              icon={Gift}
            />
            <FoodizMetricCard
              label="Autour"
              value={restaurants.length}
              helper="adresses actives"
              icon={ShoppingBag}
              tone={restaurants.length ? "green" : "muted"}
            />
            <FoodizMetricCard
              label="Adresse"
              value={locationEnabled ? "OK" : "À définir"}
              helper={cityName || "livraison précise"}
              icon={MapPinned}
              tone={locationEnabled ? "green" : "muted"}
            />
          </div>
          <div className="mt-4 grid gap-3">
            <FoodizActionCard
              title="Commander maintenant"
              description="Explorez les restaurants et commerces disponibles autour de votre adresse."
              icon={ShoppingBag}
              badge="Local"
              onClick={() => navigate("/client/restaurants")}
            />
            <FoodizActionCard
              title="Suivi live de commande"
              description="Dès qu’un livreur prend le relais, retrouvez son avancée et les étapes clés."
              icon={Route}
              badge="Live"
              onClick={() => navigate("/client/orders")}
            />
            <FoodizActionCard
              title="Avantages Foodiz Club"
              description="Consultez vos points, récompenses et privilèges disponibles."
              icon={ShieldCheck}
              onClick={() => navigate("/client/advantages")}
            />
          </div>
        </FoodizHero>

        {/* CARTE POINTS FIDÉLITÉ */}
        <div onClick={() => navigate("/client/advantages")} className="foodiz-card p-5 bg-gradient-to-r from-foodiz-gold/10 to-foodiz-card border border-foodiz-gold/30 relative overflow-hidden cursor-pointer group rounded-2xl">
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <div className="mb-2"><FoodizPill>Foodiz Club</FoodizPill></div>
              <p className="text-2xl font-serif italic text-foodiz-cream">{points.toLocaleString('fr-FR')} <span className="text-sm text-foodiz-gray not-italic font-sans">pts</span></p>
            </div>
            <div className="w-10 h-10 rounded-full bg-foodiz-gold flex items-center justify-center text-foodiz-black group-hover:scale-110 transition-transform">
              <Gift size={20} />
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-foodiz-gold/10 rounded-full blur-xl"></div>
        </div>

        {/* CATÉGORIES */}
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

        {/* CARTES IMMERSIVES */}
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
            <CityExpansionCard status="address_required" city={cityName} />
          ) : loadingRestos ? (
            <div className="text-center py-10 text-foodiz-gray text-sm animate-pulse">Recherche des meilleurs restos...</div>
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
                      <span className="w-1.5 h-1.5 rounded-full bg-foodiz-green"></span> {r.cuisine} • {r.temps}
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

      {/* BARRE DE NAVIGATION DU BAS */}
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
