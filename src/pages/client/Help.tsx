import { useNavigate } from "react-router-dom";
import { ChevronLeft, MessageCircle, ChevronRight } from "lucide-react";

export default function HelpPage() {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-weello-gold text-sm mb-6"><ChevronLeft size={18} /> Compte</button>
      <h1 className="weello-title text-2xl mb-6">Aide & Support</h1>
      <button onClick={() => navigate("/client/help-center")} className="w-full weello-card p-5 flex items-center justify-between mb-6 border-weello-gold/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-weello-gold/10 flex items-center justify-center"><MessageCircle size={20} className="text-weello-gold" /></div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-weello-cream">Contacter le support</h3>
            <p className="text-xs text-weello-gray mt-1">Diagnostic guidé puis transmission à notre équipe si nécessaire.</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-weello-gold" />
      </button>
      <div className="space-y-2">
        <h2 className="weello-title text-sm mb-3">Questions fréquentes</h2>
        {["Comment suivre ma commande ?", "Comment utiliser un avantage ?", "Que faire si un paiement reste en attente ?"].map((q, i) => (
          <button key={i} onClick={() => navigate('/client/help-center')} className="w-full weello-card p-4 flex justify-between items-center text-left">
            <span className="text-sm text-weello-cream">{q}</span>
            <ChevronRight size={16} className="text-weello-gold/50" />
          </button>
        ))}
      </div>
    </div>
  );
}
