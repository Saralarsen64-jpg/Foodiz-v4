import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, CreditCard } from "lucide-react";

export default function PaymentsPage() {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6"><ChevronLeft size={18} /> Compte</button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="foodiz-title text-2xl">Paiement</h1>
        <button className="w-8 h-8 rounded-full bg-foodiz-gold text-foodiz-black flex items-center justify-center"><Plus size={18} /></button>
      </div>
      <div className="foodiz-card p-4 flex items-center gap-4 border-foodiz-gold/30 mb-3">
        <div className="w-12 h-8 bg-foodiz-cream rounded flex items-center justify-center"><CreditCard size={16} className="text-foodiz-black" /></div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-foodiz-cream">Visa se terminant par 4242</h3>
          <p className="text-xs text-foodiz-gray mt-1">Expire le 12/25</p>
        </div>
        <span className="text-[10px] text-foodiz-gold border border-foodiz-gold/30 px-2 py-1 rounded">Par défaut</span>
      </div>
    </div>
  );
}
