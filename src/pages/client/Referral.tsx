import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Share2, Copy, CheckCircle, Gift, ChevronLeft, Crown, Lock } from "lucide-react";

export default function ReferralPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState("");
  const [code, setCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    const getLink = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('referral_code, referral_count').eq('id', user.id).single();
        const realCode = profile?.referral_code || "FDZ-ERROR";
        const count = profile?.referral_count || 0;
        
        setCode(realCode);
        setReferralCount(count);
        
        const origin = window.location.origin; 
        setReferralLink(`${origin}/auth/signup?role=client&ref=${realCode}`);
      }
    };
    getLink();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isVipUnlocked = referralCount >= 1000;
  const progressPercent = Math.min((referralCount / 1000) * 100, 100);

  return (
    <div className="min-h-screen bg-foodiz-black p-6 flex flex-col items-center text-center border-x-2 border-foodiz-gold/20 relative pb-24">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <button onClick={() => navigate("/client/account")} className="absolute top-6 left-6 text-foodiz-gold"><ChevronLeft size={24} /></button>

      <div className="w-20 h-20 rounded-full bg-foodiz-gold/10 flex items-center justify-center mb-6 border border-foodiz-gold/20 mt-8">
        <Gift size={32} className="text-foodiz-gold" />
      </div>
      
      <h1 className="foodiz-title text-3xl text-foodiz-cream mb-2">Parrainage Foodiz</h1>
      <p className="text-foodiz-gray text-sm mb-8 max-w-xs mx-auto">
        Partagez votre code. Pour chaque ami inscrit, vous gagnez <span className="text-foodiz-gold font-bold">500 points</span> et votre ami gagne <span className="text-foodiz-gold font-bold">500 points</span>.
      </p>

      {/* Zone de copie du lien */}
      <div className="w-full max-w-sm foodiz-card p-2 flex items-center gap-2 border-foodiz-gold/30 mb-10 bg-[#0A0A0A]">
        <input type="text" readOnly value={referralLink} className="flex-1 bg-transparent text-foodiz-cream text-xs outline-none px-2 truncate font-mono" />
        <button onClick={handleCopy} className="bg-foodiz-gold text-foodiz-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-foodiz-gold-light transition-colors shrink-0">
          {copied ? <CheckCircle size={14} /> : <Copy size={14} />} {copied ? "Copié !" : "Copier"}
        </button>
      </div>

      {/* Barre de progression VIP MYSTÈRE */}
      <div className="w-full max-w-sm foodiz-card p-6 bg-gradient-to-br from-foodiz-gold/5 to-foodiz-card border border-foodiz-gold/20 relative overflow-hidden">
        <div className="flex items-center justify-center gap-2 mb-4 text-foodiz-gold">
          {isVipUnlocked ? <Crown size={24} className="animate-pulse" /> : <Lock size={20} />}
          <h2 className="foodiz-title text-lg">{isVipUnlocked ? "Statut VIP Débloqué !" : "Objectif Elite Foodiz"}</h2>
        </div>

        <div className="w-full bg-foodiz-black rounded-full h-4 mb-2 border border-foodiz-gold/20 overflow-hidden">
          <div className="bg-foodiz-gold h-4 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <p className="text-[10px] text-foodiz-gray uppercase tracking-widest mb-6">{referralCount} / 1000 parrainages</p>

        {isVipUnlocked ? (
          <div className="p-4 rounded-xl bg-foodiz-gold/10 border border-foodiz-gold/40 animate-fade-in-up">
            <p className="text-foodiz-cream text-sm font-serif italic leading-relaxed">
              "Félicitations. Vous avez atteint le sommet de l'élite Foodiz. Une expérience mystérieuse, exclusive et inoubliable vous attend. Notre conciergerie privée vous contactera discrètement sous 48h."
            </p>
          </div>
        ) : (
          <p className="text-foodiz-gray text-xs leading-relaxed">
            Atteignez 1000 parrainages pour débloquer l'expérience ultime réservée à nos contributeurs les plus exceptionnels. Le mystère reste entier... pour l'instant.
          </p>
        )}
      </div>
    </div>
  );
}