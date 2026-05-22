import { Bell, ShoppingBag, User, MapPin } from "lucide-react";
import GoldIcon from "./GoldIcon";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function KraftHeader() {
  const navigate = useNavigate();
  const { itemCount } = useCart();

  return (
    <div className="relative w-full overflow-hidden">
      {/* Envelope Image - Exact same as Auth page */}
      <div className="relative w-full overflow-hidden pb-10">
        <img
          src="https://i.imgur.com/gtCArFr.png"
          alt="Foodiz"
          className="block w-full h-auto align-top"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent via-foodiz-black/35 to-foodiz-black" />
        
        {/* Geolocation Button (Bottom Left of Envelope) */}
        <button className="absolute bottom-6 left-4 z-20 flex items-center gap-2 bg-foodiz-gold/90 backdrop-blur-md text-foodiz-black px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_15px_rgba(216,168,79,0.4)] hover:bg-foodiz-gold transition-all active:scale-95">
          <MapPin size={12} strokeWidth={2.5} />
          <span>Paris 11e • Livré en 25 min</span>
        </button>

        {/* Floating Icons on top of the envelope (Top Right) */}
        <div className="absolute top-4 right-4 max-w-lg mx-auto right-0 flex items-center gap-3 z-20">
          <button onClick={() => navigate("/client/account")} className="w-10 h-10 rounded-full bg-foodiz-black/40 backdrop-blur-md border border-foodiz-gold/30 flex items-center justify-center hover:bg-foodiz-black/60 transition-all">
            <GoldIcon icon={User} size={20} />
          </button>
          <button onClick={() => navigate("/client/account/notifications")} className="w-10 h-10 rounded-full bg-foodiz-black/40 backdrop-blur-md border border-foodiz-gold/30 flex items-center justify-center hover:bg-foodiz-black/60 transition-all relative">
            <GoldIcon icon={Bell} size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-foodiz-gold rounded-full" />
          </button>
          <button onClick={() => navigate("/client/cart")} className="relative w-10 h-10 rounded-full bg-foodiz-black/40 backdrop-blur-md border border-foodiz-gold/30 flex items-center justify-center hover:bg-foodiz-black/60 transition-all">
            <GoldIcon icon={ShoppingBag} size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-foodiz-gold text-foodiz-black text-[9px] font-bold rounded-full h-4 min-w-4 px-0.5 flex items-center justify-center border border-foodiz-black">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
