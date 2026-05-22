import { useNavigate } from "react-router-dom";
import { ChevronLeft, TrendingUp, Users, ShoppingCart, Plus, Calendar } from "lucide-react";
import { useFoodizPlus } from "../../context/FoodizPlusContext";

export default function MarketingDashboard() {
  const navigate = useNavigate();
  const { subscription, campaigns } = useFoodizPlus();

  const totalOpens = campaigns.reduce((sum, c) => sum + c.openedCount, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clickedCount, 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.estimatedRevenue, 0);

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Foodiz+</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {!subscription ? (
          <div className="text-center py-12">
            <h2 className="foodiz-title text-2xl mb-4">Boostez votre visibilité locale</h2>
            <p className="text-foodiz-gray mb-8">Rejoignez Foodiz+ et touchez vos clients locaux avec des campagnes premium.</p>
            <button onClick={() => navigate("/partner/marketing/packs")} className="foodiz-btn px-8 py-4">Découvrir les packs</button>
          </div>
        ) : (
          <>
            {/* Pack Info */}
            <div className="foodiz-card p-6 bg-gradient-to-br from-foodiz-gold/10 to-foodiz-card border-foodiz-gold/30">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="foodiz-title text-xl text-foodiz-gold">Pack {subscription.packName}</h2>
                  <p className="text-xs text-foodiz-gray mt-1">Abonnement {subscription.billingPeriod === 'monthly' ? 'mensuel' : 'annuel'} actif</p>
                </div>
                <button onClick={() => navigate("/partner/marketing/subscription")} className="text-[10px] text-foodiz-gold border border-foodiz-gold/30 px-3 py-1 rounded-full">Gérer</button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-foodiz-cream">Campagnes ce mois</span>
                    <span className="text-foodiz-gold">{subscription.campaignsUsed} / {subscription.campaignsIncluded}</span>
                  </div>
                  <div className="h-2 bg-foodiz-black rounded-full overflow-hidden">
                    <div className="h-full bg-foodiz-gold transition-all" style={{ width: `${(subscription.campaignsUsed / subscription.campaignsIncluded) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="foodiz-card p-4 bg-[#0A0A0A] border-foodiz-gold/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-foodiz-gold" />
                  <span className="text-[10px] text-foodiz-gray uppercase">Ouvertures</span>
                </div>
                <p className="text-2xl font-serif italic text-foodiz-cream">{totalOpens}</p>
              </div>
              <div className="foodiz-card p-4 bg-[#0A0A0A] border-foodiz-gold/10">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={16} className="text-foodiz-gold" />
                  <span className="text-[10px] text-foodiz-gray uppercase">Clics</span>
                </div>
                <p className="text-2xl font-serif italic text-foodiz-cream">{totalClicks}</p>
              </div>
              <div className="foodiz-card p-4 bg-[#0A0A0A] border-foodiz-gold/10">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart size={16} className="text-foodiz-gold" />
                  <span className="text-[10px] text-foodiz-gray uppercase">Commandes</span>
                </div>
                <p className="text-2xl font-serif italic text-foodiz-cream">{campaigns.reduce((s, c) => s + c.ordersGenerated, 0)}</p>
              </div>
              <div className="foodiz-card p-4 bg-[#0A0A0A] border-foodiz-gold/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-foodiz-green" />
                  <span className="text-[10px] text-foodiz-gray uppercase">CA estimé</span>
                </div>
                <p className="text-2xl font-serif italic text-foodiz-green">{totalRevenue.toFixed(2)} €</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => navigate("/partner/marketing/create-campaign")} className="flex-1 foodiz-btn py-4 flex items-center justify-center gap-2">
                <Plus size={18} /> Créer une campagne
              </button>
            </div>

            {/* Active/Scheduled Campaigns */}
            <div>
              <h3 className="foodiz-title text-sm mb-4 flex items-center gap-2 text-foodiz-gold">
                <Calendar size={16} /> Campagnes en cours / Programmées
              </h3>
              <div className="space-y-3 mb-8">
                {campaigns.filter(c => c.status === 'scheduled').map((camp) => (
                  <button key={camp.id} onClick={() => navigate(`/partner/marketing/campaigns/${camp.id}`)} className="w-full foodiz-card p-4 text-left hover:border-foodiz-gold/30 transition-all border-foodiz-gold/30 bg-foodiz-gold/5">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-medium text-foodiz-cream">{camp.title}</h4>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-foodiz-gold/10 text-foodiz-gold">Programmée</span>
                    </div>
                    <p className="text-xs text-foodiz-gray line-clamp-1">{camp.message}</p>
                    <div className="flex gap-4 mt-3 text-[10px] text-foodiz-gold">
                      <span>Envoi le: {new Date(camp.scheduledAt || '').toLocaleString('fr-FR')}</span>
                    </div>
                  </button>
                ))}
                {campaigns.filter(c => c.status === 'scheduled').length === 0 && <p className="text-foodiz-gray text-sm text-center py-4 bg-foodiz-card rounded-xl">Aucune campagne en cours.</p>}
              </div>
            </div>

            {/* Past Campaigns */}
            <div>
              <h3 className="foodiz-title text-sm mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-foodiz-gray" /> Campagnes passées
              </h3>
              <div className="space-y-3">
                {campaigns.filter(c => c.status === 'sent').map((camp) => (
                  <button key={camp.id} onClick={() => navigate(`/partner/marketing/campaigns/${camp.id}`)} className="w-full foodiz-card p-4 text-left hover:border-foodiz-gold/30 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-medium text-foodiz-cream">{camp.title}</h4>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-foodiz-green/10 text-foodiz-green">Envoyée</span>
                    </div>
                    <p className="text-xs text-foodiz-gray line-clamp-1">{camp.message}</p>
                    <div className="flex gap-4 mt-3 text-[10px] text-foodiz-gray">
                      <span>{camp.recipientsCount} destinataires</span>
                      <span>{camp.openedCount} ouvertures</span>
                      <span className="text-foodiz-green">{camp.ordersGenerated} commandes</span>
                    </div>
                  </button>
                ))}
                {campaigns.filter(c => c.status === 'sent').length === 0 && <p className="text-foodiz-gray text-sm text-center py-8">Aucune campagne passée.</p>}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
