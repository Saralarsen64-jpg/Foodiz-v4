import { useNavigate } from "react-router-dom";
import { ChevronLeft, Users, Share2, Copy, Check, Gift } from "lucide-react";
import { useState } from "react";
import GoldIcon from "../../components/GoldIcon";

export default function ReferralPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const referralLink = "https://foodiz.app/r/ALEX123";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
        <ChevronLeft size={18} /> Retour
      </button>

      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-foodiz-gradient-gold flex items-center justify-center mx-auto mb-4 border border-foodiz-gold/30">
          <GoldIcon icon={Users} size={28} />
        </div>
        <h1 className="foodiz-title text-2xl mb-2">Parrainage</h1>
        <p className="text-foodiz-gray text-sm">Invitez vos amis et gagnez des points</p>
      </div>

      <div className="foodiz-card p-6 mb-6 bg-foodiz-gradient-gold border-foodiz-gold/20 text-center">
        <Gift size={32} className="mx-auto text-foodiz-gold mb-3" />
        <p className="foodiz-title text-xl text-foodiz-gold">500 points</p>
        <p className="text-foodiz-gray text-xs mt-1">par ami invité qui passe sa première commande</p>
      </div>

      <div className="foodiz-card p-5 mb-6">
        <p className="text-xs text-foodiz-gray mb-3">Votre lien de parrainage</p>
        <div className="flex items-center gap-2 bg-foodiz-black rounded-xl p-3 border border-foodiz-gold/10">
          <code className="flex-1 text-foodiz-gold text-xs font-mono truncate">{referralLink}</code>
          <button
            onClick={copyLink}
            className="w-8 h-8 rounded-lg bg-foodiz-gold text-foodiz-black flex items-center justify-center hover:bg-foodiz-gold-light transition-all"
          >
            {copied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      <button className="w-full foodiz-btn flex items-center justify-center gap-2 mb-6">
        <Share2 size={18} />
        Partager mon lien
      </button>

      <div className="foodiz-card p-5">
        <h3 className="text-sm font-medium text-foodiz-cream mb-3">Mes filleuls</h3>
        <div className="text-center py-6">
          <Users size={32} className="mx-auto text-foodiz-gold/30 mb-2" />
          <p className="text-foodiz-gray text-xs">Aucun ami invité pour le moment</p>
          <p className="text-[10px] text-foodiz-gray/50 mt-1">Partagez votre lien pour commencer à gagner des points</p>
        </div>
      </div>
    </div>
  );
}
