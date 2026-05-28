import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, MapPin, Clock, ShoppingBag } from "lucide-react";

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/orders")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6"><ChevronLeft size={18} /> Mes commandes</button>
      <h1 className="foodiz-title text-2xl mb-2">Commande #{id?.slice(0, 6)}</h1>
      <p className="text-foodiz-gray text-xs mb-6">Maison K · Hier à 19:30</p>
      
      <div className="foodiz-card p-5 mb-6">
        <h2 className="foodiz-title text-sm mb-4">Récapitulatif</h2>
        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-foodiz-cream">2x Burger Artisanal</span>
            <span className="text-foodiz-cream">33.80 €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foodiz-cream">1x Limonade Maison</span>
            <span className="text-foodiz-cream">5.00 €</span>
          </div>
        </div>
        <div className="border-t border-foodiz-gold/10 pt-3 flex justify-between">
          <span className="text-foodiz-cream font-semibold">Total payé</span>
          <span className="text-foodiz-gold font-bold text-lg">38.80 €</span>
        </div>
      </div>

      <div className="foodiz-card p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <MapPin size={18} className="text-foodiz-gold" />
          <h2 className="foodiz-title text-sm">Livré à</h2>
        </div>
        <p className="text-sm text-foodiz-cream">24 rue Oberkampf, Paris 11e</p>
      </div>

      <button onClick={() => navigate(`/client/orders/${id}/review`)} className="w-full foodiz-btn py-4 text-base">Noter cette commande</button>
    </div>
  );
}
