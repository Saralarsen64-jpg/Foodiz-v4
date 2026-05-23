import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Plus, 
  Edit2, 
  Info,
  ArrowRight,
  Tag,
  CheckCircle,
  XCircle
} from "lucide-react";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  partnerPrice: number;
  category: string;
  active: boolean;
};

const INITIAL_CATEGORIES: Category[] = [
  { id: "cat1", name: "Plats" },
  { id: "cat2", name: "Desserts" },
  { id: "cat3", name: "Boissons" },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: "p1", name: "Burger Artisanal", partnerPrice: 12.50, category: "Plats", active: true },
  { id: "p2", name: "Frites Maison Or", partnerPrice: 4.20, category: "Plats", active: true },
  { id: "p3", name: "Tiramisu", partnerPrice: 6.50, category: "Desserts", active: true },
  { id: "p4", name: "Limonade Maison", partnerPrice: 3.50, category: "Boissons", active: true },
];

export default function PartnerMenu() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);

  const toggleStock = (productId: string) => {
    setProducts(products.map(p => p.id === productId ? { ...p, active: !p.active } : p));
  };

  // Logique économique Foodiz (Tranches)
  const calculateCustomerPrice = (price: number) => {
    if (price <= 3.50) return price + 1.20;
    if (price <= 8.49) return price + 2.50;
    return price + 3.50;
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      setCategories([...categories, { id: `cat${Date.now()}`, name: newCategoryName }]);
      setNewCategoryName("");
      setShowAddCategory(false);
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      {/* Golden Side Borders */}
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />

      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold">
            <ChevronLeft size={24} />
          </button>
          <h1 className="foodiz-title text-lg">Gestion du Menu & Catégories</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Info Model Eco */}
        <div className="foodiz-card p-4 bg-foodiz-gold/5 border-foodiz-gold/20 flex gap-3">
          <Info size={20} className="text-foodiz-gold shrink-0 mt-0.5" />
          <p className="text-xs text-foodiz-cream/80 leading-relaxed">
            <span className="text-foodiz-gold font-bold">Rappel Foodiz :</span> Vos prix affichés doivent être strictement identiques à vos prix sur place. 
            Le supplément Foodiz est automatiquement ajouté pour le client.
          </p>
        </div>

        {/* Category Management */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="foodiz-title text-base text-foodiz-gold flex items-center gap-2">
              <Tag size={18} /> Mes Catégories
            </h2>
            <button 
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="foodiz-btn !py-2 !px-4 text-xs flex items-center gap-2"
            >
              <Plus size={14} /> Nouvelle catégorie
            </button>
          </div>

          {showAddCategory && (
            <div className="foodiz-card p-4 mb-4 flex gap-2 items-center bg-foodiz-gold/5 border-foodiz-gold/20">
              <input 
                type="text" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nom de la catégorie (ex: Burgers Signature)"
                className="flex-1 bg-foodiz-black border border-foodiz-gold/30 rounded-xl px-4 py-2 text-sm text-foodiz-cream outline-none focus:border-foodiz-gold"
              />
              <button onClick={handleAddCategory} className="bg-foodiz-gold text-foodiz-black px-4 py-2 rounded-xl text-xs font-bold">
                Ajouter
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="foodiz-card px-4 py-2 flex items-center gap-2 border-foodiz-gold/20">
                <span className="text-sm text-foodiz-cream">{cat.name}</span>
                <button className="text-foodiz-gold/50 hover:text-foodiz-gold">
                  <Edit2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="foodiz-title text-base text-foodiz-gold">Ma Carte</h2>
          <button 
            onClick={() => navigate("/partner/products/new")}
            className="foodiz-btn !py-2 !px-4 text-xs flex items-center gap-2"
          >
            <Plus size={14} /> Ajouter un plat
          </button>
        </div>

        {/* Categories List */}
        <div className="space-y-8">
          {categories.map((cat) => (
            <div key={cat.id} className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-foodiz-gray border-l-2 border-foodiz-gold pl-3">
                {cat.name}
              </h3>
              <div className="space-y-3">
                {products.filter(p => p.category === cat.name).map((product) => {
                  const customerPrice = calculateCustomerPrice(product.partnerPrice);
                  return (
                    <div key={product.id} className="foodiz-card p-4 flex items-center gap-4 group">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-foodiz-cream">{product.name}</h4>
                        <div className="flex items-center gap-4 mt-2">
                          <div>
                            <p className="text-[9px] text-foodiz-gray uppercase font-bold">Prix Partenaire</p>
                            <p className="text-sm text-foodiz-cream">{product.partnerPrice.toFixed(2)} €</p>
                          </div>
                          <ArrowRight size={14} className="text-foodiz-gold/40" />
                          <div className="bg-foodiz-gold/5 px-2 py-1 rounded-lg border border-foodiz-gold/10">
                            <p className="text-[9px] text-foodiz-gold uppercase font-bold">Visible Client</p>
                            <p className="text-sm text-foodiz-gold font-bold">{customerPrice.toFixed(2)} €</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleStock(product.id)}
                          className={`p-2 rounded-lg border flex items-center gap-1 text-xs font-bold transition-all ${product.active ? 'bg-foodiz-green/10 border-foodiz-green/30 text-foodiz-green' : 'bg-foodiz-red/10 border-foodiz-red/30 text-foodiz-red'}`}
                        >
                          {product.active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {product.active ? 'Disponible' : 'Rupture'}
                        </button>
                        <button onClick={() => navigate(`/partner/products/${product.id}/edit`)} className="p-2 rounded-lg bg-foodiz-card border border-foodiz-gold/10 text-foodiz-gold hover:bg-foodiz-gold/5">
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
