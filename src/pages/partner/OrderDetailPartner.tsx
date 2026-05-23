import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Clock, Printer } from "lucide-react";

export default function PartnerOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner/orders/current")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Détail Commande #{id}</h1>
          <div className="w-6" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/10">
          <h2 className="foodiz-title text-sm mb-4">Articles</h2>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm"><span className="text-foodiz-cream">2x Burger Artisanal</span><span className="text-foodiz-cream">25.00 €</span></div>
            <div className="flex justify-between text-sm"><span className="text-foodiz-cream">1x Frites Maison</span><span className="text-foodiz-cream">4.20 €</span></div>
          </div>
          <div className="border-t border-foodiz-gold/10 pt-4 flex justify-between">
            <span className="text-foodiz-cream font-bold">Total</span>
            <span className="text-foodiz-gold font-bold text-xl">29.20 €</span>
          </div>
        </div>
        <button className="w-full foodiz-btn py-4 flex items-center justify-center gap-2"><Printer size={18} /> Imprimer le ticket</button>
        <button onClick={() => navigate("/partner/orders/current")} className="w-full py-4 rounded-2xl border border-foodiz-gold/30 text-foodiz-gold font-bold text-sm hover:bg-foodiz-gold/5 transition-all">Marquer comme prêt</button>
      </main>
    </div>
  );
}
