import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check, Star } from "lucide-react";

const PACKS = [
  { id: 'DECOUVERTE', name: 'Découverte', monthly: 39.99, yearly: 407.89, campaigns: 8, badge: 'Parfait pour commencer', popular: false },
  { id: 'BOOST', name: 'Boost', monthly: 79.99, yearly: 815.89, campaigns: 15, badge: 'Le plus populaire', popular: true },
  { id: 'DOMINATION', name: 'Domination Locale', monthly: 119.99, yearly: 1223.89, campaigns: 25, badge: 'Visibilité maximale', popular: false },
];

export default function MarketingPacks() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const handleSelect = (packId: string) => {
    navigate(`/partner/marketing/checkout?pack=${packId}&period=${period}`);
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner/marketing")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Choisir un pack Foodiz+</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-foodiz-card p-1 rounded-full border border-foodiz-gold/20 flex">
            <button onClick={() => setPeriod('monthly')} className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${period === 'monthly' ? 'bg-foodiz-gold text-foodiz-black' : 'text-foodiz-gray'}`}>Mensuel</button>
            <button onClick={() => setPeriod('yearly')} className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${period === 'yearly' ? 'bg-foodiz-gold text-foodiz-black' : 'text-foodiz-gray'}`}>Annuel (-15%)</button>
          </div>
        </div>

        {/* Packs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PACKS.map((pack) => {
            const price = period === 'monthly' ? pack.monthly : pack.yearly;
            const monthlyEquivalent = period === 'yearly' ? (pack.yearly / 12).toFixed(2) : null;
            const savings = period === 'yearly' ? ((pack.monthly * 12 - pack.yearly)).toFixed(2) : null;

            return (
              <div key={pack.id} className={`foodiz-card p-6 relative ${pack.popular ? 'border-foodiz-gold border-2 bg-foodiz-gold/5' : 'border-foodiz-gold/20'}`}>
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foodiz-gold text-foodiz-black text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Star size={10} fill="currentColor" /> {pack.badge}
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="foodiz-title text-xl text-foodiz-cream mb-2">{pack.name}</h3>
                  {!pack.popular && <p className="text-[10px] text-foodiz-gray">{pack.badge}</p>}
                  <div className="mt-4">
                    <span className="text-4xl font-serif italic text-foodiz-gold">{price.toFixed(2)}</span>
                    <span className="text-foodiz-gray text-sm"> €/{period === 'monthly' ? 'mois' : 'an'}</span>
                  </div>
                  {period === 'yearly' && monthlyEquivalent && (
                    <p className="text-[10px] text-foodiz-gray mt-1">soit {monthlyEquivalent} €/mois</p>
                  )}
                  {savings && (
                    <p className="text-[10px] text-foodiz-green mt-1">Économisez {savings} €/an</p>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm text-foodiz-cream">
                    <Check size={14} className="text-foodiz-gold" /> {pack.campaigns} campagnes/mois
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foodiz-cream">
                    <Check size={14} className="text-foodiz-gold" /> Ciblage local intelligent
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foodiz-cream">
                    <Check size={14} className="text-foodiz-gold" /> Génération IA premium
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foodiz-cream">
                    <Check size={14} className="text-foodiz-gold" /> Statistiques détaillées
                  </li>
                </ul>

                <button onClick={() => handleSelect(pack.id)} className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${pack.popular ? 'bg-foodiz-gold text-foodiz-black hover:bg-foodiz-gold-light' : 'border border-foodiz-gold text-foodiz-gold hover:bg-foodiz-gold/10'}`}>
                  Choisir ce pack
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
