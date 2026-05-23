import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CreditCard, MapPin, Gift, CheckCircle } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useOrders } from "../../context/OrderContext";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, establishmentId, establishmentName, clearCart } = useCart();
  const { createOrder } = useOrders();
  
  const [usePoints, setUsePoints] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'review' | 'success'>('review');

  // Mock constants
  const deliveryFee = 2.50;
  const serviceFee = 0.99;
  const discount = 0; // Could be calculated from advantages
  const totalBeforePoints = subtotal + deliveryFee + serviceFee - discount;
  
  // Mock user points
  const userPoints = 1250;
  const pointsValue = 12.50; // 100 pts = 1€
  const finalTotal = usePoints ? Math.max(0, totalBeforePoints - pointsValue) : totalBeforePoints;

  const handlePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      if (establishmentId && establishmentName) {
        createOrder(
          establishmentId,
          establishmentName,
          items,
          finalTotal,
          "24 rue Oberkampf, 75011 Paris", // Mock address
          "Alexandre Martin" // Mock user
        );
        if (usePoints) {
          localStorage.setItem('foodiz_client_points', (userPoints - 1250).toString());
        }
        clearCart();
        setStep('success');
      }
      setIsProcessing(false);
    }, 2000);
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center p-6 text-center animate-fade-in-up">
        <div className="w-24 h-24 rounded-full bg-foodiz-green/10 flex items-center justify-center mb-6 border border-foodiz-green/30">
          <CheckCircle size={48} className="text-foodiz-green" />
        </div>
        <h1 className="foodiz-title text-3xl text-foodiz-cream mb-2">Commande Confirmée !</h1>
        <p className="text-foodiz-gray mb-8">Le restaurant prépare votre commande. Vous serez notifié dès qu'un livreur sera en route.</p>
        <button onClick={() => navigate("/client/orders")} className="foodiz-btn w-full max-w-sm py-4">Suivre ma commande</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up border-x-2 border-foodiz-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Paiement</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Address */}
        <div className="foodiz-card p-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-foodiz-gold/10 flex items-center justify-center shrink-0">
            <MapPin size={18} className="text-foodiz-gold" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foodiz-cream">Livraison à domicile</h3>
            <p className="text-xs text-foodiz-gray mt-1">24 rue Oberkampf, 75011 Paris</p>
            <button className="text-[10px] text-foodiz-gold mt-2 underline">Changer d'adresse</button>
          </div>
        </div>

        {/* Points Loyalty */}
        <div className={`foodiz-card p-4 flex items-center justify-between border ${usePoints ? 'border-foodiz-gold bg-foodiz-gold/5' : 'border-foodiz-gold/10'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-foodiz-gold/10 flex items-center justify-center">
              <Gift size={18} className="text-foodiz-gold" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foodiz-cream">Utiliser mes points Foodiz</h3>
              <p className="text-xs text-foodiz-gray">Solde: {userPoints} pts (-{pointsValue.toFixed(2)} €)</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-foodiz-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-foodiz-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-foodiz-gold"></div>
          </label>
        </div>

        {/* Payment Method */}
        <div className="foodiz-card p-4 flex items-center gap-4 border-foodiz-gold/30">
          <div className="w-12 h-8 bg-foodiz-cream rounded flex items-center justify-center">
            <CreditCard size={16} className="text-foodiz-black" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foodiz-cream">Visa se terminant par 4242</h3>
            <p className="text-xs text-foodiz-gray mt-1">Expire le 12/25</p>
          </div>
          <span className="text-[10px] text-foodiz-gold border border-foodiz-gold/30 px-2 py-1 rounded">Par défaut</span>
        </div>

        {/* Total Recap */}
        <div className="foodiz-card p-6 bg-[#FDFBF7] text-[#1a1a1a]">
          <h3 className="font-serif text-xl text-center italic mb-6 tracking-widest uppercase">Votre Addition</h3>
          <div className="space-y-3 font-mono text-sm text-[#5C4033] mb-6">
            <div className="flex justify-between">
              <span>Sous-total</span>
              <span className="font-bold">{subtotal.toFixed(2).replace(".", ",")} €</span>
            </div>
            <div className="flex justify-between">
              <span>Livraison & Service</span>
              <span className="font-bold">{(deliveryFee + serviceFee).toFixed(2).replace(".", ",")} €</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[#8B5A2B]">
                <span>Avantage Foodiz</span>
                <span className="font-bold">-{discount.toFixed(2).replace(".", ",")} €</span>
              </div>
            )}
            {usePoints && (
              <div className="flex justify-between text-foodiz-green font-bold">
                <span>Points Foodiz</span>
                <span>-{pointsValue.toFixed(2).replace(".", ",")} €</span>
              </div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t-2 border-[#1a1a1a] flex justify-between items-end">
            <span className="font-serif text-lg italic font-bold">TOTAL À PAYER</span>
            <span className="font-serif text-3xl text-[#8B5A2B] italic font-bold">
              {finalTotal.toFixed(2).replace(".", ",")} €
            </span>
          </div>
        </div>

        <button 
          onClick={handlePayment} 
          disabled={isProcessing || items.length === 0}
          className="w-full foodiz-btn py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? 'Traitement en cours...' : `Payer ${finalTotal.toFixed(2).replace(".", ",")} €`}
        </button>
      </main>
    </div>
  );
}
