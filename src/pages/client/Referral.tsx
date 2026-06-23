import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Copy, CheckCircle, Gift, ChevronLeft } from "lucide-react";

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
        const { data: profile } = await supabase.from('profiles').select('ref_code, referral_count').eq('id', user.id).single();
        const realCode = profile?.ref_code || "";
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
        Partagez votre code. Le parrainage est validé uniquement après la première commande payée et acceptée de votre filleul. Aucun point n'est crédité à la simple inscription.
      </p>

      {/* Zone de copie du lien */}
      <div className="w-full max-w-sm foodiz-card p-2 flex items-center gap-2 border-foodiz-gold/30 mb-10 bg-[#0A0A0A]">
        <input type="text" readOnly value={referralLink} className="flex-1 bg-transparent text-foodiz-cream text-xs outline-none px-2 truncate font-mono" />
        <button onClick={handleCopy} className="bg-foodiz-gold text-foodiz-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-foodiz-gold-light transition-colors shrink-0">
          {copied ? <CheckCircle size={14} /> : <Copy size={14} />} {copied ? "Copié !" : "Copier"}
        </button>
      </div>

      <div className="w-full max-w-sm foodiz-card p-6 bg-gradient-to-br from-foodiz-gold/5 to-foodiz-card border border-foodiz-gold/20 relative overflow-hidden">
        <p className="text-[10px] uppercase tracking-[0.2em] text-foodiz-gold">Parrainages validés</p>
        <p className="mt-3 text-4xl font-serif italic text-foodiz-cream">{referralCount}</p>
        <p className="mt-3 text-xs leading-relaxed text-foodiz-gray">Un parrainage passe en statut validé après le paiement puis l'acceptation de la première commande du filleul.</p>
      </div>
    </div>
  );
}
