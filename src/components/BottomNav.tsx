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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-foodiz-card border-t border-foodiz-gold/20 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-3 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-200",
                isActive
                  ? "text-foodiz-gold"
                  : "text-foodiz-gray hover:text-foodiz-cream"
              )}
            >
              <div className="relative">
                <GoldIcon
                  icon={item.icon}
                  size={22}
                  className={cn(
                    isActive ? "text-foodiz-gold" : "text-foodiz-gray"
                  )}
                />
                {item.path === "/client/cart" && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-foodiz-gold text-foodiz-black text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
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
