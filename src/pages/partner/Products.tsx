import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Search, Eye, EyeOff, Star, Edit3 } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

const PRODUCTS = [
  { id: "p1", name: "Burger Artisanal", category: "Plats", price: 8.00, stock: 20, active: true, popular: true },
  { id: "p2", name: "Frites Maison", category: "Plats", price: 3.00, stock: 50, active: true, popular: true },
  { id: "p3", name: "Poulet Rôti", category: "Plats", price: 10.00, stock: 10, active: true, popular: false },
  { id: "p4", name: "Tiramisu", category: "Desserts", price: 5.50, stock: 15, active: true, popular: true },
  { id: "p5", name: "Crème Brûlée", category: "Desserts", price: 6.00, stock: 12, active: false, popular: false },
  { id: "p6", name: "Limonade Maison", category: "Boissons", price: 3.50, stock: 30, active: true, popular: false },
];

export default function PartnerProducts() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = PRODUCTS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-foodiz-black">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
            <h1 className="foodiz-title text-lg">Produits</h1>
          </div>
          <button onClick={() => navigate("/partner/products/new")} className="w-8 h-8 rounded-full bg-foodiz-gold text-foodiz-black flex items-center justify-center">
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="relative mb-6">
          <GoldIcon icon={Search} size={16} className="absolute left-4 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full bg-foodiz-card border border-foodiz-gold/15 rounded-2xl py-3 pl-10 pr-4 text-foodiz-cream placeholder-foodiz-gray/50 text-sm outline-none focus:border-foodiz-gold/40"
          />
        </div>

        <div className="space-y-2">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => navigate(`/partner/products/${p.id}/edit`)}
              className="w-full foodiz-card p-4 flex items-center gap-4 text-left hover:border-foodiz-gold/30 transition-all"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${p.active ? "text-foodiz-cream" : "text-foodiz-gray/50 line-through"}`}>{p.name}</span>
                  {p.popular && <Star size={12} className="text-foodiz-gold" />}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-foodiz-gray">
                  <span>{p.category}</span>
                  <span>•</span>
                  <span>Stock: {p.stock}</span>
                </div>
              </div>
              <span className="text-foodiz-gold font-semibold text-sm">{p.price.toFixed(2).replace(".", ",")} €</span>
              {p.active ? <Eye size={14} className="text-foodiz-green" /> : <EyeOff size={14} className="text-foodiz-gray/50" />}
              <Edit3 size={14} className="text-foodiz-gold/50" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
