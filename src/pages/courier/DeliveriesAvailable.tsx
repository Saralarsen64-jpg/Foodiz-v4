import { useNavigate } from "react-router-dom";
import { Bike, MapPin, Clock } from "lucide-react";

const DELIVERIES = [
  { id: "d1", restaurant: "Maison K", address: "15 Rue de la Roquette", distance: "1,2 km", gain: 4.50, time: "15 min", client: "Alexandre" },
  { id: "d2", restaurant: "Sushi Ko", address: "8 Rue Sainte-Anne", distance: "2,1 km", gain: 5.00, time: "20 min", client: "Marie" },
  { id: "d3", restaurant: "Marché Bio", address: "22 Rue des Martyrs", distance: "0,8 km", gain: 3.50, time: "10 min", client: "Julien" },
];

export default function DeliveriesAvailable() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-foodiz-black">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto">
          <h1 className="foodiz-title text-lg">Livraisons disponibles</h1>
          <p className="text-foodiz-gray text-[10px] mt-0.5">3 courses près de chez vous</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-3">
        {DELIVERIES.map((d) => (
          <div key={d.id} className="foodiz-card p-4 hover:border-foodiz-gold/30 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-foodiz-cream">{d.restaurant}</h3>
                <p className="text-[10px] text-foodiz-gray mt-0.5">Pour {d.client}</p>
              </div>
              <div className="text-right">
                <p className="text-foodiz-gold font-bold font-serif text-lg">{d.gain.toFixed(2).replace(".", ",")} €</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[10px] text-foodiz-gray mb-3">
              <span className="flex items-center gap-1"><MapPin size={10} /> {d.distance}</span>
              <span className="flex items-center gap-1"><Clock size={10} /> {d.time}</span>
              <span className="flex items-center gap-1"><MapPin size={10} /> {d.address}</span>
            </div>

            <button
              onClick={() => navigate(`/courier/deliveries/${d.id}`)}
              className="w-full foodiz-btn !py-3 text-xs flex items-center justify-center gap-2"
            >
              <Bike size={16} /> Accepter la livraison
            </button>
          </div>
        ))}
      </main>
    </div>
  );
}
