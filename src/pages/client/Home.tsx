import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Search, Gift, Star, ChevronRight, Flame, Pizza, Wine, ShoppingCart, Sandwich, Salad, Navigation, User, ShoppingBag, Bell, MapPinned, Route, ShieldCheck } from "lucide-react";
import { WeelloActionCard, WeelloHero, WeelloMetricCard, WeelloPill } from "../../components/WeelloWebUI";
import { loadClientCatalog } from "../../lib/clientCatalog";

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
  const [requestingArea, setRequestingArea] = useState(false);
  const [areaRequested, setAreaRequested] = useState(false);
  const [areaRequestError, setAreaRequestError] = useState("");

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

        // 3. Localisation
        const { data: profile } = await supabase.from('profiles').select('first_name, latitude, longitude, city').eq('id', user.id).single();
        setFirstName(profile?.first_name || "");
        if (profile?.latitude && profile?.longitude) {
          setLocationEnabled(true);
          setCityName(profile.city || "mon adresse");
          fetchRestaurants();
        }
      }
    };
    fetchInitialData();
  }, []);

  const fetchRestaurants = async () => {
    setLoadingRestos(true);
    try {
      const { restaurants: filteredRestos } = await loadClientCatalog();
      const { data: reviews } = await supabase.from("reviews").select("restaurant_rating, orders!inner(restaurant_id)").in("orders.restaurant_id", filteredRestos.map((restaurant: any) => restaurant.id));
      setRestaurants(filteredRestos.map((r: any) => {
        const values = (reviews || []).filter((review: any) => review.orders?.restaurant_id === r.id).map((review: any) => review.restaurant_rating).filter(Boolean);
        return { id: r.id, name: r.name, note: values.length ? (values.reduce((sum: number, value: number) => sum + value, 0) / values.length).toFixed(1) : "Nouveau", temps: "Délai à confirmer", image: r.cover_image, emoji: "🍽️", cuisine: r.cuisine_type || "Restaurant" };
      }));
    } catch { setRestaurants([]); }
    setLoadingRestos(false);
  };

  const enableLocation = () => navigate("/client/account/addresses");

  const requestServiceArea = async () => {
    setRequestingArea(true);
    setAreaRequestError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch("/api/request-service-area", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "La demande n’a pas pu être enregistrée.");
      setAreaRequested(true);
    } catch (requestError) {
      console.error("Service area request failed", requestError);
      setAreaRequestError(
        requestError instanceof Error
          ? requestError.message
          : "La demande n’a pas pu être enregistrée.",
      );
    } finally {
      setRequestingArea(false);
    }
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/client/search?q=${encodeURIComponent(query)}` : "/client/search");
  };

  return (
    <div className="min-h-screen bg-weello-black pb-24 animate-fade-in-up relative overflow-x-hidden">
      <div className="pointer-events-none fixed top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-weello-gold/20 to-transparent z-50" />
      <div className="pointer-events-none fixed top-0 bottom-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-weello-gold/20 to-transparent z-50" />

      {/* HEADER ÉLÉGANT ET AÉRÉ */}
      <header className="px-6 pt-12 pb-8 bg-gradient-to-b from-weello-card to-weello-black border-b border-weello-gold/10">
        <div className="max-w-lg mx-auto flex justify-between items-center mb-8">
          <img src="/images/weello-wordmark.png" alt="Weello" className="h-10 w-auto" />
          <div className="flex gap-3">
            <button onClick={() => navigate("/client/notifications")} className="relative p-2.5 rounded-full bg-weello-black border border-weello-gold/20 text-weello-gold hover:bg-weello-gold/10 transition-colors">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-weello-red rounded-full border-2 border-weello-black"></span>
              )}
            </button>
            <button onClick={() => navigate("/client/account")} className="p-2.5 rounded-full bg-weello-black border border-weello-gold/20 text-weello-gold hover:bg-weello-gold/10 transition-colors">
              <User size={18} />
            </button>
          </div>
        </div>
        
        <div className="max-w-lg mx-auto">
          <button onClick={enableLocation} className="flex items-center gap-2 text-weello-gray text-sm mb-2 hover:text-weello-gold transition-colors group">
            <div className={`p-1 rounded-full ${locationEnabled ? 'bg-weello-green/20 text-weello-green' : 'bg-weello-gold/10 text-weello-gold'}`}>
              <Navigation size={12} />
            </div>
            <span className="group-hover:underline decoration-dotted underline-offset-4">
              {locationEnabled ? `Livraison à ${cityName}` : "Définir ma localisation"}
            </span>
          </button>
          <h1 className="weello-title text-3xl text-weello-cream mt-2">
            {firstName ? `Bonjour ${firstName}` : "Bon appétit !"}
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-10">
        
        {/* BARRE DE RECHERCHE FLOTTANTE */}
        <div className="relative -mt-12 z-10">
          <form onSubmit={submitSearch} className="weello-card p-2 flex items-center bg-weello-card border border-weello-gold/20 shadow-xl shadow-black/50 rounded-2xl">
            <Search className="ml-3 text-weello-gray" size={20} />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Un plat, un restaurant..." 
              className="flex-1 bg-transparent text-weello-cream px-4 py-2 outline-none text-sm placeholder-weello-gray/50"
            />
          </form>
        </div>

        <WeelloHero
          eyebrow="Expérience Weello"
          title="Votre ville, vos envies, votre livraison suivie."
          description="Weello réunit les bonnes adresses locales, un suivi live rassurant et un programme fidélité gourmand — sans perdre l’esprit premium noir, doré et kraft."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <WeelloMetricCard
              label="Points"
              value={points.toLocaleString("fr-FR")}
              helper="Weello Club"
              icon={Gift}
            />
            <WeelloMetricCard
              label="Autour"
              value={restaurants.length}
              helper="adresses actives"
              icon={ShoppingBag}
              tone={restaurants.length ? "green" : "muted"}
            />
            <WeelloMetricCard
              label="Adresse"
              value={locationEnabled ? "OK" : "À définir"}
              helper={cityName || "livraison précise"}
              icon={MapPinned}
              tone={locationEnabled ? "green" : "muted"}
            />
          </div>
          <div className="mt-4 grid gap-3">
            <WeelloActionCard
              title="Commander maintenant"
              description="Explorez les restaurants et commerces disponibles autour de votre adresse."
              icon={ShoppingBag}
              badge="Local"
              onClick={() => navigate("/client/restaurants")}
            />
            <WeelloActionCard
              title="Suivi live de commande"
              description="Dès qu’un livreur prend le relais, retrouvez son avancée et les étapes clés."
              icon={Route}
              badge="Live"
              onClick={() => navigate("/client/orders")}
            />
            <WeelloActionCard
              title="Avantages Weello Club"
              description="Consultez vos points, récompenses et privilèges disponibles."
              icon={ShieldCheck}
              onClick={() => navigate("/client/advantages")}
            />
          </div>
        </WeelloHero>

        {/* CARTE POINTS FIDÉLITÉ */}
        <div onClick={() => navigate("/client/advantages")} className="weello-card p-5 bg-gradient-to-r from-weello-gold/10 to-weello-card border border-weello-gold/30 relative overflow-hidden cursor-pointer group rounded-2xl">
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <div className="mb-2"><WeelloPill>Weello Club</WeelloPill></div>
              <p className="text-2xl font-serif italic text-weello-cream">{points.toLocaleString('fr-FR')} <span className="text-sm text-weello-gray not-italic font-sans">pts</span></p>
            </div>
            <div className="w-10 h-10 rounded-full bg-weello-gold flex items-center justify-center text-weello-black group-hover:scale-110 transition-transform">
              <Gift size={20} />
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-weello-gold/10 rounded-full blur-xl"></div>
        </div>

        {/* CATÉGORIES */}
        <div>
          <h2 className="weello-title text-lg mb-4">Catégories</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
            {CATEGORIES.map((cat) => (
              <button key={cat.label} onClick={() => navigate(cat.path)} className="flex flex-col items-center gap-3 min-w-[70px] group">
                <div className="w-16 h-16 rounded-2xl bg-weello-card border border-weello-gold/10 flex items-center justify-center text-weello-gold group-hover:border-weello-gold/40 group-hover:bg-weello-gold/5 transition-all">
                  <cat.icon size={24} />
                </div>
                <span className="text-[10px] text-weello-gray group-hover:text-weello-cream transition-colors">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CARTES IMMERSIVES */}
        <div className="pt-4">
          <h2 className="weello-title text-lg mb-6">Explorer</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: "Restaurants", image: "/images/auth-restaurant.jpg", path: "/client/restaurants", color: "from-orange-900/40" },
              { title: "Market", image: "/images/market-bio.jpg", path: "/client/market", color: "from-green-900/40" }
            ].map((card) => (
              <button
                key={card.title}
                onClick={() => navigate(card.path)}
                className="group relative overflow-hidden rounded-3xl border border-weello-gold/20 hover:border-weello-gold/50 transition-all duration-500 shadow-xl shadow-black/30 aspect-[3/4]"
              >
                <img src={card.image} alt={card.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" />
                <div className={`absolute inset-0 bg-gradient-to-t ${card.color} via-weello-black/60 to-transparent`} />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-left">
                  <h3 className="text-2xl font-serif italic text-weello-cream mb-1">{card.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-weello-gold text-[10px] tracking-widest uppercase font-bold">Voir tout</span>
                    <ChevronRight size={12} className="text-weello-gold group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RESTAURANTS À PROXIMITÉ */}
        <div className="pb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="weello-title text-lg">Autour de vous</h2>
            <button onClick={() => navigate("/client/restaurants")} className="text-xs text-weello-gold hover:underline">Voir tout</button>
          </div>
          
          {!locationEnabled ? (
            <div className="weello-card p-8 text-center border-weello-gold/10 bg-weello-gold/5">
              <p className="text-weello-gold text-sm font-medium mb-1">Localisation requise</p>
              <p className="text-weello-gray text-xs">Activez le GPS en haut de page pour voir les restos.</p>
            </div>
          ) : loadingRestos ? (
            <div className="text-center py-10 text-weello-gray text-sm animate-pulse">Recherche des meilleurs restos...</div>
          ) : restaurants.length === 0 ? (
            <div className="weello-card overflow-hidden border-weello-gold/25 p-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-weello-gold/30 bg-weello-gold/10 text-weello-gold">
                <MapPinned size={22} />
              </span>
              <p className="weello-title mt-4 text-xl text-weello-cream">
                Weello arrive bientôt à {cityName || "votre ville"}
              </p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-weello-gray">
                Nous préparons une sélection de bonnes adresses près de chez vous.
                Demandez à être informé dès l’ouverture des premiers établissements.
              </p>
              <button
                type="button"
                disabled={requestingArea || areaRequested}
                onClick={() => void requestServiceArea()}
                className="weello-btn mt-6 w-full py-3 disabled:opacity-60"
              >
                {areaRequested
                  ? "Votre demande est enregistrée ✓"
                  : requestingArea
                    ? "Enregistrement…"
                    : "Me prévenir de l’arrivée de Weello"}
              </button>
              {areaRequestError ? (
                <p className="mt-3 text-xs text-weello-red">{areaRequestError}</p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {restaurants.map((r) => (
                <button key={r.id} onClick={() => navigate(`/client/establishments/${r.id}`)} className="w-full weello-card p-3 flex gap-4 cursor-pointer hover:border-weello-gold/30 transition-all group bg-[#0A0A0A]">
                  <div className="w-20 h-20 rounded-2xl bg-weello-black border border-weello-gold/10 overflow-hidden shrink-0">
                    {r.image ? (
                      <img src={r.image} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">{r.emoji}</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center text-left">
                    <h3 className="text-weello-cream font-bold text-base font-serif italic group-hover:text-weello-gold transition-colors">{r.name}</h3>
                    <p className="text-[10px] text-weello-gray mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-weello-green"></span> {r.cuisine} • {r.temps}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <Star size={10} className="text-weello-gold fill-weello-gold" />
                      <span className="text-[10px] text-weello-cream font-bold">{r.note}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* BARRE DE NAVIGATION DU BAS */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-lg bg-weello-card/95 backdrop-blur-md border border-weello-gold/20 rounded-2xl px-6 py-4 flex justify-between items-center z-50 shadow-2xl shadow-black/50">
          <button onClick={() => navigate("/client")} className="flex flex-col items-center gap-1 text-weello-gold">
            <Search size={20} />
            <span className="text-[9px] font-medium">Explorer</span>
          </button>
          <button onClick={() => navigate("/client/market")} className="flex flex-col items-center gap-1 text-weello-gray hover:text-weello-gold transition-colors">
            <ShoppingBag size={20} />
            <span className="text-[9px] font-medium">Market</span>
          </button>
          <button onClick={() => navigate("/client/orders")} className="flex flex-col items-center gap-1 text-weello-gray hover:text-weello-gold transition-colors">
            <Gift size={20} />
            <span className="text-[9px] font-medium">Commandes</span>
          </button>
          <button onClick={() => navigate("/client/account")} className="flex flex-col items-center gap-1 text-weello-gray hover:text-weello-gold transition-colors">
            <User size={20} />
            <span className="text-[9px] font-medium">Compte</span>
          </button>
      </div>
    </div>
  );
}
