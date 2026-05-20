import { useNavigate } from "react-router-dom";
import { ChevronLeft, Clock3 } from "lucide-react";

export default function CourierValidationStatus() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-foodiz-black pb-24">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/courier")} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">État de validation</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="foodiz-card p-6">
          <div className="flex items-center gap-3 mb-3"><Clock3 size={18} className="text-foodiz-gold" /><h2 className="foodiz-title text-lg">Dossier en attente</h2></div>
          <p className="text-sm text-foodiz-gray">Votre profil livreur est en cours de vérification.</p>
        </div>
      </main>
    </div>
  );
}
