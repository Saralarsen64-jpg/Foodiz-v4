import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Minus,
  Plus,
  Trash2,
  ChevronLeft,
  Gift,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import { useCart } from "../../context/CartContext";
import {
  buildSavedAdvantage,
  CART_SELECTED_ADVANTAGE_KEY,
  computeAdvantageDiscount,
  DEFAULT_ADVANTAGES,
} from "../../utils/cartPricing";

export default function CartPage() {
  const navigate = useNavigate();
  const { items, subtotal, totalPoints, establishmentName, updateQuantity, clearCart } = useCart();
  const savedAdvantage = buildSavedAdvantage();
  const availableAdvantages = savedAdvantage
    ? [savedAdvantage, ...DEFAULT_ADVANTAGES.filter((adv) => adv.name !== savedAdvantage.name)]
    : DEFAULT_ADVANTAGES;

  const [selectedAdvantage, setSelectedAdvantage] = useState<string | null>(
    () => localStorage.getItem(CART_SELECTED_ADVANTAGE_KEY) ?? savedAdvantage?.id ?? null
  );
  const [showAdvantages, setShowAdvantages] = useState(false);
  const userPointsBalance = 1240;

  useEffect(() => {
    if (selectedAdvantage) {
      localStorage.setItem(CART_SELECTED_ADVANTAGE_KEY, selectedAdvantage);
    } else {
      localStorage.removeItem(CART_SELECTED_ADVANTAGE_KEY);
    }
  }, [selectedAdvantage]);

  const serviceFee = items.length === 0 ? 0 : items.length === 1 ? 1.99 : items.length === 2 ? 1.49 : items.length === 3 ? 1.19 : 0.99;
  const deliveryFee = items.length === 0 ? 0 : 2.5;
  const activeAdvantage = availableAdvantages.find((a) => a.id === selectedAdvantage) || null;
  const discount = computeAdvantageDiscount(activeAdvantage, subtotal, deliveryFee, serviceFee, items);
  const total = Math.max(0, subtotal + serviceFee + deliveryFee - discount);
  const remainingPoints = Math.max(0, userPointsBalance - (activeAdvantage?.points ?? 0));

  if (items.length === 0) {
    return (
      <div className="animate-fade-in-up pb-24">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-foodiz-gold text-sm mb-6"
        >
          <ChevronLeft size={18} />
          Retour
        </button>

        <div className="foodiz-card p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-foodiz-gradient-gold flex items-center justify-center mb-4">
            <ShoppingBag size={24} className="text-foodiz-black" />
          </div>
          <h1 className="foodiz-title text-2xl mb-2">Votre panier est vide</h1>
          <p className="text-foodiz-gray text-sm mb-6">
            Ajoutez des produits d’une même enseigne pour commencer votre commande.
          </p>
          <button onClick={() => navigate("/client/restaurants")} className="foodiz-btn px-6 py-3">
            Découvrir les établissements
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up pb-32">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-foodiz-gold text-sm mb-6"
      >
        <ChevronLeft size={18} />
        Retour au restaurant
      </button>

      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="foodiz-title text-2xl mb-2">Votre panier</h1>
          <p className="text-foodiz-gray text-xs">{establishmentName}</p>
        </div>
        <button
          onClick={clearCart}
          className="text-foodiz-gold text-xs font-medium border border-foodiz-gold/20 rounded-full px-3 py-1.5 hover:border-foodiz-gold/40 transition-all"
        >
          Vider le panier
        </button>
      </div>

      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <div key={item.id} className="foodiz-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-foodiz-gradient-gold flex items-center justify-center text-xl shrink-0">
              {item.image}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foodiz-cream">{item.name}</h3>
              <p className="text-foodiz-gold text-sm font-semibold mt-0.5">
                {item.price.toFixed(2).replace(".", ",")} €
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, -1)}
                className="w-7 h-7 rounded-full border border-foodiz-gold/30 flex items-center justify-center text-foodiz-gold hover:bg-foodiz-gold/10 transition-all"
              >
                {item.quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
              </button>
              <span className="text-foodiz-cream font-medium w-5 text-center text-sm">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, 1)}
                className="w-7 h-7 rounded-full bg-foodiz-gold text-foodiz-black flex items-center justify-center hover:bg-foodiz-gold-light transition-all"
              >
                <Plus size={12} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="foodiz-card p-4 mb-6 bg-foodiz-gradient-gold border-foodiz-gold/20 flex items-center gap-3">
        <GoldIcon icon={Sparkles} size={18} />
        <div className="flex-1">
          <p className="text-xs text-foodiz-cream">Points Foodiz gagnés sur cette commande</p>
        </div>
        <span className="text-foodiz-gold font-bold font-serif text-lg">+{totalPoints}</span>
      </div>

      <div className="mb-6">
        <button
          onClick={() => setShowAdvantages(!showAdvantages)}
          className="foodiz-card p-4 w-full flex items-center gap-3 text-left"
        >
          <GoldIcon icon={Gift} size={18} />
          <div className="flex-1">
            <p className="text-sm font-medium text-foodiz-cream">Choisissez un avantage</p>
            {selectedAdvantage && (
              <p className="text-[11px] text-foodiz-gold mt-0.5">
                {availableAdvantages.find((a) => a.id === selectedAdvantage)?.name}
              </p>
            )}
          </div>
          <span className="text-foodiz-gray text-xs">{remainingPoints} pts</span>
        </button>

        {showAdvantages && (
          <div className="mt-2 space-y-2">
            {availableAdvantages.map((adv) => (
              <button
                key={adv.id}
                onClick={() => {
                  setSelectedAdvantage(selectedAdvantage === adv.id ? null : adv.id);
                  setShowAdvantages(false);
                }}
                className={`w-full foodiz-card p-3 flex items-center justify-between text-left ${
                  selectedAdvantage === adv.id ? "border-foodiz-gold/50" : ""
                }`}
              >
                <div className="min-w-0">
                  <span className="text-xs text-foodiz-cream block">{adv.name}</span>
                  {adv.source === "saved" && (
                    <span className="text-[10px] text-foodiz-gold/80">Avantage verrouillé</span>
                  )}
                </div>
                <span className="text-[10px] text-foodiz-gold shrink-0">{adv.points} pts</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Premium Receipt / Ticket de Caisse de Luxe */}
      <div 
        className="rounded-sm p-6 mb-8 relative overflow-hidden shadow-2xl"
        style={{ 
          backgroundColor: '#FDFBF7', 
          backgroundImage: 'linear-gradient(#E8E4D9 1px, transparent 1px)', 
          backgroundSize: '100% 24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}
      >
        {/* Dashed Borders */}
        <div className="absolute inset-x-0 top-0 h-px border-t-2 border-dashed border-[#D2B48C]" />
        <div className="absolute inset-x-0 bottom-0 h-px border-b-2 border-dashed border-[#D2B48C]" />
        
        <h3 className="font-serif text-xl text-[#1a1a1a] text-center italic mb-6 tracking-widest uppercase">
          Votre Addition
        </h3>
        
        <div className="space-y-3 font-mono text-sm text-[#5C4033]">
          <div className="flex justify-between">
            <span>Sous-total</span>
            <span className="text-[#1a1a1a] font-bold">{subtotal.toFixed(2).replace(".", ",")} €</span>
          </div>
          <div className="flex justify-between">
            <span>Frais de livraison</span>
            <span className="text-[#1a1a1a] font-bold">{deliveryFee.toFixed(2).replace(".", ",")} €</span>
          </div>
          <div className="flex justify-between">
            <span>Frais de service</span>
            <span className="text-[#1a1a1a] font-bold">{serviceFee.toFixed(2).replace(".", ",")} €</span>
          </div>
          
          {discount > 0 && (
            <div className="flex justify-between text-[#8B5A2B]">
              <span>Avantage Foodiz</span>
              <span className="font-bold">-{discount.toFixed(2).replace(".", ",")} €</span>
            </div>
          )}
          
          {activeAdvantage?.discountType === "dessert_cheapest" && (
            <div className="flex justify-between text-[10px] text-[#8B5A2B]/70 italic font-sans">
              <span>Dessert offert (le moins cher)</span>
              <span>max 8€</span>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t-2 border-[#1a1a1a] flex justify-between items-end">
          <span className="font-serif text-lg text-[#1a1a1a] italic font-bold">TOTAL À PAYER</span>
          <span className="font-serif text-3xl text-[#8B5A2B] italic font-bold">
            {total.toFixed(2).replace(".", ",")} €
          </span>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-[9px] text-[#8B5A2B]/60 uppercase tracking-[0.2em] font-bold">
            Merci de votre confiance · Foodiz
          </p>
        </div>
      </div>

      <button
        onClick={() => navigate("/client/checkout")}
        className="w-full foodiz-btn py-4 text-base flex items-center justify-center gap-3"
      >
        <ShoppingBag size={20} />
        Passer la commande
      </button>
    </div>
  );
}
