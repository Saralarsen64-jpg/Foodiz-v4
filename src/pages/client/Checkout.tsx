import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CreditCard, MapPin, Gift, CheckCircle, Plus, ShieldCheck, Lock } from "lucide-react";
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

  // Constantes pour le calcul (à connecter plus tard aux vrais frais dynamiques si besoin)
  const deliveryFee = 2.50;
  const serviceFee = 0.99;
  const userPoints = 1250; // À connecter au vrai wallet plus tard
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

  // Fonction principale de traitement de la commande
  const processOrder = async () => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !establishmentId) throw new Error("Erreur utilisateur ou panier vide");

      // 1. Récupérer la VRAIE localisation du client pour le livreur
      const { data: profile } = await supabase.from('profiles').select('latitude, longitude, full_address').eq('id', user.id).single();

      // 2. Calculer la répartition économique réelle
      const itemsForEngine = items.map(item => ({ partnerPriceCents: Math.round(item.price * 100) }));
      const totals = calculateFoodizOrder(itemsForEngine, 2.0);

      // 3. Enregistrer la commande dans Supabase
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
        
        // ENVOI DES VRAIES COORDONNÉES AU LIVREUR
        client_latitude: profile?.latitude || null,
        client_longitude: profile?.longitude || null,
        client_address: profile?.full_address || "Adresse non précisée",
        
        delivery_code: Math.floor(100000 + Math.random() * 900000).toString(),
        status: 'pending'
      }).select().single();

      if (orderError) throw orderError;

      // 4. Enregistrer les articles de la commande
      const itemsToInsert = items.map(item => ({
        order_id: newOrder.id,
        product_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image_url: item.image
      }));
      await supabase.from('order_items').insert(itemsToInsert);

      clearCart();
      setStep('success');
    } catch (error) {
      console.error("Erreur de paiement:", error);
      alert("Une erreur est survenue lors de la commande.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = () => {
    // Si pas de carte enregistrée, on demande d'en ajouter une
    if (savedCards.length === 0 && step === 'review') {
      setStep('add_card');
      return;
    }
    processOrder();
  };

  const handleAddCardAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && newCard.number.length >= 4) {
      // SÉCURITÉ : On ne stocke que les 4 derniers chiffres
      const lastFour = newCard.number.slice(-4);
      await supabase.from('client_payment_methods').insert({ 
        user_id: user.id, 
        last_four: lastFour, 
        expiry_date: newCard.expiry, 
        brand: 'Visa' 
      });
      
      setSavedCards([...savedCards, { last_four: lastFour, expiry_date: newCard.expiry }]);
      setStep('review'); 
      // On lance le paiement juste après
      setTimeout(() => processOrder(), 500);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center p-6 text-center animate-fade-in-up">
        <div className="w-24 h-24 rounded-full bg-foodiz-green/10 flex items-center justify-center mb-6 border border-foodiz-green/30">
          <CheckCircle size={48} className="text-foodiz-green" />
        </div>
        <h1 className="foodiz-title text-3xl text-foodiz-cream mb-2">Commande Confirmée !</h1>
        <p className="text-foodiz-gray mb-8">Le restaurant prépare votre commande. Un livreur va bientôt être assigné.</p>
        <button onClick={() => navigate("/client/orders")} className="foodiz-btn w-full max-w-sm py-4">Suivre ma commande</button>
      </div>
    );
  }

  if (step === 'add_card') {
    return (
      <div className="min-h-screen bg-foodiz-black p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md foodiz-card p-6 border-foodiz-gold/30">
          <div className="flex items-center gap-3 mb-4 text-foodiz-gold">
            <Lock size={20} />
            <h2 className="foodiz-title text-xl">Paiement Sécurisé</h2>
          </div>
          <p className="text-foodiz-gray text-xs mb-6">Aucune carte enregistrée. Ajoutez-en une pour finaliser la commande. Nous ne stockons jamais votre numéro complet.</p>
          <form onSubmit={handleAddCardAndPay} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-foodiz-gray uppercase font-bold">Numéro de carte</label>
              <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} required value={newCard.number} onChange={e => setNewCard({...newCard, number: e.target.value})} className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-3 text-foodiz-cream text-sm outline-none font-mono tracking-widest focus:border-foodiz-gold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-foodiz-gray uppercase font-bold">Date d'expiration</label>
              <input type="text" placeholder="MM/AA" maxLength={5} required value={newCard.expiry} onChange={e => setNewCard({...newCard, expiry: e.target.value})} className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-3 text-foodiz-cream text-sm outline-none focus:border-foodiz-gold" />
            </div>
            <button type="submit" className="w-full foodiz-btn py-4 mt-4 flex items-center justify-center gap-2">
              <ShieldCheck size={18} /> Enregistrer et Payer {finalTotal.toFixed(2)} €
            </button>
            <button type="button" onClick={() => setStep('review')} className="w-full text-foodiz-gray text-xs py-2 hover:text-foodiz-cream">Annuler</button>
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
        {/* Adresse de livraison */}
        <div className="foodiz-card p-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-foodiz-gold/10 flex items-center justify-center shrink-0">
            <MapPin size={18} className="text-foodiz-gold" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foodiz-cream">Livraison à domicile</h3>
            <p className="text-xs text-foodiz-gray mt-1">Adresse GPS détectée automatiquement</p>
            <button onClick={() => navigate("/client/account/addresses")} className="text-[10px] text-foodiz-gold mt-2 underline">Changer d'adresse</button>
          </div>
        </div>

        {/* Moyen de paiement */}
        <div className="foodiz-card p-4 flex items-center gap-4 border-foodiz-gold/30">
          <div className="w-12 h-8 bg-foodiz-cream rounded flex items-center justify-center">
            <CreditCard size={16} className="text-foodiz-black" />
          </div>
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

        {/* Points de fidélité */}
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

        {/* Récapitulatif */}
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
          {isProcessing ? 'Traitement en cours...' : <><ShieldCheck size={20} /> Payer {finalTotal.toFixed(2).replace(".", ",")} €</>}
        </button>
      </main>
    </div>
  );
}