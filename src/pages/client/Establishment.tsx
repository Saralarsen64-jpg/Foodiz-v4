import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Star,
  Clock,
  MapPin,
  ChevronLeft,
  Plus,
  ShoppingBag,
  BadgeCheck,
  Heart,
} from "lucide-react";
import { useCart } from "../../context/CartContext";
import { supabase } from "../../lib/supabase";
import { calculateClientUnitPriceCents } from "../../lib/engines/weelloEconomicEngine";
import {
  effectivePartnerPriceCents,
  productOfferIsActive,
} from "../../lib/productOffers";

export default function EstablishmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { itemCount, subtotal, establishmentId, addItem, replaceCart } = useCart();
  const [categories, setCategories] = useState<any[]>([]);
  const [establishment, setEstablishment] = useState<any>(null);
  const [rating, setRating] = useState<{ average: number; count: number }>({ average: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    const fetchEstablishment = async () => {
      if (!id) return;
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: restaurant }, { data: products }, { data: reviews }, favoriteResult] = await Promise.all([
        supabase.from("restaurants").select("*").eq("id", id).eq("is_active", true).not("latitude", "is", null).not("longitude", "is", null).single(),
        supabase.from("products").select("*").eq("restaurant_id", id).eq("is_active", true).order("category"),
        supabase.from("reviews").select("restaurant_rating, orders!inner(restaurant_id)").eq("orders.restaurant_id", id),
        user
          ? supabase.from("client_favorites").select("id").eq("user_id", user.id).eq("restaurant_id", id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setFavorite(Boolean(favoriteResult.data));

      setEstablishment(restaurant);
      const grouped = (products || []).reduce<Record<string, any[]>>((acc, product) => {
        const category = product.category || "Menu";
        const offerActive = productOfferIsActive(product);
        acc[category] ||= [];
        acc[category].push({
          id: product.id,
          name: product.name,
          desc: product.description || "",
          price: calculateClientUnitPriceCents(
            effectivePartnerPriceCents(product),
          ) / 100,
          originalPrice: offerActive
            ? calculateClientUnitPriceCents(product.partner_price_cents) / 100
            : null,
          promotionLabel: offerActive
            ? product.promotion_label || "Offre partenaire"
            : null,
          points: 0,
          image: product.image_url || restaurant?.cover_image || "/images/auth-restaurant.jpg",
        });
        return acc;
      }, {});
      setCategories(Object.entries(grouped).map(([name, items]) => ({ id: name, name, items })));

      const values = (reviews || []).map((review: any) => review.restaurant_rating).filter(Boolean);
      setRating({
        average: values.length ? values.reduce((sum: number, value: number) => sum + value, 0) / values.length : 0,
        count: values.length,
      });
      setLoading(false);
    };
    fetchEstablishment();
  }, [id]);

  const establishmentName = establishment?.name || "Restaurant";

  const addToCart = (item: { id: string; name: string; price: number; points: number; image: string }) => {
    const establishment = { id: id || "unknown", name: establishmentName };

    if (establishmentId && establishmentId !== establishment.id) {
      const confirmed = window.confirm(
        "Votre panier contient déjà des produits d'une autre enseigne. Voulez-vous le vider pour commencer un nouveau panier ?"
      );
      if (!confirmed) return;
      replaceCart(item, establishment);
      return;
    }

    addItem(item, establishment);
  };

  const toggleFavorite = async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (favorite) {
      const { error } = await supabase.from("client_favorites").delete().eq("user_id", user.id).eq("restaurant_id", id);
      if (!error) setFavorite(false);
      return;
    }
    const { error } = await supabase.from("client_favorites").insert({ user_id: user.id, restaurant_id: id });
    if (!error) setFavorite(true);
  };

  return (
    <div className="animate-fade-in-up relative min-h-screen border-x-2 border-foodiz-gold/20">
      {/* Golden Side Borders */}
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />

      {/* Back button (Floating) */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-40 w-10 h-10 rounded-full bg-foodiz-black/60 backdrop-blur-md border border-foodiz-gold/30 flex items-center justify-center text-foodiz-gold hover:bg-foodiz-black/80 transition-all"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => void toggleFavorite()}
        className="absolute top-4 right-4 z-40 w-10 h-10 rounded-full bg-foodiz-black/60 backdrop-blur-md border border-foodiz-gold/30 flex items-center justify-center text-foodiz-gold hover:bg-foodiz-black/80 transition-all"
        aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      >
        <Heart size={19} className={favorite ? "fill-foodiz-gold" : ""} />
      </button>

      {/* Header Image Banner */}
      <div className="relative h-64 -mx-4 -mt-4 overflow-hidden">
        <img 
          src={establishment?.cover_image || "/images/auth-restaurant.jpg"}
          alt={establishmentName} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foodiz-black via-foodiz-black/60 to-transparent" />
        
        {/* Establishment Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="foodiz-title text-3xl text-white italic" style={{ fontFamily: "'Playfair Display', serif" }}>
              {establishmentName}
            </h1>
            <BadgeCheck size={24} className="text-foodiz-gold" />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-foodiz-cream/90 text-xs font-medium">
            <span className="flex items-center gap-1.5 bg-foodiz-black/40 backdrop-blur px-3 py-1 rounded-full border border-foodiz-gold/20">
              <Clock size={12} className="text-foodiz-gold" /> Ouvert aux commandes
            </span>
            <span className="flex items-center gap-1.5 bg-foodiz-black/40 backdrop-blur px-3 py-1 rounded-full border border-foodiz-gold/20">
              <MapPin size={12} className="text-foodiz-gold" /> {[establishment?.address, establishment?.postal_code, establishment?.city].filter(Boolean).join(", ") || "Adresse non renseignée"}
            </span>
            <span className="flex items-center gap-1.5 bg-foodiz-black/40 backdrop-blur px-3 py-1 rounded-full border border-foodiz-gold/20">
              <Star size={12} className="text-foodiz-gold fill-foodiz-gold" /> {rating.count ? rating.average.toFixed(1) : "Nouveau"} ({rating.count} avis)
            </span>
          </div>
        </div>
      </div>

      {/* Menu Categories & Black Cards */}
      <div className="mt-8 space-y-10 pb-32 px-2">
        {loading && <div className="text-center py-10 text-foodiz-gray animate-pulse">Chargement du menu...</div>}
        {!loading && categories.length === 0 && <div className="foodiz-card p-6 text-center text-foodiz-gray">Aucun produit disponible actuellement.</div>}
        {categories.map((category: any) => (
          <div key={category.id}>
            <h2 className="foodiz-title text-xl text-foodiz-gold mb-4 px-2 border-l-4 border-foodiz-gold pl-3">
              {category.name}
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {category.items.map((item: any) => (
                <div 
                  key={item.id} 
                  className="foodiz-card bg-foodiz-card border border-foodiz-gold/10 rounded-xl overflow-hidden flex flex-col sm:flex-row group hover:border-foodiz-gold/30 transition-all"
                >
                  {/* Realistic Photo */}
                  <div className="w-full sm:w-32 h-40 sm:h-32 overflow-hidden relative">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foodiz-black/50 to-transparent sm:bg-gradient-to-r" />
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-serif italic text-foodiz-cream font-bold">
                          {item.name}
                        </h3>
                        <span className="text-right">
                          {item.originalPrice && (
                            <span className="mr-2 text-xs text-foodiz-gray line-through">
                              {item.originalPrice.toFixed(2).replace(".", ",")} €
                            </span>
                          )}
                          <span className="text-foodiz-gold font-bold font-serif text-lg">
                            {item.price.toFixed(2).replace(".", ",")} €
                          </span>
                        </span>
                      </div>
                      <p className="text-xs text-foodiz-gray mt-1 line-clamp-2">
                        {item.desc}
                      </p>
                      {item.promotionLabel && (
                        <span className="mt-2 inline-flex rounded-full border border-foodiz-gold/30 bg-foodiz-gold/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-foodiz-gold">
                          {item.promotionLabel}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <span />
                      <button
                        onClick={() => addToCart(item)}
                        className="w-9 h-9 rounded-full bg-foodiz-gold text-foodiz-black flex items-center justify-center hover:bg-foodiz-gold-light transition-all shadow-lg shadow-foodiz-gold/20 active:scale-95"
                      >
                        <Plus size={18} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Cart Bar */}
      {itemCount > 0 && establishmentId === (id || "unknown") && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4 max-w-lg mx-auto">
          <button
            onClick={() => navigate("/client/cart")}
            className="w-full foodiz-btn flex items-center justify-between px-6 py-4 rounded-2xl shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag size={20} className="text-foodiz-black" />
                <span className="absolute -top-2 -right-2 bg-foodiz-black text-foodiz-gold text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {itemCount}
                </span>
              </div>
              <span className="text-foodiz-black text-sm font-semibold">Voir le panier</span>
            </div>
            <span className="text-foodiz-black font-bold">
              {subtotal.toFixed(2).replace(".", ",")} €
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
