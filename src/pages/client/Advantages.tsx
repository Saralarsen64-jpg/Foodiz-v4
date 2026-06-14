import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Gift, Star, Trophy, Crown, Lock, Unlock, Zap, Hourglass } from "lucide-react";
import toast from "react-hot-toast";

export default function AdvantagesPage() {
  const navigate = useNavigate();
  const [points, setPoints] = useState(0);
  const [advantages, setAdvantages] = useState<any[]>([]);
  const [lockedAdvantage, setLockedAdvantage] = useState<any | null>(null); // Un seul avantage verrouillé
  const [rewards, setRewards] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fetchCatalog = async () => {
      const { data } = await supabase.from('advantage_catalog').select('valid_until').eq('is_active', true).order('generated_at', { ascending: false, nullsFirst: false }).limit(1);
      if (data && data.length > 0) {
        const validUntil = new Date(data[0].valid_until).getTime();
        const updateTimer = () => {
          const now = new Date().getTime();
          const distance = validUntil - now;
          if (distance < 0) setTimeLeft("Renouvellement...");
          else {
            const hours = Math.floor(distance / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
          }
        };
        updateTimer();
        const timerInterval = setInterval(updateTimer, 1000);
        return () => clearInterval(timerInterval);
      }
    };
    fetchCatalog();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: wallet } = await supabase.from('client_wallets').select('points_balance').eq('user_id', user.id).single();
        if (wallet) setPoints(wallet.points_balance || 0);

        const { data: advs } = await supabase.from('advantage_catalog').select('*').eq('is_active', true).order('points_cost');
        if (advs) setAdvantages(advs);

        // Récupérer L'UNIQUE avantage verrouillé
        const { data: locked } = await supabase.from('client_locked_advantages').select('*').eq('user_id', user.id).limit(1).maybeSingle();
        if (locked) setLockedAdvantage(locked);

        const { data: rewardRows } = await supabase.from('client_rewards').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (rewardRows) setRewards(rewardRows);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleLock = async (adv: any) => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: newLock, error } = await supabase.from('client_locked_advantages').upsert({
        user_id: user.id, catalog_id: adv.id, title: adv.title, description: adv.description, points_cost: adv.points_cost
      }, { onConflict: 'user_id' }).select().single();
      if (error) toast.error("Impossible de verrouiller cet avantage.");
      else {
        setLockedAdvantage(newLock);
        toast.success("Avantage verrouillé pour vous.");
      }
    }
    setBusy(false);
  };

  const handleUnlock = async () => {
    if (lockedAdvantage) {
      await supabase.from('client_locked_advantages').delete().eq('id', lockedAdvantage.id);
      setLockedAdvantage(null);
      toast.success("Avantage déverrouillé.");
    }
  };

  const redeemAdvantage = async () => {
    if (!lockedAdvantage || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('redeem_locked_advantage');
    if (error || !data) {
      toast.error(error?.message.includes("Insufficient") ? "Votre solde de points est insuffisant." : "Cet avantage n'est plus disponible.");
      setBusy(false);
      return;
    }
    const reward = Array.isArray(data) ? data[0] : data;
    setPoints((current) => current - lockedAdvantage.points_cost);
    setRewards((current) => [reward, ...current]);
    setLockedAdvantage(null);
    toast.success("Votre récompense Foodiz est débloquée.");
    setBusy(false);
  };

  const currentTier = points >= 5000 ? { name: "Platinum", icon: Crown, color: "text-foodiz-cream" } : points >= 1500 ? { name: "Gold", icon: Trophy, color: "text-foodiz-gold" } : { name: "Membre", icon: Star, color: "text-gray-400" };

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
            <p className="text-foodiz-gray text-sm">points fidélité disponibles</p>
            <div className={`mt-4 text-sm font-bold flex items-center justify-center gap-2 ${currentTier.color}`}>
              <currentTier.icon size={16} /> Statut {currentTier.name}
            </div>
          </div>
          <Gift size={120} className="absolute -bottom-4 -right-4 text-foodiz-gold/5 rotate-12" />
        </div>

        {/* Compte à rebours */}
        <div className="foodiz-card p-4 bg-[#0A0A0A] border-foodiz-gold/20 flex items-center justify-center gap-3">
          <Hourglass size={18} className="text-foodiz-gold animate-pulse" />
          <div className="text-center">
            <p className="text-[10px] text-foodiz-gray uppercase tracking-widest">Nouveaux avantages dans</p>
            <p className="text-foodiz-cream font-mono text-lg font-bold">{timeLeft}</p>
          </div>
        </div>

        {/* Avantage Verrouillé (Unique) */}
        {lockedAdvantage && (
          <div>
            <h3 className="foodiz-title text-lg mb-4 flex items-center gap-2 text-foodiz-gold"><Lock size={18} /> Mon Avantage Verrouillé</h3>
            <div className="foodiz-card p-4 bg-[#0A0A0A] border-foodiz-gold/20 flex justify-between items-center">
              <div>
                <p className="text-foodiz-cream font-bold text-sm">{lockedAdvantage.title}</p>
                <p className="text-foodiz-gray text-xs">{lockedAdvantage.description}</p>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <p className="text-foodiz-gold font-bold text-sm">{lockedAdvantage.points_cost} pts</p>
                {points >= lockedAdvantage.points_cost ? (
                  <button disabled={busy} onClick={redeemAdvantage} className="px-3 py-1 rounded-lg bg-foodiz-green text-foodiz-black text-[10px] font-bold disabled:opacity-50">{busy ? "Patientez..." : "Débloquer"}</button>
                ) : (
                  <button onClick={handleUnlock} className="px-3 py-1 rounded-lg bg-foodiz-red/10 text-foodiz-red border border-foodiz-red/20 text-[10px] font-bold">Déverrouiller</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Catalogue */}
        <div>
          <h3 className="foodiz-title text-lg mb-4 flex items-center gap-2"><Zap size={18} className="text-foodiz-gold" /> Avantages du cycle actuel</h3>
          <div className="space-y-3">
            {advantages.map((adv) => {
              const isLocked = lockedAdvantage?.catalog_id === adv.id;
              const canUnlock = points >= adv.points_cost;
              
              return (
                <div key={adv.id} className={`foodiz-card p-4 flex justify-between items-center transition-all ${isLocked ? 'border-foodiz-gold bg-foodiz-gold/5' : 'border-foodiz-gold/10'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-foodiz-cream font-bold text-sm">{adv.title}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-foodiz-black border border-foodiz-gold/20 text-foodiz-gold">{adv.points_cost} pts</span>
                    </div>
                    <p className="text-foodiz-gray text-xs">{adv.description}</p>
                  </div>
                  <div className="ml-4">
                    {isLocked ? (
                      <span className="text-[10px] text-foodiz-gold font-bold px-3 py-2">Verrouillé</span>
                    ) : canUnlock ? (
                      <button disabled={busy} onClick={() => handleLock(adv)} className="px-3 py-2 rounded-xl bg-foodiz-green text-foodiz-black text-xs font-bold flex items-center gap-1 hover:bg-foodiz-green/80 disabled:opacity-50">
                        <Unlock size={12} /> Débloquer
                      </button>
                    ) : (
                      <button disabled={busy} onClick={() => handleLock(adv)} className="px-3 py-2 rounded-xl bg-foodiz-black border border-foodiz-gold/30 text-foodiz-gold text-xs font-bold flex items-center gap-1 hover:bg-foodiz-gold/10 disabled:opacity-50">
                        <Lock size={12} /> Verrouiller
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="foodiz-title text-lg mb-4 flex items-center gap-2"><Gift size={18} className="text-foodiz-gold" /> Mes récompenses</h3>
          {rewards.length === 0 ? <div className="foodiz-card p-5 text-center text-xs text-foodiz-gray">Aucune récompense débloquée pour le moment.</div> : <div className="space-y-3">{rewards.map((reward) => <div key={reward.id} className="foodiz-card p-4 border-foodiz-gold/15"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-foodiz-cream">{reward.title}</p><p className="text-xs text-foodiz-gray mt-1">{reward.description}</p></div><span className={`text-[9px] uppercase px-2 py-1 rounded-full border ${reward.status === 'active' ? 'text-foodiz-green border-foodiz-green/20 bg-foodiz-green/5' : 'text-foodiz-gray border-white/10'}`}>{reward.status === 'active' ? 'Disponible' : reward.status}</span></div><div className="mt-3 flex items-center justify-between"><code className="text-xs text-foodiz-gold tracking-wider">{reward.reward_code}</code><span className="text-[10px] text-foodiz-gray">Expire le {new Date(reward.expires_at).toLocaleDateString('fr-FR')}</span></div></div>)}</div>}
        </div>
      </main>
    </div>
  );
}
