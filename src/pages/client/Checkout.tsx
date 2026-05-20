import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  CreditCard,
  MapPin,
  Clock3,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useCart } from "../../context/CartContext";
import {
  buildSavedAdvantage,
  CART_SELECTED_ADVANTAGE_KEY,
  computeAdvantageDiscount,
  DEFAULT_ADVANTAGES,
} from "../../utils/cartPricing";

const ADDRESSES = [
  { id: "addr1", label: "Domicile", value: "24 rue Oberkampf, Paris 11e" },
  { id: "addr2", label: "Bureau", value: "12 avenue de la République, Paris 11e" },
];

const PAYMENTS = [
  { id: "pm1", label: "Visa •••• 4242" },
  { id: "pm2", label: "Apple Pay" },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, totalPoints, establishmentName, clearCart } = useCart();
  const [selectedAddress, setSelectedAddress] = useState(ADDRESSES[0].id);
  const [selectedPayment, setSelectedPayment] = useState(PAYMENTS[0].id);
  const [notes, setNotes] = useState("");
  const [placed, setPlaced] = useState(false);

  const savedAdvantage = buildSavedAdvantage();
  const availableAdvantages = savedAdvantage
    ? [savedAdvantage, ...DEFAULT_ADVANTAGES.filter((adv) => adv.name !== savedAdvantage.name)]
    : DEFAULT_ADVANTAGES;
  const [selectedAdvantageId, setSelectedAdvantageId] = useState<string | null>(() => localStorage.getItem(CART_SELECTED_ADVANTAGE_KEY));

  useEffect(() => {
    const syncSelectedAdvantage = () => {
      setSelectedAdvantageId(localStorage.getItem(CART_SELECTED_ADVANTAGE_KEY));
    };

    syncSelectedAdvantage();
    window.addEventListener("focus", syncSelectedAdvantage);
    window.addEventListener("storage", syncSelectedAdvantage);

    return () => {
      window.removeEventListener("focus", syncSelectedAdvantage);
      window.removeEventListener("storage", syncSelectedAdvantage);
    };
  }, []);

  const activeAdvantage = availableAdvantages.find((a) => a.id === selectedAdvantageId) || null;
  const userPointsBalance = 1240;

  const serviceFee = items.length === 0 ? 0 : items.length === 1 ? 1.99 : items.length === 2 ? 1.49 : items.length === 3 ? 1.19 : 0.99;
  const deliveryFee = items.length === 0 ? 0 : 2.5;
  const discount = computeAdvantageDiscount(activeAdvantage, subtotal, deliveryFee, serviceFee, items);
  const total = Math.max(0, subtotal + serviceFee + deliveryFee - discount);
  const remainingPoints = Math.max(0, userPointsBalance - (activeAdvantage?.points ?? 0));

  const selectedAddressValue = useMemo(
    () => ADDRESSES.find((addr) => addr.id === selectedAddress)?.value ?? ADDRESSES[0].value,
    [selectedAddress]
  );

  const handlePlaceOrder = () => {
    setPlaced(true);
    const orderId = `ORD-${Date.now()}`;
    const newOrder = {
      id: orderId,
      restaurant: establishmentName || "Restaurant",
      date: new Date().toLocaleDateString("fr-FR"),
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      status: "in_progress",
      total,
      items: items.length,
      loyaltyPoints: totalPoints,
      image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=400",
      restaurantCoords: [48.8566, 2.3522],
      clientCoords: [48.8606, 2.3376],
      courier: { name: "Karim", phone: "+33 6 12 34 56 78" },
      deliveryCode: Math.floor(100000 + Math.random() * 900000).toString(),
    };

    const existing = JSON.parse(localStorage.getItem("foodiz_client_orders_v1") || "[]");
    localStorage.setItem("foodiz_client_orders_v1", JSON.stringify([newOrder, ...existing]));

    window.setTimeout(() => {
      clearCart();
      localStorage.removeItem(CART_SELECTED_ADVANTAGE_KEY);
      navigate(`/client/orders/${orderId}`);
    }, 1200);
  };

  if (items.length === 0) {
    return (
      <div className="animate-fade-in-up pb-24">
        <button onClick={() => navigate("/client/cart")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
          <ChevronLeft size={18} /> Retour au panier
        </button>
        <div className="foodiz-card p-8 text-center">
          <h1 className="foodiz-title text-2xl mb-2">Aucune commande à finaliser</h1>
          <p className="text-foodiz-gray text-sm mb-6">Votre panier est vide pour le moment.</p>
          <button onClick={() => navigate("/client/restaurants")} className="foodiz-btn px-6 py-3">
            Retourner aux établissements
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up pb-32">
      <button onClick={() => navigate("/client/cart")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
        <ChevronLeft size={18} /> Retour au panier
      </button>

      <div className="mb-6">
        <h1 className="foodiz-title text-2xl mb-2">Finaliser la commande</h1>
        <p className="text-foodiz-gray text-xs">{establishmentName}</p>
      </div>

      <div className="space-y-5">
        <div className="foodiz-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-foodiz-gold" />
            <h2 className="foodiz-title text-sm">Adresse de livraison</h2>
          </div>
          <div className="space-y-2">
            {ADDRESSES.map((address) => (
              <button
                key={address.id}
                onClick={() => setSelectedAddress(address.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  selectedAddress === address.id
                    ? "border-foodiz-gold/45 bg-foodiz-gold/5"
                    : "border-foodiz-gold/10 bg-white/[0.02]"
                }`}
              >
                <div className="text-foodiz-cream text-sm font-medium">{address.label}</div>
                <div className="text-foodiz-gray text-xs mt-1">{address.value}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="foodiz-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={16} className="text-foodiz-gold" />
            <h2 className="foodiz-title text-sm">Moyen de paiement</h2>
          </div>
          <div className="space-y-2">
            {PAYMENTS.map((payment) => (
              <button
                key={payment.id}
                onClick={() => setSelectedPayment(payment.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  selectedPayment === payment.id
                    ? "border-foodiz-gold/45 bg-foodiz-gold/5"
                    : "border-foodiz-gold/10 bg-white/[0.02]"
                }`}
              >
                <div className="text-foodiz-cream text-sm font-medium">{payment.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="foodiz-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock3 size={16} className="text-foodiz-gold" />
            <h2 className="foodiz-title text-sm">Instructions</h2>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Code d'entrée, étage, détails utiles pour la livraison..."
            className="w-full min-h-[96px] rounded-2xl bg-white/[0.02] border border-foodiz-gold/10 p-4 text-sm text-foodiz-cream placeholder-foodiz-gray/40 outline-none focus:border-foodiz-gold/30 resize-none"
          />
          <p className="text-foodiz-gray text-[11px] mt-2">Livraison à : {selectedAddressValue}</p>
        </div>

        <div className="foodiz-card p-5">
          <h2 className="foodiz-title text-sm mb-4">Récapitulatif du paiement</h2>
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="text-foodiz-cream">
                  {item.quantity}× {item.name}
                </div>
                <div className="text-foodiz-cream">{(item.price * item.quantity).toFixed(2).replace(".", ",")} €</div>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t border-foodiz-gold/10 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-foodiz-gray">Sous-total</span>
              <span className="text-foodiz-cream">{subtotal.toFixed(2).replace(".", ",")} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foodiz-gray">Frais de livraison</span>
              <span className="text-foodiz-cream">{deliveryFee.toFixed(2).replace(".", ",")} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foodiz-gray">Frais de service</span>
              <span className="text-foodiz-cream">{serviceFee.toFixed(2).replace(".", ",")} €</span>
            </div>
            {activeAdvantage && discount > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-foodiz-green">Avantage appliqué</span>
                  <span className="text-foodiz-green">-{discount.toFixed(2).replace(".", ",")} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foodiz-gray">Total après avantage</span>
                  <span className="text-foodiz-gold">{total.toFixed(2).replace(".", ",")} €</span>
                </div>
              </>
            )}
            {activeAdvantage?.discountType === "dessert_cheapest" && (
              <div className="flex justify-between text-[11px] text-foodiz-gray">
                <span>Dessert offert</span>
                <span>Moins cher du panier · max 8€</span>
              </div>
            )}
            {activeAdvantage && discount === 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-foodiz-gray">Avantage sélectionné</span>
                <span className="text-foodiz-gold">{activeAdvantage.name}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-foodiz-gray">Points utilisés</span>
              <span className="text-foodiz-gold">-{activeAdvantage?.points ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foodiz-gray">Points restants</span>
              <span className="text-foodiz-gold">{remainingPoints}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foodiz-gray">Points gagnés</span>
              <span className="text-foodiz-gold">+{totalPoints}</span>
            </div>
            <div className="border-t border-foodiz-gold/10 pt-3 flex justify-between items-center">
              <span className="text-foodiz-cream font-semibold">Total à payer</span>
              <span className="text-foodiz-gold font-bold text-xl">{total.toFixed(2).replace(".", ",")} €</span>
            </div>
          </div>
        </div>

        <div className="foodiz-card p-4 bg-foodiz-gradient-gold border-foodiz-gold/20 flex items-center gap-3">
          <ShieldCheck size={18} className="text-foodiz-gold" />
          <p className="text-xs text-foodiz-cream">Paiement sécurisé Foodiz · chiffrement et validation de commande inclus</p>
        </div>
      </div>

      <button
        onClick={handlePlaceOrder}
        disabled={placed}
        className="w-full foodiz-btn py-4 text-base flex items-center justify-center gap-3 mt-6"
      >
        {placed ? <CheckCircle2 size={20} /> : <CreditCard size={20} />}
        {placed ? "Commande confirmée" : `Payer ${total.toFixed(2).replace(".", ",")} €`}
      </button>
    </div>
  );
}
