import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Gift, Star, Trophy, Crown, Lock, Unlock, Clock, Zap } from "lucide-react";

// ─── MOTEUR IA GÉNÉRATEUR D'AVANTAGES (Respect strict : 100 pts = 1€ max) ───
const generateAIAvantages = (userPoints: number) => {
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 22 || currentHour < 6;

  // Base de modèles d'avantages (Valeur réelle <= Points / 100)
  const templates = [
    { points: 150, title: "Réduction Immédiate", desc: "-1,50 € sur votre prochaine commande.", value: 1.50 },
    { points: 250, title: "Livraison Premium", desc: "Frais de service entièrement offerts.", value: 2.50 },
    { points: 500, title: "Bon d'Achat Foodiz", desc: "-5,00 € sur vos courses.", value: 5.00 },
    { points: 800, title: "Dessert Offert", desc: "Un dessert gratuit (max 8,00 €).", value: 8.00 },
    { points: 1500, title: "Menu Royal Offert", desc: "Un menu complet gratuit (max 15,00 €).", value: 15.00 },
    { points: 2000, title: "Nuit Gourmande", desc: "-20,00 € sur vos achats après 22h.", value: 20.00, nightOnly: true },
  ];

  // L'IA filtre et génère la liste cohérente
  return templates
    .filter(t => !t.nightOnly || isNight) // Propose l'offre nuit seulement le soir
    .map(t => ({
      ...t,
      canUnlock: userPoints >= t.points, // Le client peut le débloquer maintenant
      isLocked: false // Sera géré par l'état
    }));
};

export default function AdvantagesPage() {
  const navigate = useNavigate();
  const [points, setPoints] = useState(0);
  const [advantages, setAdvantages] = useState<any[]>([]);
  const [lockedAdvantages, setLockedAdvantages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Vrais points
        const { data: wallet } = await supabase.from('client_wallets').select('points_balance').eq('user_id', user.id).single();
        const currentPoints = wallet?.points_balance || 0;
        setPoints(currentPoints);

        // 2. Génération IA des avantages
        setAdvantages(generateAIAvantages(currentPoints));

        // 3. Récupérer les avantages déjà verrouillés
        const { data: locked } = await supabase.from('client_locked_advantages').select('*').eq('user_id', user.id).eq('status', 'locked');
        if (locked) setLockedAdvantages(locked);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleLock = async (adv: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('client_locked_advantages').insert({
        user_id: user.id,
        title: adv.title,
        description: adv.desc,
        points_cost: adv.points
      });
      setLockedAdvantages([...lockedAdvantages, { ...adv, status: 'locked' }]);
    }
  };

  const currentTier = points >= 1500 ? { name: "Platinum", icon: Crown, color: "text-foodiz-cream" } : points >= 5000 ? { name: "Gold", icon: Trophy, color: "text-foodiz-gold" } : { name: "Membre", icon: Star, color: "text-gray-400" };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up border-x-2 border-foodiz-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/client/account")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Foodiz Club</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* Wallet Card */}
        <div className="foodiz-card p-8 bg-gradient-to-br from-foodiz-gold/20 to-foodiz-card border border-foodiz-gold/30 text-center relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-foodiz-gold text-xs uppercase tracking-widest font-bold mb-2">Mon Solde Foodiz</p>
            {loading ? <div className="text-4xl font-serif italic text-foodiz-cream animate-pulse">...</div> : <div className="text-5xl font-serif italic text-foodiz-cream mb-2">{points.toLocaleString('fr-FR')}</div>}
            <p className="text-foodiz-gray text-sm">points fidélité</p>
            <div className={`mt-4 text-sm font-bold flex items-center justify-center gap-2 ${currentTier.color}`}>
              <currentTier.icon size={16} /> Statut {currentTier.name}
            </div>
          </div>
          <Gift size={120} className="absolute -bottom-4 -right-4 text-foodiz-gold/5 rotate-12" />
        </div>

        {/* Avantages Verrouillés (Objectifs) */}
        {lockedAdvantages.length > 0 && (
          <div>
            <h3 className="foodiz-title text-lg mb-4 flex items-center gap-2 text-foodiz-gold"><Lock size={18} /> Mes Avantages Verrouillés</h3>
            <div className="space-y-3">
              {lockedAdvantages.map((lock, idx) => (
                <div key={idx} className="foodiz-card p-4 bg-[#0A0A0A] border-foodiz-gold/20 flex justify-between items-center">
                  <div>
                    <p className="text-foodiz-cream font-bold text-sm">{lock.title}</p>
                    <p className="text-foodiz-gray text-xs">{lock.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-foodiz-gold font-bold text-sm">{lock.points_cost} pts</p>
                    <p className="text-[10px] text-foodiz-gray">{points >= lock.points_cost ? "Débloquable !" : `Encore ${lock.points_cost - points} pts`}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Génération IA des Avantages */}
        <div>
          <h3 className="foodiz-title text-lg mb-4 flex items-center gap-2"><Zap size={18} className="text-foodiz-gold" /> Suggestions IA pour vous</h3>
          <p className="text-[10px] text-foodiz-gray mb-4">Notre moteur vous propose des avantages cohérents avec votre solde. Foodiz garantit 100 points = 1€ de valeur réelle.</p>
          
          <div className="space-y-3">
            {advantages.map((adv, idx) => (
              <div key={idx} className={`foodiz-card p-4 flex justify-between items-center transition-all ${adv.canUnlock ? 'border-foodiz-green/30 bg-foodiz-green/5' : 'border-foodiz-gold/10'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-foodiz-cream font-bold text-sm">{adv.title}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-foodiz-black border border-foodiz-gold/20 text-foodiz-gold">{adv.points} pts</span>
                  </div>
                  <p className="text-foodiz-gray text-xs">{adv.desc}</p>
                </div>
                <div className="ml-4">
                  {adv.canUnlock ? (
                    <button className="px-3 py-2 rounded-xl bg-foodiz-green text-foodiz-black text-xs font-bold flex items-center gap-1 hover:bg-foodiz-green/80">
                      <Unlock size={12} /> Débloquer
                    </button>
                  ) : (
                    <button onClick={() => handleLock(adv)} className="px-3 py-2 rounded-xl bg-foodiz-black border border-foodiz-gold/30 text-foodiz-gold text-xs font-bold flex items-center gap-1 hover:bg-foodiz-gold/10">
                      <Lock size={12} /> Verrouiller
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}