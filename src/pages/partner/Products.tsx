import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus } from "lucide-react";

export default function PartnerProducts() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner/menu")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Mes Produits</h1>
          <button onClick={() => navigate("/partner/products/new")} className="w-8 h-8 rounded-full bg-foodiz-gold text-foodiz-black flex items-center justify-center"><Plus size={18} /></button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        <p className="text-foodiz-gray text-center text-sm">Utilisez la gestion du menu pour voir vos produits par catégorie.</p>
        <button onClick={() => navigate("/partner/menu")} className="w-full foodiz-btn mt-6">Aller à la gestion du menu</button>
      </main>
    </div>
  );
}
