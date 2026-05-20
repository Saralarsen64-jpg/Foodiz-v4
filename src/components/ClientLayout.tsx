import { Outlet, useLocation } from "react-router-dom";
import KraftHeader from "./KraftHeader";
import BottomNav from "./BottomNav";
import { CartProvider } from "../context/CartContext";

export default function ClientLayout() {
  const location = useLocation();
  const isHome = location.pathname === "/client" || location.pathname === "/client/search";

  return (
    <CartProvider>
      <div className="min-h-screen bg-foodiz-black pb-20">
        {!isHome && <KraftHeader />}
        <main className={`max-w-lg mx-auto px-4 pb-6 ${isHome ? "pt-0" : "pt-4"}`}>
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </CartProvider>
  );
}
