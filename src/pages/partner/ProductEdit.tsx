import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ChevronLeft, 
  Save, 
  Trash2, 
  Image as ImageIcon,
  Calculator,
  AlertTriangle,
  Upload
} from "lucide-react";

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partnerPrice, setPartnerPrice] = useState<string>("0");
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [productImage, setProductImage] = useState<string | null>(null);
  const isNew = !id;

  // Calculateur dynamique selon les tranches Foodiz
  const calculateSplit = (price: number) => {
    if (price <= 3.50) return { sup: 1.20, courier: 0.50, foodiz: 0.50, loyalty: 0.10, internal: 0.10 };
    if (price <= 8.49) return { sup: 2.50, courier: 1.00, foodiz: 1.00, loyalty: 0.20, internal: 0.10 };
    return { sup: 3.50, courier: 1.20, foodiz: 1.50, loyalty: 0.30, internal: 0.20 };
  };

  const priceNum = parseFloat(partnerPrice) || 0;
  const split = calculateSplit(priceNum);
  const customerPrice = priceNum + split.sup;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProductImage(url);
    }
  };

  const handleSave = () => {
    if (!productName || !partnerPrice) return;
    
    const existingProducts = JSON.parse(localStorage.getItem('foodiz_products_r1') || '[]');
    const newProduct = {
      id: `p${Date.now()}`,
      name: productName,
      desc: productDesc || "Délicieuse spécialité maison",
      price: parseFloat(partnerPrice),
      points: priceNum >= 8.50 ? 30 : priceNum > 3.50 ? 20 : 10,
      image: productImage || "/images/restaurant-maison-k.jpg",
      category: "Nos Spécialités" // Catégorie par défaut pour l'exemple
    };

    localStorage.setItem('foodiz_products_r1', JSON.stringify([...existingProducts, newProduct]));
    navigate("/partner/menu");
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      {/* Golden Side Borders */}
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />

      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner/menu")} className="text-foodiz-gold">
            <ChevronLeft size={24} />
          </button>
          <h1 className="foodiz-title text-lg">{isNew ? "Nouveau Plat" : "Modifier le Plat"}</h1>
          <button onClick={handleSave} className="text-foodiz-gold font-bold text-sm flex items-center gap-2 hover:text-foodiz-cream transition-colors">
            <Save size={16} /> Enregistrer
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Upload Image Section */}
        <div className="foodiz-card p-1 border-dashed border-2 border-foodiz-gold/20 hover:border-foodiz-gold/40 transition-all rounded-2xl overflow-hidden relative group bg-foodiz-black/50">
          <div className="absolute top-2 left-2 z-10 bg-foodiz-gold text-foodiz-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
            Photo pour la Card Client
          </div>
          {productImage ? (
            <div className="relative aspect-video">
              <img src={productImage} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-foodiz-cream text-xs mb-2">Photo actuelle</p>
                <label className="cursor-pointer bg-foodiz-gold text-foodiz-black px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                  <Upload size={14} /> Changer la photo réaliste
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center aspect-video cursor-pointer bg-foodiz-gold/5">
              <div className="w-16 h-16 rounded-full bg-foodiz-gold/10 flex items-center justify-center mb-3 border border-foodiz-gold/30">
                <ImageIcon size={32} className="text-foodiz-gold" />
              </div>
              <p className="text-sm text-foodiz-cream font-bold mb-1">Insérer la photo réaliste du plat</p>
              <p className="text-[10px] text-foodiz-gray mb-3 text-center px-4">Cette image apparaîtra dans la card noire rectangulaire du menu côté client.</p>
              <span className="text-[10px] text-foodiz-black bg-foodiz-gold px-4 py-2 rounded-full font-bold uppercase tracking-wider">Cliquez pour uploader une image</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <div className="foodiz-card p-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Nom du produit</label>
            <input 
              type="text" 
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ex: Burger Truffe Noire" 
              className="w-full bg-transparent border-none text-foodiz-cream mt-2 outline-none text-lg font-serif italic placeholder-foodiz-gray/30"
            />
          </div>

          <div className="foodiz-card p-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Description</label>
            <textarea 
              value={productDesc}
              onChange={(e) => setProductDesc(e.target.value)}
              placeholder="Décrivez les ingrédients et l'aspect gourmand..." 
              className="w-full bg-transparent border-none text-foodiz-gray mt-2 outline-none text-sm min-h-[80px] resize-none placeholder-foodiz-gray/30"
            />
          </div>

          {/* Pricing Logic Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="foodiz-card p-4 ring-1 ring-foodiz-gold/30">
              <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Votre Prix Réel (Restaurant)</label>
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="number" 
                  step="0.01"
                  value={partnerPrice}
                  onChange={(e) => setPartnerPrice(e.target.value)}
                  className="bg-transparent border-none text-foodiz-cream text-2xl font-bold outline-none w-full placeholder-foodiz-gray/30"
                  placeholder="0.00"
                />
                <span className="text-foodiz-gold font-bold">€</span>
              </div>
              <p className="text-[9px] text-foodiz-gray mt-2 leading-relaxed">
                <AlertTriangle size={10} className="inline mr-1 text-foodiz-gold" />
                Doit correspondre exactement au prix de votre carte physique.
              </p>
            </div>

            <div className="foodiz-card p-4 bg-foodiz-gold/10 border-foodiz-gold/30 shadow-lg shadow-foodiz-gold/5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Prix Affiché au Client</label>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-foodiz-gold text-2xl font-bold">{customerPrice.toFixed(2)}</span>
                <span className="text-foodiz-gold font-bold">€</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[10px] text-foodiz-cream/60">
                  <span>Inclus: Supplément Foodiz</span>
                  <span>+{split.sup.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-[10px] text-foodiz-gold font-bold">
                  <span>Points Foodiz pour le client</span>
                  <span>+{priceNum >= 8.50 ? 30 : priceNum > 3.50 ? 20 : 10} pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Economic Detail (Only for Partner, Hidden from Client) */}
        <div className="foodiz-card p-5 bg-[#111] border-foodiz-gold/10">
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={16} className="text-foodiz-gold" />
            <h3 className="foodiz-title text-sm">Répartition Économique</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-foodiz-gray text-xs">Part Livreur</span>
              <span className="text-foodiz-cream">{split.courier.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-foodiz-gray">Commission Foodiz</span>
              <span className="text-foodiz-cream">{split.foodiz.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-foodiz-gray">Fidélité client</span>
              <span className="text-foodiz-cream">{split.loyalty.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-foodiz-gray">Frais internes</span>
              <span className="text-foodiz-cream">{split.internal.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {!isNew && (
          <button className="w-full py-4 flex items-center justify-center gap-2 text-red-500/60 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-widest border border-red-500/20 rounded-xl hover:bg-red-500/5">
            <Trash2 size={14} /> Supprimer ce plat de la carte
          </button>
        )}
      </main>
    </div>
  );
}
