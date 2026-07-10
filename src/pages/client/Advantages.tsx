import { useCallback, useState, useEffect } from "react";
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
  const [cycleExpiresAt, setCycleExpiresAt] = useState<number | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const fetchCycle = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const response = await fetch('/api/rotate-advantages', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Catalogue indisponible");
      setAdvantages(payload.offers || []);
      setCycleExpiresAt(payload.validUntil ? new Date(payload.validUntil).getTime() : null);
      setCatalogError(payload.offers?.length === 6 ? "" : "Le catalogue Weello Club est en cours de synchronisation.");
    } catch {
      setCatalogError("Impossible d'actualiser les avantages pour le moment.");
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: wallet } = await supabase.from('client_wallets').select('points_balance').eq('user_id', user.id).single();
        if (wallet) setPoints(wallet.points_balance || 0);

        // Récupérer L'UNIQUE avantage verrouillé
        const { data: locked } = await supabase.from('client_locked_advantages').select('*').eq('user_id', user.id).limit(1).maybeSingle();
        if (locked) setLockedAdvantage(locked);

        const { data: rewardRows } = await supabase.from('client_rewards').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (rewardRows) setRewards(rewardRows);
      }
      await fetchCycle();
      setLoading(false);
    };
    void fetchData();
  }, [fetchCycle]);

  useEffect(() => {
    if (!cycleExpiresAt) {
      setTimeLeft("Synchronisation...");
      return;
    }
    let refreshRequested = false;
    const updateTimer = () => {
      const distance = cycleExpiresAt - Date.now();
      if (distance <= 0) {
        setTimeLeft("Renouvellement...");
        if (!refreshRequested) {
          refreshRequested = true;
          void fetchCycle();
        }
        return;
      }
      const hours = Math.floor(distance / 3600000);
      const minutes = Math.floor((distance % 3600000) / 60000);
      const seconds = Math.floor((distance % 60000) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };
    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [cycleExpiresAt, fetchCycle]);

  useEffect(() => {
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') void fetchCycle(); };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => document.removeEventListener('visibilitychange', refreshWhenVisible);
  }, [fetchCycle]);

  const handleLock = async (adv: any) => {
    if (!cycleExpiresAt || cycleExpiresAt <= Date.now()) {
      toast.error("Ce cycle vient d'expirer. Actualisation en cours.");
      await fetchCycle();
      return;
    }
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

  const currentTier = points >= 5000 ? { name: "Platinum", icon: Crown, color: "text-weello-cream" } : points >= 1500 ? { name: "Gold", icon: Trophy, color: "text-weello-gold" } : { name: "Membre", icon: Star, color: "text-gray-400" };

  return (
    <div className="min-h-screen bg-weello-black pb-24 animate-fade-in-up border-x-2 border-weello-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />
      
      <header className="bg-weello-card border-b border-weello-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/client/account")} className="text-weello-gold"><ChevronLeft size={24} /></button>
          <h1 className="weello-title text-lg">Weello Club</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* Wallet Card */}
        <div className="weello-card p-8 bg-gradient-to-br from-weello-gold/20 to-weello-card border border-weello-gold/30 text-center relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-weello-gold text-xs uppercase tracking-widest font-bold mb-2">Mon Solde Weello</p>
            {loading ? <div className="text-4xl font-serif italic text-weello-cream animate-pulse">...</div> : <div className="text-5xl font-serif italic text-weello-cream mb-2">{points.toLocaleString('fr-FR')}</div>}
            <p className="text-weello-gray text-sm">points fidélité disponibles</p>
            <div className={`mt-4 text-sm font-bold flex items-center justify-center gap-2 ${currentTier.color}`}>
              <currentTier.icon size={16} /> Statut {currentTier.name}
            </div>
          </div>
          <Gift size={120} className="absolute -bottom-4 -right-4 text-weello-gold/5 rotate-12" />
        </div>

        {/* Compte à rebours */}
        <div className="weello-card p-4 bg-[#0A0A0A] border-weello-gold/20 flex items-center justify-center gap-3">
          <Hourglass size={18} className="text-weello-gold animate-pulse" />
          <div className="text-center">
            <p className="text-[10px] text-weello-gray uppercase tracking-widest">Nouveaux avantages dans</p>
            <p className="text-weello-cream font-mono text-lg font-bold">{timeLeft}</p>
          </div>
        </div>

        {/* Avantage Verrouillé (Unique) */}
        {lockedAdvantage && (
          <div>
            <h3 className="weello-title text-lg mb-4 flex items-center gap-2 text-weello-gold"><Lock size={18} /> Mon Avantage Verrouillé</h3>
            <div className="weello-card p-4 bg-[#0A0A0A] border-weello-gold/20 flex justify-between items-center">
              <div>
                <p className="text-weello-cream font-bold text-sm">{lockedAdvantage.title}</p>
                <p className="text-weello-gray text-xs">{lockedAdvantage.description}</p>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <p className="text-weello-gold font-bold text-sm">{lockedAdvantage.points_cost} pts</p>
                {points >= lockedAdvantage.points_cost ? (
                  <button onClick={() => navigate('/client/cart')} className="px-3 py-1 rounded-lg bg-weello-green text-weello-black text-[10px] font-bold">Utiliser au paiement</button>
                ) : (
                  <button onClick={handleUnlock} className="px-3 py-1 rounded-lg bg-weello-red/10 text-weello-red border border-weello-red/20 text-[10px] font-bold">Déverrouiller</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Catalogue */}
        <div>
          <h3 className="weello-title text-lg mb-4 flex items-center gap-2"><Zap size={18} className="text-weello-gold" /> Avantages du cycle actuel</h3>
          {catalogError && <div className="weello-card mb-3 border-weello-red/20 bg-weello-red/5 p-4 text-center text-xs text-weello-red">{catalogError}</div>}
          {!catalogError && advantages.length === 0 && <div className="weello-card p-5 text-center text-xs text-weello-gray">Synchronisation des avantages...</div>}
          <div className="space-y-3">
            {advantages.map((adv) => {
              const isLocked = lockedAdvantage?.catalog_id === adv.id;
              const canUnlock = points >= adv.points_cost;
              
              return (
                <div key={adv.id} className={`weello-card p-4 flex justify-between items-center transition-all ${isLocked ? 'border-weello-gold bg-weello-gold/5' : 'border-weello-gold/10'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-weello-cream font-bold text-sm">{adv.title}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-weello-black border border-weello-gold/20 text-weello-gold">{adv.points_cost} pts</span>
                    </div>
                    <p className="text-weello-gray text-xs">{adv.description}</p>
                  </div>
                  <div className="ml-4">
                    {isLocked ? (
                      <span className="text-[10px] text-weello-gold font-bold px-3 py-2">Verrouillé</span>
                    ) : canUnlock ? (
                      <button disabled={busy} onClick={() => handleLock(adv)} className="px-3 py-2 rounded-xl bg-weello-green text-weello-black text-xs font-bold flex items-center gap-1 hover:bg-weello-green/80 disabled:opacity-50">
                        <Unlock size={12} /> Débloquer
                      </button>
                    ) : (
                      <button disabled={busy} onClick={() => handleLock(adv)} className="px-3 py-2 rounded-xl bg-weello-black border border-weello-gold/30 text-weello-gold text-xs font-bold flex items-center gap-1 hover:bg-weello-gold/10 disabled:opacity-50">
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
          <h3 className="weello-title text-lg mb-4 flex items-center gap-2"><Gift size={18} className="text-weello-gold" /> Mes récompenses</h3>
          {rewards.length === 0 ? <div className="weello-card p-5 text-center text-xs text-weello-gray">Aucune récompense débloquée pour le moment.</div> : <div className="space-y-3">{rewards.map((reward) => <div key={reward.id} className="weello-card p-4 border-weello-gold/15"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-weello-cream">{reward.title}</p><p className="text-xs text-weello-gray mt-1">{reward.description}</p></div><span className={`text-[9px] uppercase px-2 py-1 rounded-full border ${reward.status === 'active' ? 'text-weello-green border-weello-green/20 bg-weello-green/5' : 'text-weello-gray border-white/10'}`}>{reward.status === 'active' ? 'Disponible' : reward.status}</span></div><div className="mt-3 flex items-center justify-between"><code className="text-xs text-weello-gold tracking-wider">{reward.reward_code}</code><span className="text-[10px] text-weello-gray">Expire le {new Date(reward.expires_at).toLocaleDateString('fr-FR')}</span></div></div>)}</div>}
        </div>
      </main>
    </div>
  );
}
