import { Outlet } from "react-router-dom";
import KraftHeader from "./KraftHeader";
import BottomNav from "./BottomNav";
import { CartProvider } from "../context/CartContext";

export default function ClientLayout() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-foodiz-black pb-20">
        <KraftHeader />
        <main className="max-w-lg mx-auto px-4 pt-4 pb-6">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </CartProvider>
  );
}
