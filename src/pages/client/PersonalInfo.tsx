import { useNavigate } from "react-router-dom";
import { ChevronLeft, Save } from "lucide-react";

export default function PersonalInfoPage() {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6"><ChevronLeft size={18} /> Compte</button>
      <h1 className="foodiz-title text-2xl mb-6">Informations personnelles</h1>
      <div className="space-y-4">
        <div className="foodiz-card p-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gray">Prénom</label>
          <input type="text" defaultValue="Alexandre" className="w-full bg-transparent border-none text-foodiz-cream outline-none mt-1 text-sm" />
        </div>
        <div className="foodiz-card p-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gray">Nom</label>
          <input type="text" defaultValue="Martin" className="w-full bg-transparent border-none text-foodiz-cream outline-none mt-1 text-sm" />
        </div>
        <div className="foodiz-card p-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gray">Email</label>
          <input type="email" defaultValue="alex.martin@email.com" className="w-full bg-transparent border-none text-foodiz-cream outline-none mt-1 text-sm" />
        </div>
        <div className="foodiz-card p-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gray">Téléphone</label>
          <input type="tel" defaultValue="+33 6 12 34 56 78" className="w-full bg-transparent border-none text-foodiz-cream outline-none mt-1 text-sm" />
        </div>
      </div>
      <button className="w-full foodiz-btn py-4 mt-6 flex items-center justify-center gap-2"><Save size={18} /> Enregistrer les modifications</button>
    </div>
  );
}
