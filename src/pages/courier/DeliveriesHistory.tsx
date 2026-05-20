import { useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle } from "lucide-react";

const HISTORY = [
  { id: "d1", restaurant: "Maison K", gain: 4.5, date: "Aujourd'hui · 18:20", km: "2.1 km", status: "Livrée" },
  { id: "d2", restaurant: "Sushi Ko", gain: 5.0, date: "Aujourd'hui · 16:50", km: "3.4 km", status: "Livrée" },
  { id: "d3", restaurant: "Marché Bio", gain: 3.5, date: "Hier · 20:10", km: "1.8 km", status: "Livrée" },
];

export default function DeliveriesHistoryPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-foodiz-black">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/courier")} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">Historique des livraisons</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-3">
        {HISTORY.map((delivery) => (
          <button key={delivery.id} onClick={() => navigate(`/courier/deliveries/${delivery.id}`)} className="w-full foodiz-card p-4 text-left hover:border-foodiz-gold/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-foodiz-green/10 border border-foodiz-green/20 flex items-center justify-center shrink-0">
                <CheckCircle size={16} className="text-foodiz-green" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foodiz-cream font-medium">{delivery.restaurant}</p>
                <p className="text-[10px] text-foodiz-gray mt-1">{delivery.date} · {delivery.km}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-foodiz-gold font-semibold">+{delivery.gain.toFixed(2).replace(".", ",")} €</p>
                <p className="text-[10px] text-foodiz-gray">{delivery.status}</p>
              </div>
            </div>
          </button>
        ))}
      </main>
    </div>
  );
}
