import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../utils/cn";
import {
  Home,
  Search,
  ShoppingBag,
  ClipboardList,
  User,
} from "lucide-react";
import GoldIcon from "./GoldIcon";
import { useCart } from "../context/CartContext";

const NAV_ITEMS = [
  { label: "Accueil", icon: Home, path: "/client" },
  { label: "Recherche", icon: Search, path: "/client/search" },
  { label: "Panier", icon: ShoppingBag, path: "/client/cart" },
  { label: "Commandes", icon: ClipboardList, path: "/client/orders" },
  { label: "Compte", icon: User, path: "/client/account" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { itemCount } = useCart();

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-[1.6rem] border border-weello-gold/20 bg-weello-card/95 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl safe-area-pb">
      <div className="grid grid-cols-5 gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            location.pathname === item.path
            || (item.path !== "/client" && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                "rounded-2xl py-2.5 flex flex-col items-center gap-1 transition-all duration-200",
                isActive
                  ? "bg-weello-gold text-weello-black shadow-[0_8px_25px_rgba(216,168,79,0.22)]"
                  : "text-weello-gray hover:text-weello-cream"
              )}
            >
              <div className="relative">
                <GoldIcon
                  icon={item.icon}
                  size={22}
                  className={cn(
                    isActive ? "text-weello-black" : "text-weello-gray"
                  )}
                />
                {item.path === "/client/cart" && itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-weello-red px-1 text-[10px] font-black text-white ring-2 ring-weello-black">
                    {itemCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
