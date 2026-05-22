import { useNavigate } from "react-router-dom";
import { ChevronLeft, AlertTriangle } from "lucide-react";

export default function DeleteAccountPage() {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6"><ChevronLeft size={18} /> Compte</button>
      <div className="foodiz-card p-6 border-foodiz-red/30 bg-foodiz-red/5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={24} className="text-foodiz-red" />
          <h1 className="foodiz-title text-xl text-foodiz-red">Zone de danger</h1>
        </div>
        <p className="text-sm text-foodiz-gray mb-6">La suppression de votre compte est irréversible. Vous perdrez tous vos points Foodiz et votre historique.</p>
        <button className="w-full py-4 rounded-2xl bg-foodiz-red text-foodiz-black font-bold text-sm hover:bg-foodiz-red/80 transition-all">Supprimer définitivement mon compte</button>
      </div>
    </div>
  );
}
