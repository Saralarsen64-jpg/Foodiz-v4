import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Flame, Apple, Pizza, Coffee } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import { supabase } from "../../lib/supabase";
import { calculateClientUnitPriceCents } from "../../lib/engines/weelloEconomicEngine";
import { loadClientCatalog } from "../../lib/clientCatalog";

const CATEGORIES = [
  { label: "Restaurants", icon: Flame, path: "/client/restaurants" },
  { label: "Market", icon: Apple, path: "/client/market" },
  { label: "Burgers", icon: Pizza, path: "/client/restaurants?category=burgers" },
  { label: "Boissons", icon: Coffee, path: "/client/restaurants?category=drinks" },
];

export default function SearchPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(() => params.get("q") || "");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setRestaurants([]);
      setProducts([]);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const catalog = await loadClientCatalog();
        const normalizedQuery = query.toLocaleLowerCase("fr-FR");
        const allowedRestaurants = catalog.restaurants;
        const matchingRestaurants = allowedRestaurants.filter((restaurant) =>
          [restaurant.name, restaurant.cuisine_type, restaurant.city]
            .filter(Boolean)
            .some((value) => String(value).toLocaleLowerCase("fr-FR").includes(normalizedQuery)),
        ).slice(0, 8);
        const allowedIds = allowedRestaurants.map((restaurant) => restaurant.id);
        if (!allowedIds.length) {
          setRestaurants([]);
          setProducts([]);
          setLoading(false);
          return;
        }
        const pattern = `%${query.replace(/[%_]/g, "")}%`;
        const productResult = await supabase
          .from("products")
          .select("id,name,description,image_url,partner_price_cents,restaurant:restaurants!inner(id,name,is_active,latitude,longitude)")
          .eq("is_active", true)
          .eq("restaurant.is_active", true)
          .in("restaurant_id", allowedIds)
          .or(`name.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`)
          .limit(12);
        setRestaurants(matchingRestaurants);
        setProducts(productResult.data || []);
      } catch {
        setRestaurants([]);
        setProducts([]);
      }
      setLoading(false);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const hasQuery = search.trim().length >= 2;
  const hasResults = restaurants.length > 0 || products.length > 0;

  return (
    <div className="animate-fade-in-up">
      <h1 className="weello-title text-2xl mb-4">Recherche</h1>
      <div className="relative mb-6">
        <GoldIcon icon={Search} size={18} className="absolute left-4 top-1/2 -translate-y-1/2" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Que voulez-vous manger ?" className="w-full bg-weello-card border border-weello-gold/15 rounded-2xl py-3.5 pl-12 pr-4 text-weello-cream placeholder-weello-gray/50 text-sm outline-none focus:border-weello-gold/40 transition-all" autoFocus />
      </div>
      {!hasQuery ? (
        <>
          <h2 className="weello-title text-sm mb-3 text-weello-gold">Catégories populaires</h2>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <button key={cat.label} onClick={() => navigate(cat.path)} className="weello-card p-4 flex items-center gap-3 hover:border-weello-gold/30 transition-all">
                <div className="w-10 h-10 rounded-full bg-weello-gradient-gold flex items-center justify-center">
                  <GoldIcon icon={cat.icon} size={18} />
                </div>
                <span className="text-sm font-medium text-weello-cream">{cat.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : loading ? (
        <div className="py-14 text-center text-sm text-weello-gray animate-pulse">Recherche en cours...</div>
      ) : !hasResults ? (
        <div className="weello-card p-8 text-center text-sm text-weello-gray">Aucun restaurant ni produit ne correspond à « {search.trim()} ».</div>
      ) : (
        <div className="space-y-7">
          {restaurants.length > 0 && <section><h2 className="weello-title text-sm mb-3 text-weello-gold">Restaurants</h2><div className="space-y-3">{restaurants.map((restaurant) => <button key={restaurant.id} onClick={() => navigate(`/client/establishments/${restaurant.id}`)} className="w-full weello-card p-3 flex items-center gap-3 text-left hover:border-weello-gold/30 transition-all"><div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 shrink-0">{restaurant.cover_image && <img src={restaurant.cover_image} alt="" className="w-full h-full object-cover" />}</div><div><p className="text-sm font-semibold text-weello-cream">{restaurant.name}</p><p className="text-xs text-weello-gray mt-1">{[restaurant.cuisine_type, restaurant.city].filter(Boolean).join(" · ") || "Restaurant Weello"}</p></div></button>)}</div></section>}
          {products.length > 0 && <section><h2 className="weello-title text-sm mb-3 text-weello-gold">Plats et produits</h2><div className="space-y-3">{products.map((product) => <button key={product.id} onClick={() => navigate(`/client/establishments/${product.restaurant.id}`)} className="w-full weello-card p-3 flex items-center gap-3 text-left hover:border-weello-gold/30 transition-all"><div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 shrink-0">{product.image_url && <img src={product.image_url} alt="" className="w-full h-full object-cover" />}</div><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-weello-cream truncate">{product.name}</p><p className="text-xs text-weello-gray mt-1 truncate">{product.restaurant.name}</p></div><p className="text-sm font-semibold text-weello-gold">{(calculateClientUnitPriceCents(product.partner_price_cents) / 100).toFixed(2).replace(".", ",")} €</p></button>)}</div></section>}
        </div>
      )}
    </div>
  );
}
