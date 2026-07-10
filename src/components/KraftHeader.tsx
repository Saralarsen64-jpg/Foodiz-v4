import { Bell, ShoppingBag, User } from "lucide-react";
import GoldIcon from "./GoldIcon";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function KraftHeader() {
  const navigate = useNavigate();
  const { itemCount } = useCart();

  return (
    <header className="bg-gradient-to-b from-weello-kraft/15 to-weello-kraft/5 border-b border-weello-gold/10 px-4 py-3">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* Logo */}
        <button onClick={() => navigate("/client")} className="flex items-center">
          <img src="/images/weello-wordmark.png" alt="Weello" className="h-8 w-auto" />
        </button>

        {/* Icons */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/client/account")}>
            <GoldIcon icon={User} size={20} />
          </button>
          <button onClick={() => navigate("/client/account/notifications")}>
            <GoldIcon icon={Bell} size={20} />
          </button>
          <button onClick={() => navigate("/client/cart")} className="relative">
            <GoldIcon icon={ShoppingBag} size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-weello-gold text-weello-black text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
