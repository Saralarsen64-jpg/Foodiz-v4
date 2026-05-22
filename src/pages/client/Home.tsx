import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Gift,
  Star,
  Clock,
  Truck,
  ChevronRight,
  RotateCcw,
  Flame,
  Beef,
  Pizza,
  Cookie,
  Wine,
  Salad,
  ShoppingCart,
  Hamburger,
} from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

// ─── Data ───────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: "Market", icon: ShoppingCart, path: "/client/market" },
  { label: "Restaurants", icon: Flame, path: "/client/restaurants" },
  { label: "Halal", icon: Beef, path: "/client/restaurants?category=halal" },
  { label: "Burgers", icon: Hamburger, path: "/client/restaurants?category=burgers" },
  { label: "Pizzas", icon: Pizza, path: "/client/restaurants?category=pizzas" },
  { label: "Asiatique", icon: Salad, path: "/client/restaurants?category=asian" },
  { label: "Gastronomique", icon: Wine, path: "/client/restaurants?category=gastronomic" },
  { label: "Gourmandises", icon: Cookie, path: "/client/restaurants?category=gourmandises" },
];

const RESTAURANTS = [
  {
    id: "r1",
    name: "Maison K",
    note: 4.9,
    temps: "20-30 min",
    frais: 2.50,
    image: "/images/restaurant-maison-k.jpg",
    emoji: "🍔",
  },
  {
    id: "r2",
    name: "Le Bistrot Parisien",
    note: 4.8,
    temps: "25-35 min",
    frais: 2.00,
    image: "/images/restaurant-bistrot.jpg",
    emoji: "🥖",
  },
  {
    id: "r3",
    name: "Sushi Ko",
    note: 4.7,
    temps: "20-30 min",
    frais: 3.00,
    image: "/images/restaurant-sushi.jpg",
    emoji: "🍣",
  },
  {
    id: "r4",
    name: "Bella Napoli",
    note: 4.6,
    temps: "25-40 min",
    frais: 2.50,
    image: "/images/restaurant-pizza.jpg",
    emoji: "🍕",
  },
];

const MARKETS = [
  {
    id: "m1",
    name: "Marché Bio",
    note: 4.8,
    temps: "20-30 min",
    image: "/images/market-bio.jpg",
  },
  {
    id: "m2",
    name: "Épicerie Fine",
    note: 4.7,
    temps: "25-35 min",
    image: "/images/market-epicerie.jpg",
  },
  {
    id: "m3",
    name: "Primeur du Coin",
    note: 4.5,
    temps: "15-25 min",
    image: "/images/market-bio.jpg",
  },
];

const RECENT_ORDERS = [
  { id: "o1", name: "Maison K", date: "Hier", status: "Livrée" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function ClientHome() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  return (
    <div className="relative min-h-screen animate-fade-in-up border-x-2 border-foodiz-gold/20">
      {/* Golden Side Borders for Premium Relief */}
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent" />
      
      <div className="space-y-6 px-2">
      {/* Location */}
      <div className="flex items-center gap-2 text-foodiz-cream/80">
        <GoldIcon icon={MapPin} size={16} />
        <span className="text-sm font-medium">Paris 11e — Livré en 20-35 min</span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <GoldIcon
          icon={Search}
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un restaurant, un plat..."
          className="w-full bg-foodiz-card border border-foodiz-gold/15 rounded-2xl py-3.5 pl-12 pr-4 text-foodiz-cream placeholder-foodiz-gray/50 text-sm outline-none focus:border-foodiz-gold/40 transition-all"
        />
      </div>

      {/* Big Immersive Cards — Restaurants & Market (style auth, compact) */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            title: "Restaurants",
            image: "/images/auth-restaurant.jpg",
            path: "/client/restaurants",
          },
          {
            title: "Market",
            image: "/images/market-bio.jpg",
            path: "/client/market",
          },
        ].map((card) => (
          <button
            key={card.title}
            onClick={() => navigate(card.path)}
            className="group relative overflow-hidden rounded-2xl border border-foodiz-gold/20 hover:border-foodiz-gold/50 transition-all duration-500 shadow-xl shadow-black/30 aspect-[4/5]"
          >
            <img
              src={card.image}
              alt={card.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            {/* Premium gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-foodiz-black via-foodiz-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-foodiz-black/30 via-transparent to-foodiz-gold/5" />

            {/* Gold accent line at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foodiz-gold/70 to-transparent" />

            {/* Title */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3
                className="text-xl font-semibold italic text-foodiz-cream"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {card.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-foodiz-gold text-[10px] tracking-widest uppercase font-medium">
                  Découvrir
                </span>
                <ChevronRight size={11} className="text-foodiz-gold" />
              </div>
            </div>

            {/* Top right gold corner */}
            <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-foodiz-black/40 backdrop-blur-sm border border-foodiz-gold/40 flex items-center justify-center group-hover:bg-foodiz-gold group-hover:border-foodiz-gold transition-all">
              <ChevronRight size={12} className="text-foodiz-gold group-hover:text-foodiz-black transition-colors" />
            </div>
          </button>
        ))}
      </div>

      {/* Categories */}
      <div>
        <h2 className="foodiz-title text-lg mb-4">Catégories</h2>
        <div className="grid grid-cols-4 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => navigate(cat.path)}
              className="flex flex-col items-center gap-2 p-3 foodiz-card hover:border-foodiz-gold/30 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-foodiz-gradient-gold flex items-center justify-center">
                <GoldIcon icon={cat.icon} size={18} />
              </div>
              <span className="text-[10px] text-foodiz-cream/80 font-medium text-center leading-tight">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Foodiz Club Banner */}
      <button
        onClick={() => navigate("/client/advantages")}
        className="foodiz-card p-5 bg-gradient-to-r from-foodiz-gold/10 to-foodiz-card border-foodiz-gold/20 w-full text-left"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <GoldIcon icon={Gift} size={18} />
              <span className="foodiz-title text-base">Foodiz Club</span>
            </div>
            <p className="text-foodiz-gray text-xs mt-1">
              Cumulez des points à chaque commande et débloquez des avantages exclusifs.
            </p>
            <span className="mt-3 text-foodiz-gold text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              Voir mes avantages <ChevronRight size={12} />
            </span>
          </div>
          <div className="text-right">
            <div className="text-foodiz-gold text-2xl font-bold font-serif">1 240</div>
            <div className="text-foodiz-gray text-[10px]">points</div>
          </div>
        </div>
      </button>

      {/* Restaurants Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="foodiz-title text-lg">Restaurants</h2>
          <button
            onClick={() => navigate("/client/restaurants")}
            className="text-foodiz-gold text-xs font-semibold flex items-center gap-1"
          >
            Voir tout <ChevronRight size={12} />
          </button>
        </div>
        <div className="space-y-3">
          {RESTAURANTS.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/client/establishments/${r.id}`)}
              className="w-full foodiz-card p-2 pr-4 flex items-center gap-3 text-left hover:border-foodiz-gold/30 transition-all"
            >
              {/* Image */}
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-foodiz-card">
                <img
                  src={r.image}
                  alt={r.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).parentElement!.innerHTML =
                      `<span style="font-size:28px">${r.emoji}</span>`;
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="foodiz-title text-sm">{r.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-foodiz-gray text-xs flex-wrap">
                  <span className="flex items-center gap-1">
                    <GoldIcon icon={Star} size={11} /> {r.note}
                  </span>
                  <span className="flex items-center gap-1">
                    <GoldIcon icon={Clock} size={11} /> {r.temps}
                  </span>
                  <span className="flex items-center gap-1">
                    <GoldIcon icon={Truck} size={11} /> {r.frais.toFixed(2).replace(".", ",")} €
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-foodiz-gold/50 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Market Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="foodiz-title text-lg">Market</h2>
          <button
            onClick={() => navigate("/client/market")}
            className="text-foodiz-gold text-xs font-semibold flex items-center gap-1"
          >
            Voir tout <ChevronRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {MARKETS.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/client/establishments/${m.id}`)}
              className="foodiz-card p-3 text-left hover:border-foodiz-gold/30 transition-all"
            >
              <div className="w-full h-20 rounded-xl overflow-hidden mb-3 bg-foodiz-card">
                <img
                  src={m.image}
                  alt={m.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).parentElement!.innerHTML =
                      `<span style="font-size:28px">🛒</span>`;
                  }}
                />
              </div>
              <h3 className="foodiz-title text-xs">{m.name}</h3>
              <div className="flex items-center gap-2 mt-0.5 text-foodiz-gray text-[10px]">
                <span className="flex items-center gap-0.5">
                  <Star size={9} className="text-foodiz-gold" /> {m.note}
                </span>
                <span>• {m.temps}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      {RECENT_ORDERS.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="foodiz-title text-lg">Dernières commandes</h2>
            <button
              onClick={() => navigate("/client/orders")}
              className="text-foodiz-gold text-xs font-semibold flex items-center gap-1"
            >
              Voir tout <ChevronRight size={12} />
            </button>
          </div>
          {RECENT_ORDERS.map((o) => (
            <button
              key={o.id}
              onClick={() => navigate(`/client/orders/${o.id}`)}
              className="w-full foodiz-card p-4 flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-foodiz-gradient-gold flex-shrink-0 flex items-center justify-center">
                <GoldIcon icon={RotateCcw} size={18} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foodiz-cream">{o.name}</h3>
                <p className="text-foodiz-gray text-xs">{o.date} · {o.status}</p>
              </div>
              <span className="foodiz-btn-outline !py-1.5 !px-3 !text-[10px]">
                Recommander
              </span>
            </button>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
