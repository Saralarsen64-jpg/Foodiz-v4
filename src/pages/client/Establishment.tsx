import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  MapPin,
  ChevronLeft,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { useCart } from "../../context/CartContext";
import { loadPartnerProfile, type PartnerProduct, type PartnerProfile } from "../../utils/partnerStore";

type TabKey = string;

const STATIC_FALLBACK: Record<string, { profile: PartnerProfile }> = {
  r2: {
    profile: {
      establishmentId: "r2",
      name: "Le Bistrot Parisien",
      hours: "Ouvert · 12:00 — 22:30",
      location: "Paris 11e · 1,2 km",
      coverImage: "/images/restaurant-bistrot.jpg",
      categories: ["Plats", "Desserts", "Boissons"],
      products: [
        { id: "r2p1", name: "Entrecôte grillée", desc: "Pommes grenailles, jus réduit", partnerPrice: 18.9, category: "Plats", active: true, points: 30, image: "/images/restaurant-bistrot.jpg" },
        { id: "r2p2", name: "Millefeuille vanille", desc: "Crème légère, feuilletage croustillant", partnerPrice: 7.2, category: "Desserts", active: true, points: 20, image: "/images/auth-restaurant.jpg" },
      ],
    },
  },
  r3: {
    profile: {
      establishmentId: "r3",
      name: "Sushi Ko",
      hours: "Ouvert · 11:45 — 23:00",
      location: "Paris 11e · 1,8 km",
      coverImage: "/images/restaurant-sushi.jpg",
      categories: ["Plats", "Desserts", "Boissons"],
      products: [
        { id: "r3p1", name: "Plateau sashimi", desc: "Sélection premium du chef", partnerPrice: 19.5, category: "Plats", active: true, points: 30, image: "/images/restaurant-sushi.jpg" },
        { id: "r3p2", name: "Mochi glacé", desc: "Deux pièces, vanille et matcha", partnerPrice: 6.2, category: "Desserts", active: true, points: 20, image: "/images/auth-restaurant.jpg" },
      ],
    },
  },
  m1: {
    profile: {
      establishmentId: "m1",
      name: "Marché Bio",
      hours: "Ouvert · 08:00 — 21:00",
      location: "Paris 11e · 900 m",
      coverImage: "/images/market-bio.jpg",
      categories: ["Fruits", "Épicerie", "Boissons"],
      products: [
        { id: "m1p1", name: "Panier fruits frais", desc: "Sélection de saison", partnerPrice: 12.0, category: "Fruits", active: true, points: 30, image: "/images/market-bio.jpg" },
        { id: "m1p2", name: "Granola maison", desc: "Amandes, miel, graines toastées", partnerPrice: 7.0, category: "Épicerie", active: true, points: 20, image: "/images/market-epicerie.jpg" },
      ],
    },
  },
};

function getCustomerPrice(partnerPrice: number) {
  if (partnerPrice <= 3.5) return partnerPrice + 1.2;
  if (partnerPrice <= 8.49) return partnerPrice + 2.5;
  return partnerPrice + 3.5;
}

export default function EstablishmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { itemCount, subtotal, establishmentId, addItem, replaceCart } = useCart();
  const [dynamicProfile, setDynamicProfile] = useState<PartnerProfile | undefined>(() => {
    if (id === "r1") return loadPartnerProfile();
    return STATIC_FALLBACK[id || ""]?.profile;
  });
  const [activeTab, setActiveTab] = useState<TabKey>("");

  useEffect(() => {
    const refresh = () => {
      if (id === "r1") {
        setDynamicProfile(loadPartnerProfile());
      } else {
        setDynamicProfile(STATIC_FALLBACK[id || ""]?.profile);
      }
    };

    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [id]);

  const categories = dynamicProfile?.categories || ["Plats"];

  useEffect(() => {
    if (!activeTab || !categories.includes(activeTab)) {
      setActiveTab(categories[0] || "Plats");
    }
  }, [categories, activeTab]);

  const allProducts = (dynamicProfile?.products || []).filter((p) => p.active !== false);
  const items = allProducts.filter((item) => item.category === activeTab);

  const establishmentName = dynamicProfile?.name || "Restaurant";
  const establishmentHours = dynamicProfile?.hours || "Ouvert · 11:30 — 23:00";
  const establishmentLocation = dynamicProfile?.location || "Paris 11e · 1,2 km";
  const coverImage = dynamicProfile?.coverImage || "/images/restaurant-bistrot.jpg";

  const addToCart = (item: PartnerProduct) => {
    const establishment = { id: id || "unknown", name: establishmentName };

    if (establishmentId && establishmentId !== establishment.id) {
      const confirmed = window.confirm(
        "Votre panier contient déjà des produits d'une autre enseigne. Voulez-vous le vider pour commencer un nouveau panier ?"
      );
      if (!confirmed) return;
      replaceCart(item as any, establishment);
      return;
    }

    addItem(item as any, establishment);
  };

  return (
    <div className="animate-fade-in-up pb-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-foodiz-gold text-sm mb-4">
        <ChevronLeft size={18} /> Retour
      </button>

      <div className="relative -mx-4 -mt-4 overflow-hidden rounded-b-[2rem] border-b border-foodiz-gold/15 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
        <img src={coverImage} alt={establishmentName} className="w-full h-56 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foodiz-black via-foodiz-black/35 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 backdrop-blur-[1px]">
          <h1 className="foodiz-title text-2xl text-white mb-3">{establishmentName}</h1>
          <div className="flex flex-col gap-2 text-foodiz-gray text-xs">
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-foodiz-gold" />
              <span>{establishmentHours}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-foodiz-gold" />
              <span>{establishmentLocation}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-4 py-2.5 text-xs font-medium rounded-full transition-all ${
                isActive
                  ? "text-foodiz-black bg-foodiz-gold shadow-[0_10px_20px_rgba(216,168,79,0.2)]"
                  : "text-foodiz-gray border border-foodiz-gold/15 bg-foodiz-card hover:text-foodiz-cream"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="foodiz-card rounded-[1.2rem] border border-foodiz-gold/12 overflow-hidden bg-[#0D0D0D]">
            <div className="flex gap-0">
              <div className="w-32 shrink-0 bg-black/20">
                <img src={item.image || coverImage} alt={item.name} className="w-full h-full object-cover min-h-[118px]" />
              </div>
              <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                <div>
                  <h3 className="text-sm font-medium text-foodiz-cream">{item.name}</h3>
                  <p className="text-xs text-foodiz-gray/70 mt-1 leading-relaxed line-clamp-3">{item.desc}</p>
                </div>
                <div className="flex items-end justify-between gap-3 mt-4">
                  <div>
                    <p className="text-foodiz-gold font-semibold text-base">{getCustomerPrice(item.partnerPrice).toFixed(2).replace(".", ",")} €</p>
                    <p className="text-[10px] text-foodiz-gold/55 mt-0.5">+{item.points} pts Foodiz</p>
                  </div>
                  <button onClick={() => addToCart(item)} className="w-10 h-10 rounded-full bg-foodiz-gold text-foodiz-black flex items-center justify-center hover:bg-foodiz-gold-light transition-colors shadow-[0_10px_20px_rgba(216,168,79,0.18)] shrink-0">
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="foodiz-card p-6 text-center text-foodiz-gray text-sm">Aucun produit disponible dans cette catégorie pour le moment.</div>
        )}
      </div>

      {itemCount > 0 && establishmentId === (id || "unknown") && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate("/client/cart")} className="w-full flex items-center justify-between px-5 py-4 rounded-[1.4rem] shadow-[0_22px_50px_rgba(0,0,0,0.45),0_0_24px_rgba(216,168,79,0.15)] border border-foodiz-gold/20 bg-[linear-gradient(135deg,#E0B45C,#D8A84F,#C9A45C)]">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag size={20} className="text-foodiz-black" />
                <span className="absolute -top-2 -right-2 bg-foodiz-black text-foodiz-gold text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {itemCount}
                </span>
              </div>
              <span className="text-foodiz-black text-sm font-semibold">Voir le panier</span>
            </div>
            <span className="text-foodiz-black font-bold text-base">{subtotal.toFixed(2).replace(".", ",")} €</span>
          </button>
        </div>
      )}
    </div>
  );
}
