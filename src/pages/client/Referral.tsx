import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Copy, CheckCircle, Gift, ChevronLeft, Users, Sparkles } from "lucide-react";
import InfoHint from "../../components/InfoHint";

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
    <div className="min-h-screen bg-weello-black p-6 flex flex-col items-center text-center border-x-2 border-weello-gold/20 relative pb-24">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />
      
      <button onClick={() => navigate("/client/account")} className="absolute top-6 left-6 text-weello-gold"><ChevronLeft size={24} /></button>

      <div className="w-20 h-20 rounded-full bg-weello-gold/10 flex items-center justify-center mb-6 border border-weello-gold/20 mt-8">
        <Gift size={32} className="text-weello-gold" />
      </div>
      
      <h1 className="weello-title text-3xl text-weello-cream mb-2">Parrainage Weello</h1>
      <p className="text-weello-gray text-sm mb-6 max-w-xs mx-auto">Invitez vos proches et gagnez des points.</p>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3 mb-7">
        <div className="weello-card p-4 text-left border-weello-gold/25"><span className="flex justify-between"><Sparkles size={18} className="text-weello-gold"/><InfoHint label="Conditions du parrainage">Les points sont ajoutés après la première commande validée de votre proche.</InfoHint></span><p className="mt-3 text-2xl font-serif italic text-weello-cream">500</p><p className="text-[10px] uppercase tracking-wider text-weello-gray">points par parrainage</p></div>
        <div className="weello-card p-4 text-left border-weello-gold/15"><Users size={18} className="text-weello-gold"/><p className="mt-3 text-2xl font-serif italic text-weello-cream">{referralCount}</p><p className="text-[10px] uppercase tracking-wider text-weello-gray">parrainages validés</p></div>
      </div>

      {/* Zone de copie du lien */}
      <div className="w-full max-w-sm weello-card p-2 flex items-center gap-2 border-weello-gold/30 mb-10 bg-[#0A0A0A]">
        <input type="text" readOnly value={referralLink} className="flex-1 bg-transparent text-weello-cream text-xs outline-none px-2 truncate font-mono" />
        <button onClick={handleCopy} className="bg-weello-gold text-weello-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-weello-gold-light transition-colors shrink-0">
          {copied ? <CheckCircle size={14} /> : <Copy size={14} />} {copied ? "Copié !" : "Copier"}
        </button>
      </div>

      <p className="max-w-sm text-[11px] leading-relaxed text-weello-gray">Les 500 points sont ajoutés après la première commande validée de votre proche.</p>
    </div>
  );
}
