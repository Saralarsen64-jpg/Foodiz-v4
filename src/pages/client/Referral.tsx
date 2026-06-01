import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Share2, Copy, CheckCircle, Gift, ChevronLeft } from "lucide-react";

export default function ReferralPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    const getLink = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Récupérer le VRAI code généré par le trigger SQL
        const { data: profile } = await supabase.from('profiles').select('referral_code').eq('id', user.id).single();
        const realCode = profile?.referral_code || "FDZ-ERROR";
        setCode(realCode);
        
        // Utilise le vrai domaine du site
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
    <div className="min-h-screen bg-foodiz-black p-6 flex flex-col items-center justify-center text-center border-x-2 border-foodiz-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <button onClick={() => navigate("/client/account")} className="absolute top-6 left-6 text-foodiz-gold"><ChevronLeft size={24} /></button>

      <div className="w-20 h-20 rounded-full bg-foodiz-gold/10 flex items-center justify-center mb-6 border border-foodiz-gold/20">
        <Gift size={32} className="text-foodiz-gold" />
      </div>
      <h1 className="foodiz-title text-3xl text-foodiz-cream mb-2">Parrainez vos amis</h1>
      <p className="text-foodiz-gray text-sm mb-8 max-w-xs">
        Partagez votre code unique <span className="text-foodiz-gold font-bold">{code}</span>. Vos amis recevront un avantage et vous gagnerez des points Foodiz !
      </p>

      <div className="w-full max-w-sm foodiz-card p-2 flex items-center gap-2 border-foodiz-gold/30 mb-8 bg-[#0A0A0A]">
        <input 
          type="text" 
          readOnly 
          value={referralLink} 
          className="flex-1 bg-transparent text-foodiz-cream text-xs outline-none px-2 truncate font-mono"
        />
        <button 
          onClick={handleCopy}
          className="bg-foodiz-gold text-foodiz-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-foodiz-gold-light transition-colors shrink-0"
        >
          {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
          {copied ? "Copié !" : "Copier"}
        </button>
      </div>
    </div>
  );
}