import { useNavigate } from "react-router-dom";
import { ChevronLeft, DollarSign, TrendingUp } from "lucide-react";

export default function PartnerRevenues() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Revenus & Analyses</h1>
          <div className="w-6" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="foodiz-card p-5 bg-[#0A0A0A] border-foodiz-gold/10">
            <p className="text-[10px] text-foodiz-gray uppercase font-bold">Aujourd'hui</p>
            <p className="text-2xl font-serif italic text-foodiz-cream mt-1">386,50 €</p>
          </div>
          <div className="foodiz-card p-5 bg-[#0A0A0A] border-foodiz-gold/10">
            <p className="text-[10px] text-foodiz-gray uppercase font-bold">Cette semaine</p>
            <p className="text-2xl font-serif italic text-foodiz-cream mt-1">2,450.00 €</p>
          </div>
        </div>
        <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/10 h-64 flex items-center justify-center">
          <p className="text-foodiz-gray text-sm">Graphique d'évolution des revenus (similaire à Analytics)</p>
        </div>
      </main>
    </div>
  );
}
