import { useNavigate } from "react-router-dom";
import { ChevronLeft, Users, Crown, TrendingUp, Star } from "lucide-react";

const TOP_CUSTOMERS = [
  { name: "Alexandre M.", orders: 18, avgBasket: 29.4, score: "Elite", retention: "Très fidèle" },
  { name: "Marie L.", orders: 15, avgBasket: 24.1, score: "Gold", retention: "Récurrente" },
  { name: "Julien P.", orders: 13, avgBasket: 26.8, score: "Gold", retention: "Récurrent" },
  { name: "Sophie R.", orders: 12, avgBasket: 21.5, score: "Gold", retention: "Récurrente" },
  { name: "Nora B.", orders: 10, avgBasket: 34.2, score: "Premium", retention: "Panier élevé" },
  { name: "Karim D.", orders: 9, avgBasket: 19.6, score: "Silver", retention: "Stable" },
  { name: "Lina K.", orders: 8, avgBasket: 22.8, score: "Silver", retention: "Stable" },
  { name: "Yanis F.", orders: 8, avgBasket: 17.9, score: "Silver", retention: "Stable" },
  { name: "Chloé T.", orders: 7, avgBasket: 31.0, score: "Premium", retention: "Panier élevé" },
  { name: "Marc V.", orders: 6, avgBasket: 18.2, score: "Silver", retention: "Occasionnel" },
];

export default function PartnerCustomers() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-foodiz-black pb-24">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">Top 10 meilleurs clients</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="foodiz-card p-5 bg-[linear-gradient(135deg,rgba(216,168,79,0.12),rgba(17,17,17,0.96)_28%,rgba(5,5,5,1)_100%)] border-foodiz-gold/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-foodiz-gold/12 border border-foodiz-gold/15 flex items-center justify-center">
              <Crown size={20} className="text-foodiz-gold" />
            </div>
            <div>
              <h2 className="foodiz-title text-lg">Clients les plus fidèles</h2>
              <p className="text-foodiz-gray text-xs mt-1">Analyse de fréquence, panier moyen et rétention</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {TOP_CUSTOMERS.map((customer, index) => (
            <div key={customer.name} className="foodiz-card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-foodiz-gold/10 border border-foodiz-gold/15 flex items-center justify-center text-foodiz-gold font-bold shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foodiz-cream">{customer.name}</p>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-foodiz-gold/10 border border-foodiz-gold/15 text-foodiz-gold uppercase tracking-widest">
                    {customer.score}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px] text-foodiz-gray">
                  <span className="flex items-center gap-1"><Users size={10} className="text-foodiz-gold/60" /> {customer.orders} commandes</span>
                  <span className="flex items-center gap-1"><TrendingUp size={10} className="text-foodiz-gold/60" /> panier moyen {customer.avgBasket.toFixed(2).replace(".", ",")} €</span>
                  <span className="flex items-center gap-1"><Star size={10} className="text-foodiz-gold/60" /> {customer.retention}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
