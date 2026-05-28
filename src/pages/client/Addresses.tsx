import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, MapPin, Home, Briefcase } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

export default function AddressesPage() {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6"><ChevronLeft size={18} /> Compte</button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="foodiz-title text-2xl">Mes adresses</h1>
        <button className="w-8 h-8 rounded-full bg-foodiz-gold text-foodiz-black flex items-center justify-center"><Plus size={18} /></button>
      </div>
      <div className="space-y-3">
        <div className="foodiz-card p-4 flex items-start gap-4 border-foodiz-gold/30">
          <div className="w-10 h-10 rounded-full bg-foodiz-gold/10 flex items-center justify-center shrink-0"><Home size={18} className="text-foodiz-gold" /></div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foodiz-cream">Domicile</h3>
            <p className="text-xs text-foodiz-gray mt-1">24 rue Oberkampf, 75011 Paris</p>
          </div>
        </div>
        <div className="foodiz-card p-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-foodiz-gold/10 flex items-center justify-center shrink-0"><Briefcase size={18} className="text-foodiz-gold" /></div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foodiz-cream">Bureau</h3>
            <p className="text-xs text-foodiz-gray mt-1">12 avenue de la République, 75011 Paris</p>
          </div>
        </div>
      </div>
    </div>
  );
}
