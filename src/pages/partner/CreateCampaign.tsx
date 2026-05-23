import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Sparkles, Send, Calendar, MapPin, Users, Lock } from "lucide-react";
import { useFoodizPlus, CampaignObjective, AudienceType } from "../../context/FoodizPlusContext";

const OBJECTIVES: { value: CampaignObjective; label: string; desc: string }[] = [
  { value: 'booster_ce_soir', label: 'Booster ce soir', desc: 'Remplir votre établissement ce soir' },
  { value: 'nouveaute', label: 'Lancer une nouveauté', desc: 'Annoncer un nouveau produit' },
  { value: 'heures_creuses', label: 'Remplir heures creuses', desc: 'Attirer clients en heures calmes' },
  { value: 'dessert', label: 'Promouvoir dessert', desc: 'Mettre en avant vos desserts' },
  { value: 'menu', label: 'Pousser un menu', desc: 'Promouvoir un menu spécifique' },
  { value: 'reactiver', label: 'Réactiver clients', desc: 'Recontacter clients inactifs' },
];

const AUDIENCES: { value: AudienceType; label: string }[] = [
  { value: 'ville_entiere', label: 'Toute la ville' },
  { value: 'zone_proche', label: 'Zone proche (2km)' },
  { value: 'clients_fideles', label: 'Clients ayant déjà commandé' },
  { value: 'clients_inactifs', label: 'Clients inactifs' },
  { value: 'amateurs_burgers', label: 'Amateurs de burgers' },
  { value: 'amateurs_pizzas', label: 'Amateurs de pizzas' },
  { value: 'amateurs_sushis', label: 'Amateurs de sushis' },
  { value: 'amateurs_market', label: 'Amateurs Market' },
  { value: 'amateurs_desserts', label: 'Amateurs de desserts' },
];

export default function CreateCampaign() {
  const navigate = useNavigate();
  const { canCreateCampaign, createCampaign, generateCampaignText, subscription } = useFoodizPlus();
  const [objective, setObjective] = useState<CampaignObjective | ''>('');
  const [audience, setAudience] = useState<AudienceType | ''>('');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  if (!canCreateCampaign()) {
    return (
      <div className="min-h-screen bg-foodiz-black flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="foodiz-title text-xl text-foodiz-red mb-2">Quota atteint</h2>
          <p className="text-foodiz-gray text-sm mb-4">Vous avez utilisé toutes vos campagnes ce mois-ci.</p>
          <button onClick={() => navigate("/partner/marketing/packs")} className="foodiz-btn px-6 py-3">Upgrade mon pack</button>
        </div>
      </div>
    );
  }

  const handleGenerate = () => {
    if (!objective) return;
    setGenerating(true);
    setTimeout(() => {
      const text = generateCampaignText('Maison K', 'Paris 11e', objective as CampaignObjective, ['Burger Artisanal']);
      setMessage(text);
      setTitle(objective === 'nouveaute' ? 'Nouveauté chez Maison K' : 'Une envie gourmande ?');
      setGenerating(false);
    }, 1500);
  };

  const handleSend = () => {
    if (!message || !objective || !audience) return;
    createCampaign({
      title: title || 'Campagne Foodiz+',
      message,
      objective: objective as CampaignObjective,
      audienceType: audience as AudienceType,
      city: 'Paris 11e',
      productIds: ['p1'],
      scheduledAt: isScheduled ? scheduledDate : undefined,
    });
    navigate("/partner/marketing");
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner/marketing")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Nouvelle campagne</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Quota */}
        <div className="foodiz-card p-4 bg-foodiz-gold/5 border-foodiz-gold/20 flex items-center justify-between">
          <span className="text-sm text-foodiz-cream">Campagnes restantes</span>
          <span className="text-foodiz-gold font-bold">{subscription ? subscription.campaignsIncluded - subscription.campaignsUsed : 0} / {subscription?.campaignsIncluded}</span>
        </div>

        {/* Objective */}
        <div>
          <h3 className="foodiz-title text-sm mb-3">Objectif de la campagne</h3>
          <div className="grid grid-cols-2 gap-3">
            {OBJECTIVES.map((obj) => (
              <button key={obj.value} onClick={() => setObjective(obj.value)} className={`foodiz-card p-4 text-left transition-all ${objective === obj.value ? 'border-foodiz-gold bg-foodiz-gold/10' : 'border-foodiz-gold/10'}`}>
                <p className="text-sm font-medium text-foodiz-cream">{obj.label}</p>
                <p className="text-[10px] text-foodiz-gray mt-1">{obj.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Audience */}
        <div>
          <h3 className="foodiz-title text-sm mb-3 flex items-center gap-2"><Users size={16} className="text-foodiz-gold" /> Audience cible</h3>
          <select value={audience} onChange={(e) => setAudience(e.target.value as AudienceType)} className="w-full foodiz-card p-4 bg-foodiz-black text-foodiz-cream outline-none border border-foodiz-gold/20 focus:border-foodiz-gold/50">
            <option value="">Sélectionner une audience</option>
            {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>

        {/* AI Generation */}
        <div className="foodiz-card p-5 border-foodiz-gold/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="foodiz-title text-sm flex items-center gap-2"><Sparkles size={16} className="text-foodiz-gold" /> Génération IA premium</h3>
            <button onClick={handleGenerate} disabled={!objective || generating} className="text-[10px] bg-foodiz-gold text-foodiz-black px-3 py-1.5 rounded-full font-bold disabled:opacity-50">
              {generating ? 'Génération...' : 'Générer'}
            </button>
          </div>
          <div className="space-y-3">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de la notification" className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl px-4 py-3 text-foodiz-cream outline-none text-sm focus:border-foodiz-gold/50" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message (généré par IA ou personnalisé)" className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl px-4 py-3 text-foodiz-cream outline-none text-sm min-h-[100px] resize-none focus:border-foodiz-gold/50" />
          </div>
        </div>

        {/* Preview */}
        {message && (
          <div className="foodiz-card p-5 bg-foodiz-gold/5 border-foodiz-gold/20">
            <h3 className="foodiz-title text-sm mb-3">Aperçu notification client</h3>
            <div className="bg-foodiz-black rounded-2xl p-4 border border-foodiz-gold/10">
              <p className="text-xs text-foodiz-gold font-bold mb-1">{title || 'Maison K'}</p>
              <p className="text-sm text-foodiz-cream">{message}</p>
            </div>
          </div>
        )}

        {/* Scheduling (Domination Pack Only) */}
        {subscription?.packName === 'DOMINATION' && (
          <div className="foodiz-card p-5 border-foodiz-gold/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="foodiz-title text-sm flex items-center gap-2"><Calendar size={16} className="text-foodiz-gold" /> Programmer l'envoi</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-foodiz-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-foodiz-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-foodiz-gold"></div>
              </label>
            </div>
            {isScheduled ? (
              <input type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl px-4 py-3 text-foodiz-cream outline-none text-sm focus:border-foodiz-gold/50" />
            ) : (
              <p className="text-xs text-foodiz-gray">La campagne sera envoyée immédiatement après validation.</p>
            )}
          </div>
        )}
        {subscription?.packName !== 'DOMINATION' && (
          <div className="foodiz-card p-4 bg-foodiz-gold/5 border-foodiz-gold/20 flex items-center gap-3">
            <Lock size={16} className="text-foodiz-gold" />
            <p className="text-xs text-foodiz-gray">La programmation est une fonctionnalité exclusive du pack <span className="text-foodiz-gold font-bold">Domination Locale</span>.</p>
          </div>
        )}

        <button onClick={handleSend} disabled={!message || !audience || (isScheduled && !scheduledDate)} className="w-full foodiz-btn py-4 flex items-center justify-center gap-2 disabled:opacity-50">
          {isScheduled ? <><Calendar size={18} /> Programmer la campagne</> : <><Send size={18} /> Envoyer la campagne</>}
        </button>
      </main>
    </div>
  );
}
