import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Users, Eye, MousePointer, ShoppingCart, TrendingUp } from "lucide-react";
import { useFoodizPlus } from "../../context/FoodizPlusContext";

export default function CampaignDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { campaigns } = useFoodizPlus();
  const campaign = campaigns.find(c => c.id === id);

  if (!campaign) {
    return <div className="p-8 text-center text-foodiz-gray">Campagne non trouvée</div>;
  }

  const statusLabels: Record<string, string> = {
    draft: 'Brouillon', scheduled: 'Programmée', sent: 'Envoyée', cancelled: 'Annulée', failed: 'Échouée'
  };
  const statusColors: Record<string, string> = {
    draft: 'bg-foodiz-gray/10 text-foodiz-gray', scheduled: 'bg-foodiz-gold/10 text-foodiz-gold', sent: 'bg-foodiz-green/10 text-foodiz-green', cancelled: 'bg-foodiz-red/10 text-foodiz-red', failed: 'bg-foodiz-red/10 text-foodiz-red'
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner/marketing")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Détail campagne</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="foodiz-title text-xl text-foodiz-cream">{campaign.title}</h2>
            <p className="text-sm text-foodiz-gray mt-1 flex items-center gap-2">
              {campaign.status === 'scheduled' ? 'Programmée pour le ' : 'Envoyée le '}
              {new Date(campaign.scheduledAt || campaign.sentAt || '').toLocaleString('fr-FR')}
            </p>
          </div>
          <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${statusColors[campaign.status]}`}>{statusLabels[campaign.status]}</span>
        </div>

        {/* Message */}
        <div className="foodiz-card p-5 bg-foodiz-gold/5 border-foodiz-gold/20">
          <h3 className="foodiz-title text-sm mb-3">Message envoyé</h3>
          <p className="text-foodiz-cream text-sm">{campaign.message}</p>
          {campaign.aiGenerated && <p className="text-[10px] text-foodiz-gold mt-2 flex items-center gap-1">✨ Généré par IA Foodiz+</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="foodiz-card p-4 bg-[#0A0A0A] border-foodiz-gold/10 text-center">
            <Users size={20} className="mx-auto text-foodiz-gold mb-2" />
            <p className="text-2xl font-serif italic text-foodiz-cream">{campaign.recipientsCount}</p>
            <p className="text-[10px] text-foodiz-gray uppercase mt-1">Destinataires</p>
          </div>
          <div className="foodiz-card p-4 bg-[#0A0A0A] border-foodiz-gold/10 text-center">
            <Eye size={20} className="mx-auto text-foodiz-gold mb-2" />
            <p className="text-2xl font-serif italic text-foodiz-cream">{campaign.openedCount}</p>
            <p className="text-[10px] text-foodiz-gray uppercase mt-1">Ouvertures</p>
          </div>
          <div className="foodiz-card p-4 bg-[#0A0A0A] border-foodiz-gold/10 text-center">
            <MousePointer size={20} className="mx-auto text-foodiz-gold mb-2" />
            <p className="text-2xl font-serif italic text-foodiz-cream">{campaign.clickedCount}</p>
            <p className="text-[10px] text-foodiz-gray uppercase mt-1">Clics</p>
          </div>
          <div className="foodiz-card p-4 bg-[#0A0A0A] border-foodiz-gold/10 text-center">
            <ShoppingCart size={20} className="mx-auto text-foodiz-green mb-2" />
            <p className="text-2xl font-serif italic text-foodiz-green">{campaign.ordersGenerated}</p>
            <p className="text-[10px] text-foodiz-gray uppercase mt-1">Commandes</p>
          </div>
        </div>

        {/* Revenue */}
        <div className="foodiz-card p-6 bg-foodiz-green/5 border-foodiz-green/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp size={24} className="text-foodiz-green" />
            <div>
              <p className="text-sm text-foodiz-gray">CA estimé généré</p>
              <p className="text-2xl font-serif italic text-foodiz-green font-bold">{campaign.estimatedRevenue.toFixed(2)} €</p>
            </div>
          </div>
        </div>

        {/* Audience Info */}
        <div className="foodiz-card p-5">
          <h3 className="foodiz-title text-sm mb-3">Détails ciblage</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-foodiz-gray">Ville</p>
              <p className="text-foodiz-cream">{campaign.city}</p>
            </div>
            <div>
              <p className="text-foodiz-gray">Audience</p>
              <p className="text-foodiz-cream">{campaign.audienceType}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
