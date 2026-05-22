import { useNavigate } from "react-router-dom";
import { ChevronLeft, MapPin, Navigation } from "lucide-react";

export default function DeliveryCurrent() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-foodiz-black pb-24">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/courier")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Livraison en cours</h1>
          <div className="w-6" />
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="foodiz-card p-8 text-center bg-[#0A0A0A] border-foodiz-gold/10">
          <MapPin size={48} className="mx-auto text-foodiz-gold mb-4" />
          <h2 className="foodiz-title text-xl mb-2">Aucune livraison active</h2>
          <p className="text-foodiz-gray text-sm mb-6">Acceptez une course pour commencer.</p>
          <button onClick={() => navigate("/courier/deliveries/available")} className="w-full foodiz-btn py-4 flex items-center justify-center gap-2"><Navigation size={18} /> Voir les courses disponibles</button>
        </div>
      </main>
    </div>
  );
}
