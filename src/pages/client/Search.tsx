import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Flame, Apple, Pizza, Coffee } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import { supabase } from "../../lib/supabase";

const CATEGORIES = [
  { label: "Restaurants", icon: Flame, path: "/client/restaurants" },
  { label: "Market", icon: Apple, path: "/client/market" },
  { label: "Burgers", icon: Pizza, path: "/client/restaurants?category=burgers" },
  { label: "Boissons", icon: Coffee, path: "/client/restaurants?category=drinks" },
];

export default function SearchPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
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
      const pattern = `%${query.replace(/[%_]/g, "")}%`;
      const [restaurantResult, productResult] = await Promise.all([
        supabase
          .from("restaurants")
          .select("id,name,cuisine_type,city,cover_image")
          .eq("is_active", true)
          .or(`name.ilike.${pattern},cuisine_type.ilike.${pattern},city.ilike.${pattern}`)
          .limit(8),
        supabase
          .from("products")
          .select("id,name,description,image_url,partner_price_cents,restaurant:restaurants!inner(id,name,is_active)")
          .eq("is_active", true)
          .eq("restaurant.is_active", true)
          .or(`name.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`)
          .limit(12),
      ]);
      setRestaurants(restaurantResult.data || []);
      setProducts(productResult.data || []);
      setLoading(false);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const hasQuery = search.trim().length >= 2;
  const hasResults = restaurants.length > 0 || products.length > 0;

  return (
    <div className="animate-fade-in-up">
      <h1 className="foodiz-title text-2xl mb-4">Recherche</h1>
      <div className="relative mb-6">
        <GoldIcon icon={Search} size={18} className="absolute left-4 top-1/2 -translate-y-1/2" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Que voulez-vous manger ?" className="w-full bg-foodiz-card border border-foodiz-gold/15 rounded-2xl py-3.5 pl-12 pr-4 text-foodiz-cream placeholder-foodiz-gray/50 text-sm outline-none focus:border-foodiz-gold/40 transition-all" autoFocus />
      </div>
      {!hasQuery ? (
        <>
          <h2 className="foodiz-title text-sm mb-3 text-foodiz-gold">Catégories populaires</h2>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <button key={cat.label} onClick={() => navigate(cat.path)} className="foodiz-card p-4 flex items-center gap-3 hover:border-foodiz-gold/30 transition-all">
                <div className="w-10 h-10 rounded-full bg-foodiz-gradient-gold flex items-center justify-center">
                  <GoldIcon icon={cat.icon} size={18} />
                </div>
                <span className="text-sm font-medium text-foodiz-cream">{cat.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : loading ? (
        <div className="py-14 text-center text-sm text-foodiz-gray animate-pulse">Recherche en cours...</div>
      ) : !hasResults ? (
        <div className="foodiz-card p-8 text-center text-sm text-foodiz-gray">Aucun restaurant ni produit ne correspond à « {search.trim()} ».</div>
      ) : (
        <div className="space-y-7">
          {restaurants.length > 0 && <section><h2 className="foodiz-title text-sm mb-3 text-foodiz-gold">Restaurants</h2><div className="space-y-3">{restaurants.map((restaurant) => <button key={restaurant.id} onClick={() => navigate(`/client/establishments/${restaurant.id}`)} className="w-full foodiz-card p-3 flex items-center gap-3 text-left hover:border-foodiz-gold/30 transition-all"><div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 shrink-0">{restaurant.cover_image && <img src={restaurant.cover_image} alt="" className="w-full h-full object-cover" />}</div><div><p className="text-sm font-semibold text-foodiz-cream">{restaurant.name}</p><p className="text-xs text-foodiz-gray mt-1">{[restaurant.cuisine_type, restaurant.city].filter(Boolean).join(" · ") || "Restaurant Foodiz"}</p></div></button>)}</div></section>}
          {products.length > 0 && <section><h2 className="foodiz-title text-sm mb-3 text-foodiz-gold">Plats et produits</h2><div className="space-y-3">{products.map((product) => <button key={product.id} onClick={() => navigate(`/client/establishments/${product.restaurant.id}`)} className="w-full foodiz-card p-3 flex items-center gap-3 text-left hover:border-foodiz-gold/30 transition-all"><div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 shrink-0">{product.image_url && <img src={product.image_url} alt="" className="w-full h-full object-cover" />}</div><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foodiz-cream truncate">{product.name}</p><p className="text-xs text-foodiz-gray mt-1 truncate">{product.restaurant.name}</p></div><p className="text-sm font-semibold text-foodiz-gold">{(product.partner_price_cents / 100).toFixed(2).replace(".", ",")} €</p></button>)}</div></section>}
        </div>
      )}
    </div>
  );
}
