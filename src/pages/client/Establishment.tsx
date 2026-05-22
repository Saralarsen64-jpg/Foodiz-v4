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
} from "lucide-react";
import { useCart } from "../../context/CartContext";

const DEFAULT_CATEGORIES = [
  {
    id: "cat1",
    name: "Nos Burgers Signature",
    items: [
      { id: "p1", name: "Burger Artisanal", desc: "Bœuf Black Angus, cheddar affiné, sauce maison", price: 16.90, points: 30, image: "/images/restaurant-maison-k.jpg" },
      { id: "p2", name: "Burger Truffe", desc: "Bœuf wagyu, crème de truffe noire, roquette", price: 22.50, points: 40, image: "/images/restaurant-bistrot.jpg" },
    ]
  },
  {
    id: "cat2",
    name: "Desserts Gourmands",
    items: [
      { id: "d1", name: "Tiramisu Maison", desc: "Mascarpone, café, cacao amer", price: 8.50, points: 20, image: "/images/market-bio.jpg" },
    ]
  }
];

export default function EstablishmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { itemCount, subtotal, establishmentId, addItem, replaceCart } = useCart();
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  useEffect(() => {
    // Load dynamic products added by partner
    const savedProducts = localStorage.getItem('foodiz_products_r1');
    if (savedProducts) {
      const products = JSON.parse(savedProducts);
      // Group by category (simplified for demo)
      const dynamicCategories = [
        { id: "cat_dynamic", name: "Nouveautés du Chef", items: products }
      ];
      setCategories([...DEFAULT_CATEGORIES, ...dynamicCategories]);
    }
  }, []);

  const establishmentName = id === "r1" ? "Maison K" : 
    id === "r2" ? "Le Bistrot Parisien" : 
    id === "r3" ? "Sushi Ko" : 
    id === "m1" ? "Marché Bio" : "Restaurant";

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

      {/* Header Image Banner */}
      <div className="relative h-64 -mx-4 -mt-4 overflow-hidden">
        <img 
          src="/images/auth-restaurant.jpg" 
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
              <Clock size={12} className="text-foodiz-gold" /> 11:00 - 23:00
            </span>
            <span className="flex items-center gap-1.5 bg-foodiz-black/40 backdrop-blur px-3 py-1 rounded-full border border-foodiz-gold/20">
              <MapPin size={12} className="text-foodiz-gold" /> 15 Rue de la Roquette, 75011 Paris
            </span>
            <span className="flex items-center gap-1.5 bg-foodiz-black/40 backdrop-blur px-3 py-1 rounded-full border border-foodiz-gold/20">
              <Star size={12} className="text-foodiz-gold fill-foodiz-gold" /> 4.8 (240 avis)
            </span>
          </div>
        </div>
      </div>

      {/* Menu Categories & Black Cards */}
      <div className="mt-8 space-y-10 pb-32 px-2">
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
                        <span className="text-foodiz-gold font-bold font-serif text-lg">
                          {item.price.toFixed(2).replace(".", ",")} €
                        </span>
                      </div>
                      <p className="text-xs text-foodiz-gray mt-1 line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[10px] text-foodiz-gold/60 flex items-center gap-1 uppercase tracking-wider font-bold">
                        <Star size={10} fill="currentColor" /> +{item.points} pts Foodiz
                      </span>
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
