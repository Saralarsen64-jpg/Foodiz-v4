import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Lock, CreditCard } from "lucide-react";
import { useFoodizPlus, PackName } from "../../context/FoodizPlusContext";

const PACKS: Record<string, { name: string; monthly: number; yearly: number; campaigns: number }> = {
  DECOUVERTE: { name: 'Découverte', monthly: 39.99, yearly: 407.89, campaigns: 8 },
  BOOST: { name: 'Boost', monthly: 79.99, yearly: 815.89, campaigns: 15 },
  DOMINATION: { name: 'Domination Locale', monthly: 119.99, yearly: 1223.89, campaigns: 25 },
};

export default function MarketingCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { subscribe } = useFoodizPlus();
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const packId = searchParams.get('pack') as PackName;
  const period = searchParams.get('period') as 'monthly' | 'yearly';
  const pack = packId ? PACKS[packId] : null;
  const price = pack ? (period === 'monthly' ? pack.monthly : pack.yearly) : 0;

  const handlePayment = () => {
    setProcessing(true);
    // Simulate Stripe payment
    setTimeout(() => {
      if (packId && period) {
        subscribe(packId, period);
        setSuccess(true);
        setTimeout(() => navigate("/partner/marketing"), 2000);
      }
      setProcessing(false);
    }, 2000);
  };

  if (!pack) return <div className="p-8 text-center text-foodiz-gray">Pack non trouvé</div>;

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner/marketing/packs")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Paiement sécurisé</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {success ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto rounded-full bg-foodiz-green/10 flex items-center justify-center mb-4">
              <Lock size={40} className="text-foodiz-green" />
            </div>
            <h2 className="foodiz-title text-2xl text-foodiz-green mb-2">Paiement réussi !</h2>
            <p className="text-foodiz-gray">Votre abonnement Foodiz+ {pack.name} est maintenant actif.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="foodiz-card p-6 bg-foodiz-gold/5 border-foodiz-gold/20">
              <h2 className="foodiz-title text-lg mb-4">Récapitulatif</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-foodiz-gray">Pack {pack.name}</span>
                  <span className="text-foodiz-cream">{pack.campaigns} campagnes/mois</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foodiz-gray">Facturation</span>
                  <span className="text-foodiz-cream">{period === 'monthly' ? 'Mensuelle' : 'Annuelle'}</span>
                </div>
                <div className="border-t border-foodiz-gold/20 pt-3 flex justify-between text-lg font-bold">
                  <span className="text-foodiz-cream">Total</span>
                  <span className="text-foodiz-gold">{price.toFixed(2)} €{period === 'yearly' ? '/an' : '/mois'}</span>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="foodiz-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock size={16} className="text-foodiz-gold" />
                <h2 className="foodiz-title text-sm">Paiement par carte (Stripe)</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-foodiz-gray uppercase">Numéro de carte</label>
                  <div className="flex items-center gap-2 mt-1 bg-foodiz-black border border-foodiz-gold/20 rounded-xl px-4 py-3">
                    <CreditCard size={18} className="text-foodiz-gold" />
                    <input type="text" placeholder="4242 4242 4242 4242" className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" defaultValue="4242 4242 4242 4242" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-foodiz-gray uppercase">Expiration</label>
                    <input type="text" placeholder="12/25" className="w-full mt-1 bg-foodiz-black border border-foodiz-gold/20 rounded-xl px-4 py-3 text-foodiz-cream outline-none text-sm" defaultValue="12/25" />
                  </div>
                  <div>
                    <label className="text-[10px] text-foodiz-gray uppercase">CVC</label>
                    <input type="text" placeholder="123" className="w-full mt-1 bg-foodiz-black border border-foodiz-gold/20 rounded-xl px-4 py-3 text-foodiz-cream outline-none text-sm" defaultValue="123" />
                  </div>
                </div>
              </div>
            </div>

            <button onClick={handlePayment} disabled={processing} className="w-full foodiz-btn py-4 flex items-center justify-center gap-2 disabled:opacity-50">
              {processing ? 'Traitement en cours...' : `Payer ${price.toFixed(2)} €`}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
