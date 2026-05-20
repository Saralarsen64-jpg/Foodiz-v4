import { useNavigate } from "react-router-dom";
import { ChevronLeft, HelpCircle, MessageCircle, ChevronRight, Mail } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

export default function HelpPage() {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
        <ChevronLeft size={18} /> Retour
      </button>

      <h1 className="foodiz-title text-2xl mb-6">Nous contacter</h1>

      <div className="foodiz-card p-5 mb-4">
        <p className="text-sm text-foodiz-cream mb-2">Une question ? Un problème ?</p>
        <p className="text-xs text-foodiz-gray">Notre équipe vous répond sous 24h ouvrées.</p>
      </div>

      <div className="space-y-3">
        <button onClick={() => navigate("/client/help-center")} className="w-full foodiz-card p-4 flex items-center gap-3 text-left hover:border-foodiz-gold/30 transition-all">
          <GoldIcon icon={MessageCircle} size={18} />
          <div className="flex-1">
            <p className="text-sm text-foodiz-cream">Contacter le support</p>
            <p className="text-[10px] text-foodiz-gray mt-0.5">Passer par l’assistant intelligent</p>
          </div>
          <ChevronRight size={14} className="text-foodiz-gold/30" />
        </button>

        <a href="mailto:support@foodiz.fr" className="w-full foodiz-card p-4 flex items-center gap-3 text-left hover:border-foodiz-gold/30 transition-all block">
          <GoldIcon icon={Mail} size={18} />
          <div className="flex-1">
            <p className="text-sm text-foodiz-cream">Écrire par e-mail</p>
            <p className="text-[10px] text-foodiz-gray mt-0.5">support@foodiz.fr</p>
          </div>
          <ChevronRight size={14} className="text-foodiz-gold/30" />
        </a>

        <button onClick={() => navigate("/client/help-center")} className="w-full foodiz-card p-4 flex items-center gap-3 text-left hover:border-foodiz-gold/30 transition-all">
          <GoldIcon icon={HelpCircle} size={18} />
          <div className="flex-1">
            <p className="text-sm text-foodiz-cream">Centre d'aide</p>
            <p className="text-[10px] text-foodiz-gray mt-0.5">Consultez notre FAQ</p>
          </div>
          <ChevronRight size={14} className="text-foodiz-gold/30" />
        </button>
      </div>
    </div>
  );
}
