import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronRight,
  Flame,
  Gift,
  MapPin,
  Pizza,
  Salad,
  Sandwich,
  Search,
  ShoppingCart,
  Star,
  User,
  Wine,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { loadClientCatalog } from "../../lib/clientCatalog";

const CATEGORIES = [
  { label: "Market", icon: ShoppingCart, path: "/client/market" },
  { label: "Restaurants", icon: Flame, path: "/client/restaurants" },
  { label: "Burgers", icon: Sandwich, path: "/client/restaurants?category=burgers" },
  { label: "Pizzas", icon: Pizza, path: "/client/restaurants?category=pizzas" },
  { label: "Asiatique", icon: Salad, path: "/client/restaurants?category=asian" },
  { label: "Gastronomique", icon: Wine, path: "/client/restaurants?category=gastronomic" },
];

export default function ClientHome() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [points, setPoints] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [cityName, setCityName] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: wallet }, { data: profile }, { count }] = await Promise.all([
        supabase.from("client_wallets").select("points_balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("first_name,city").eq("id", user.id).maybeSingle(),
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
      ]);
      setPoints(wallet?.points_balance || 0);
      setFirstName(profile?.first_name || "");
      setCityName(profile?.city || "");
      setUnreadCount(count || 0);

      try {
        const catalog = await loadClientCatalog();
        setRestaurants((catalog.restaurants || []).slice(0, 4));
      } catch {
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/client/search?q=${encodeURIComponent(query)}` : "/client/search");
  };

  return (
    <div className="animate-fade-in-up pb-8">
      <header className="relative -mx-4 overflow-hidden border-b border-weello-gold/20 bg-black px-5 pb-7 pt-7 shadow-[0_18px_50px_rgba(0,0,0,.5)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(216,168,79,.09),transparent_44%)]" />
        <div className="relative flex items-center justify-between gap-4">
          <img src="/images/weello-wordmark.png" alt="Weello" className="h-14 w-36 object-contain object-left" />
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate("/client/notifications")} aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-weello-gold/25 bg-weello-card text-weello-gold">
              <Bell size={18} />
              {unreadCount > 0 && <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-weello-red ring-2 ring-black" />}
            </button>
            <button type="button" onClick={() => navigate("/client/account")} aria-label="Mon compte" className="flex h-10 w-10 items-center justify-center rounded-full border border-weello-gold/25 bg-weello-card text-weello-gold">
              <User size={18} />
            </button>
          </div>
        </div>
        <button type="button" onClick={() => navigate("/client/account/addresses")} className="relative mt-5 flex items-center gap-2 text-sm text-weello-gray">
          <MapPin size={15} className="text-weello-gold" />
          {cityName ? `Livraison à ${cityName}` : "Choisir une adresse de livraison"}
        </button>
        <h1 className="relative mt-2 font-serif text-2xl italic text-weello-cream">
          {firstName ? `Bonjour ${firstName}` : "Bon appétit !"}
        </h1>
      </header>

      <div className="space-y-8 px-1 pt-5">
        <form onSubmit={submitSearch} className="flex items-center rounded-2xl border border-weello-gold/20 bg-weello-card px-4 shadow-lg shadow-black/30">
          <Search size={19} className="shrink-0 text-weello-gold" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Restaurant, plat, commerce..." className="w-full bg-transparent px-3 py-4 text-sm text-weello-cream outline-none placeholder:text-weello-gray/60" />
        </form>

        <section className="grid grid-cols-2 gap-3">
          {[
            { title: "Restaurants", image: "/images/auth-restaurant.jpg", path: "/client/restaurants" },
            { title: "Market", image: "/images/market-bio.jpg", path: "/client/market" },
          ].map((card) => (
            <button key={card.title} type="button" onClick={() => navigate(card.path)} className="group relative aspect-[4/5] overflow-hidden rounded-3xl border border-weello-gold/20 text-left shadow-xl shadow-black/40">
              <img src={card.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-4">
                <span className="block font-serif text-xl italic text-weello-cream">{card.title}</span>
                <span className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-weello-gold">Découvrir <ChevronRight size={11} /></span>
              </span>
            </button>
          ))}
        </section>

        <section>
          <h2 className="weello-title mb-4 text-lg">Catégories</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {CATEGORIES.map((category) => (
              <button key={category.label} type="button" onClick={() => navigate(category.path)} className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-weello-gold/15 bg-weello-card px-2 py-3 text-weello-gold">
                <category.icon size={20} />
                <span className="w-full truncate text-center text-[9px] text-weello-gray">{category.label}</span>
              </button>
            ))}
          </div>
        </section>

        <button type="button" onClick={() => navigate("/client/advantages")} className="flex w-full items-center gap-4 rounded-2xl border border-weello-gold/25 bg-[linear-gradient(135deg,rgba(216,168,79,.12),#111_52%)] p-5 text-left">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-weello-gold text-black"><Gift size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-lg italic text-weello-cream">Weello Club</span>
            <span className="mt-1 block text-xs text-weello-gray">Vos points et vos avantages</span>
          </span>
          <span className="text-right"><strong className="block text-xl text-weello-gold">{points.toLocaleString("fr-FR")}</strong><span className="text-[10px] text-weello-gray">points</span></span>
        </button>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="weello-title text-lg">Autour de vous</h2>
            <button type="button" onClick={() => navigate("/client/restaurants")} className="flex items-center gap-1 text-xs text-weello-gold">Voir tout <ChevronRight size={12} /></button>
          </div>
          {loading ? (
            <div className="py-8 text-center text-sm text-weello-gray">Chargement…</div>
          ) : restaurants.length === 0 ? (
            <div className="rounded-2xl border border-weello-gold/15 bg-weello-card p-6 text-center">
              <p className="text-sm text-weello-cream">Aucune adresse disponible pour le moment.</p>
              <button type="button" onClick={() => navigate("/client/account/addresses")} className="mt-3 text-xs text-weello-gold">Vérifier mon adresse</button>
            </div>
          ) : (
            <div className="space-y-3">
              {restaurants.map((restaurant) => (
                <button key={restaurant.id} type="button" onClick={() => navigate(`/client/establishments/${restaurant.id}`)} className="flex w-full items-center gap-3 rounded-2xl border border-weello-gold/15 bg-weello-card p-3 text-left">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-black">
                    {restaurant.cover_image ? <img src={restaurant.cover_image} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-weello-gold"><Star size={20} /></span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-serif text-base italic text-weello-cream">{restaurant.name}</h3>
                    <p className="mt-1 truncate text-[11px] text-weello-gray">{restaurant.cuisine_type || "Restaurant"}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-weello-gold"><Star size={10} fill="currentColor" /> Découvrir</span>
                  </div>
                  <ChevronRight size={16} className="text-weello-gold/60" />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
