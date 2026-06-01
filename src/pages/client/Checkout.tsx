import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CreditCard, MapPin, Gift, CheckCircle, Plus } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { supabase } from "../../lib/supabase";
import { calculateFoodizOrder } from "../../lib/engines/foodizEconomicEngine";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, establishmentId, clearCart } = useCart();
  
  const [usePoints, setUsePoints] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'review' | 'add_card' | 'success'>('review');
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [newCard, setNewCard] = useState({ number: "", expiry: "" });

  const deliveryFee = 2.50;
  const serviceFee = 0.99;
  const userPoints = 1250; // À connecter au vrai wallet plus tard si besoin
  const pointsValue = 12.50;
  const totalBeforePoints = subtotal + deliveryFee + serviceFee;
  const finalTotal = usePoints ? Math.max(0, totalBeforePoints - pointsValue) : totalBeforePoints;

  useEffect(() => {
    const fetchCards = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('client_payment_methods').select('*').eq('user_id', user.id);
        if (data) setSavedCards(data);
      }
    };
    fetchCards();
  }, []);

  const handlePayment = async () => {
    // Si pas de carte enregistrée, on demande d'en ajouter une
    if (savedCards.length === 0 && step === 'review') {
      setStep('add_card');
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !establishmentId) throw new Error("Erreur utilisateur");

      const itemsForEngine = items.map(item => ({ partnerPriceCents: Math.round(item.price * 100) }));
      const totals = calculateFoodizOrder(itemsForEngine, 2.0);

      const { data: newOrder, error: orderError } = await supabase.from('orders').insert({
        client_id: user.id,
        restaurant_id: establishmentId,
        final_client_total_cents: totals.finalClientTotalCents,
        partner_total_cents: totals.partnerTotalCents,
        foodiz_revenue_cents: totals.foodizRevenueCents,
        courier_earnings_cents: totals.courierEarningsCents,
        courier_prime_fund_cents: totals.courierPrimeFundCents,
        loyalty_fund_cents: totals.loyaltyFundCents,
        referral_fund_cents: totals.referralFundCents,
        internal_fees_cents: totals.internalFeesCents,
        system_reserve_cents: totals.systemReserveCents,
        service_fee_cents: totals.serviceFeeCents,
        delivery_fee_cents: totals.deliveryFeeCents,
        address: "Adresse par défaut", // À connecter avec la table addresses
        delivery_code: Math.floor(100000 + Math.random() * 900000).toString(),
        status: 'pending'
      }).select().single();

      if (orderError) throw orderError;

      clearCart();
      setStep('success');
    } catch (error) {
      console.error("Erreur de paiement:", error);
      alert("Une erreur est survenue.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCardAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && newCard.number.length >= 4) {
      const lastFour = newCard.number.slice(-4);
      await supabase.from('client_payment_methods').insert({ 
        user_id: user.id, last_four: lastFour, expiry_date: newCard.expiry, brand: 'Visa' 
      });
      setSavedCards([...savedCards, { last_four: lastFour, expiry_date: newCard.expiry }]);
      setStep('review'); // Retour au récap pour valider le paiement
      handlePayment(); // Relance le paiement
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center p-6 text-center animate-fade-in-up">
        <div className="w-24 h-24 rounded-full bg-foodiz-green/10 flex items-center justify-center mb-6 border border-foodiz-green/30"><CheckCircle size={48} className="text-foodiz-green" /></div>
        <h1 className="foodiz-title text-3xl text-foodiz-cream mb-2">Commande Confirmée !</h1>
        <p className="text-foodiz-gray mb-8">Le restaurant prépare votre commande.</p>
        <button onClick={() => navigate("/client/orders")} className="foodiz-btn w-full max-w-sm py-4">Suivre ma commande</button>
      </div>
    );
  }

  if (step === 'add_card') {
    return (
      <div className="min-h-screen bg-foodiz-black p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md foodiz-card p-6 border-foodiz-gold/30">
          <h2 className="foodiz-title text-xl text-center mb-2">Ajouter un moyen de paiement</h2>
          <p className="text-foodiz-gray text-xs text-center mb-6">Aucune carte enregistrée. Ajoutez-en une pour finaliser la commande.</p>
          <form onSubmit={handleAddCardAndPay} className="space-y-4">
            <input type="text" placeholder="Numéro de carte" required value={newCard.number} onChange={e => setNewCard({...newCard, number: e.target.value})} className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-3 text-foodiz-cream text-sm outline-none font-mono" />
            <input type="text" placeholder="Date (MM/AA)" required value={newCard.expiry} onChange={e => setNewCard({...newCard, expiry: e.target.value})} className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-3 text-foodiz-cream text-sm outline-none" />
            <button type="submit" className="w-full foodiz-btn py-4">Enregistrer et Payer {finalTotal.toFixed(2)} €</button>
            <button type="button" onClick={() => setStep('review')} className="w-full text-foodiz-gray text-xs py-2">Annuler</button>
          </form>
        </div>
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
        <div className="foodiz-card p-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-foodiz-gold/10 flex items-center justify-center shrink-0"><MapPin size={18} className="text-foodiz-gold" /></div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foodiz-cream">Livraison à domicile</h3>
            <p className="text-xs text-foodiz-gray mt-1">24 rue Oberkampf, 75011 Paris</p>
          </div>
        </div>

        <div className="foodiz-card p-4 flex items-center gap-4 border-foodiz-gold/30">
          <div className="w-12 h-8 bg-foodiz-cream rounded flex items-center justify-center"><CreditCard size={16} className="text-foodiz-black" /></div>
          <div className="flex-1">
            {savedCards.length > 0 ? (
              <>
                <h3 className="text-sm font-medium text-foodiz-cream">Visa se terminant par {savedCards[0].last_four}</h3>
                <p className="text-xs text-foodiz-gray mt-1">Expire le {savedCards[0].expiry_date}</p>
              </>
            ) : (
              <h3 className="text-sm font-medium text-foodiz-red">Aucune carte enregistrée</h3>
            )}
          </div>
          <button onClick={() => setStep('add_card')} className="text-foodiz-gold"><Plus size={20} /></button>
        </div>

        <div className="foodiz-card p-6 bg-[#FDFBF7] text-[#1a1a1a]">
          <h3 className="font-serif text-xl text-center italic mb-6 tracking-widest uppercase">Votre Addition</h3>
          <div className="space-y-3 font-mono text-sm text-[#5C4033] mb-6">
            <div className="flex justify-between"><span>Sous-total</span><span className="font-bold">{subtotal.toFixed(2).replace(".", ",")} €</span></div>
            <div className="flex justify-between"><span>Livraison & Service</span><span className="font-bold">{(deliveryFee + serviceFee).toFixed(2).replace(".", ",")} €</span></div>
          </div>
          <div className="mt-6 pt-4 border-t-2 border-[#1a1a1a] flex justify-between items-end">
            <span className="font-serif text-lg italic font-bold">TOTAL À PAYER</span>
            <span className="font-serif text-3xl text-[#8B5A2B] italic font-bold">{finalTotal.toFixed(2).replace(".", ",")} €</span>
          </div>
        </div>

        <button onClick={handlePayment} disabled={isProcessing || items.length === 0} className="w-full foodiz-btn py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50">
          {isProcessing ? 'Traitement...' : `Payer ${finalTotal.toFixed(2).replace(".", ",")} €`}
        </button>
      </main>
    </div>
  );
}