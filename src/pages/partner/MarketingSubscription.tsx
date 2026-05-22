import { useNavigate } from "react-router-dom";
import { ChevronLeft, Calendar, CreditCard, AlertTriangle } from "lucide-react";
import { useFoodizPlus } from "../../context/FoodizPlusContext";

export default function MarketingSubscription() {
  const navigate = useNavigate();
  const { subscription } = useFoodizPlus();

  if (!subscription) {
    navigate("/partner/marketing/packs");
    return null;
  }

  const packPrices: Record<string, { monthly: number; yearly: number }> = {
    DECOUVERTE: { monthly: 39.99, yearly: 407.89 },
    BOOST: { monthly: 79.99, yearly: 815.89 },
    DOMINATION: { monthly: 119.99, yearly: 1223.89 },
  };

  const price = packPrices[subscription.packName][subscription.billingPeriod];

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner/marketing")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Mon abonnement</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Current Pack */}
        <div className="foodiz-card p-6 bg-foodiz-gold/5 border-foodiz-gold/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="foodiz-title text-xl text-foodiz-gold">Pack {subscription.packName}</h2>
              <p className="text-sm text-foodiz-gray mt-1">{subscription.billingPeriod === 'monthly' ? 'Facturation mensuelle' : 'Facturation annuelle'}</p>
            </div>
            <span className="text-2xl font-serif italic text-foodiz-cream">{price.toFixed(2)} €</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <p className="text-foodiz-gray">Prochain renouvellement</p>
              <p className="text-foodiz-cream flex items-center gap-2 mt-1"><Calendar size={14} /> {new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <p className="text-foodiz-gray">Stripe ID</p>
              <p className="text-foodiz-cream flex items-center gap-2 mt-1"><CreditCard size={14} /> {subscription.stripeSubscriptionId}</p>
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="foodiz-card p-6">
          <h3 className="foodiz-title text-sm mb-4">Utilisation ce mois</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-foodiz-cream">Campagnes utilisées</span>
                <span className="text-foodiz-gold">{subscription.campaignsUsed} / {subscription.campaignsIncluded}</span>
              </div>
              <div className="h-3 bg-foodiz-black rounded-full overflow-hidden">
                <div className="h-full bg-foodiz-gold transition-all" style={{ width: `${(subscription.campaignsUsed / subscription.campaignsIncluded) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button className="w-full foodiz-card p-4 text-left hover:border-foodiz-gold/30 transition-all flex justify-between items-center">
            <span className="text-foodiz-cream">Changer de pack (Upgrade/Downgrade)</span>
            <ChevronLeft size={16} className="text-foodiz-gold rotate-180" />
          </button>
          <button className="w-full foodiz-card p-4 text-left hover:border-foodiz-gold/30 transition-all flex justify-between items-center">
            <span className="text-foodiz-cream">Historique des factures</span>
            <ChevronLeft size={16} className="text-foodiz-gold rotate-180" />
          </button>
          <button className="w-full foodiz-card p-4 text-left border-foodiz-red/20 hover:border-foodiz-red/40 transition-all flex justify-between items-center">
            <span className="text-foodiz-red flex items-center gap-2"><AlertTriangle size={16} /> Annuler l'abonnement</span>
          </button>
        </div>
      </main>
    </div>
  );
}
