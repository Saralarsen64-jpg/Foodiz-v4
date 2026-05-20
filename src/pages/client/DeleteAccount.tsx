import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, AlertTriangle } from "lucide-react";

export default function DeleteAccountPage() {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleDelete = () => {
    setDeleted(true);
    localStorage.clear();
    window.setTimeout(() => navigate("/auth"), 1200);
  };

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
        <ChevronLeft size={18} /> Retour
      </button>

      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-foodiz-red/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-foodiz-red" />
        </div>
        <h1 className="foodiz-title text-2xl mb-2">Supprimer mon compte</h1>
        <p className="text-foodiz-gray text-sm">Cette action est irréversible.</p>
      </div>

      <div className="foodiz-card p-5 mb-6 space-y-3 border-foodiz-red/20">
        <p className="text-sm text-foodiz-cream">En supprimant votre compte :</p>
        <ul className="space-y-2">
          {[
            "Toutes vos données personnelles seront effacées",
            "Votre historique de commandes sera perdu",
            "Vos points Foodiz seront définitivement perdus",
            "Vos avantages et parrainages seront annulés",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-foodiz-gray">
              <span className="text-foodiz-red mt-0.5">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <label className="flex items-center gap-3 mb-6 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="w-4 h-4 rounded border-foodiz-gold/30 bg-foodiz-card accent-foodiz-gold"
        />
        <span className="text-xs text-foodiz-cream">Je comprends et je souhaite supprimer définitivement mon compte</span>
      </label>

      <button
        disabled={!confirmed || deleted}
        onClick={handleDelete}
        className={`w-full py-4 rounded-xl text-sm font-semibold transition-all ${
          confirmed && !deleted
            ? "bg-foodiz-red text-white hover:bg-foodiz-red/90"
            : "bg-foodiz-red/20 text-foodiz-red/50 cursor-not-allowed"
        }`}
      >
        {deleted ? "Compte supprimé" : "Supprimer définitivement mon compte"}
      </button>
    </div>
  );
}
