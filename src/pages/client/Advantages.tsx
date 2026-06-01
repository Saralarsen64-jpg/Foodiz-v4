import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Gift, Star, Trophy, Crown } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

export default function AdvantagesPage() {
  const navigate = useNavigate();
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoints = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: wallet } = await supabase.from('client_wallets').select('points_balance').eq('user_id', user.id).single();
        if (wallet) setPoints(wallet.points_balance || 0);
      }
      setLoading(false);
    };
    fetchPoints();
  }, []);

  const tiers = [
    { name: "Membre", icon: Star, min: 0, color: "text-gray-400", desc: "Bienvenue dans le club !" },
    { name: "Gold", icon: Trophy, min: 5000, color: "text-foodiz-gold", desc: "Livraisons offertes dès 20€." },
    { name: "Platinum", icon: Crown, min: 15000, color: "text-foodiz-cream", desc: "Accès prioritaire et cadeaux exclusifs." },
  ];

  const currentTier = tiers.slice().reverse().find(t => points >= t.min) || tiers[0];

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up border-x-2 border-foodiz-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/client/account")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Mes Avantages</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* Wallet Card */}
        <div className="foodiz-card p-8 bg-gradient-to-br from-foodiz-gold/20 to-foodiz-card border border-foodiz-gold/30 text-center relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-foodiz-gold text-xs uppercase tracking-widest font-bold mb-2">Solde actuel</p>
            {loading ? (
              <div className="text-4xl font-serif italic text-foodiz-cream animate-pulse">...</div>
            ) : (
              <div className="text-5xl font-serif italic text-foodiz-cream mb-2">{points.toLocaleString('fr-FR')}</div>
            )}
            <p className="text-foodiz-gray text-sm">points Foodiz</p>
          </div>
          <Gift size={120} className="absolute -bottom-4 -right-4 text-foodiz-gold/5 rotate-12" />
        </div>

        {/* Status */}
        <div className="text-center">
          <p className="text-foodiz-gray text-xs uppercase tracking-widest mb-2">Votre statut actuel</p>
          <div className={`text-2xl font-serif italic flex items-center justify-center gap-2 ${currentTier.color}`}>
            <currentTier.icon size={24} /> {currentTier.name}
          </div>
          <p className="text-foodiz-gray text-xs mt-2">{currentTier.desc}</p>
        </div>

        {/* Rules (Simplifiées comme demandé) */}
        <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/10">
          <h3 className="foodiz-title text-lg mb-4">Comment ça marche ?</h3>
          <ul className="space-y-4 text-sm text-foodiz-gray">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-foodiz-gold/10 text-foodiz-gold flex items-center justify-center shrink-0 text-xs font-bold">1</span>
              <span>1€ dépensé = 10 points gagnés après livraison.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-foodiz-gold/10 text-foodiz-gold flex items-center justify-center shrink-0 text-xs font-bold">2</span>
              <span>100 points = 1€ de réduction sur vos prochaines commandes.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-foodiz-gold/10 text-foodiz-gold flex items-center justify-center shrink-0 text-xs font-bold">3</span>
              <span>Atteignez 5000 points pour passer membre Gold.</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}