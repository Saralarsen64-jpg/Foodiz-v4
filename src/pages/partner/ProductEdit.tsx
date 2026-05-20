import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Trash2,
  Image as ImageIcon,
  Calculator,
  AlertTriangle,
  Upload,
} from "lucide-react";
import {
  fileToBase64,
  getCustomerPrice,
  getPoints,
  loadPartnerProfile,
  savePartnerProfile,
  upsertPartnerProduct,
  type PartnerProduct,
} from "../../utils/partnerStore";

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const profile = useMemo(() => loadPartnerProfile(), []);
  const existingProduct = profile.products.find((p) => p.id === id);

  const [name, setName] = useState(existingProduct?.name || "");
  const [desc, setDesc] = useState(existingProduct?.desc || "");
  const [partnerPrice, setPartnerPrice] = useState<string>(String(existingProduct?.partnerPrice || 0));
  const [category, setCategory] = useState(existingProduct?.category || profile.categories[0] || "Plats");
  const [image, setImage] = useState(existingProduct?.image || "");

  const priceNum = parseFloat(partnerPrice) || 0;
  const customerPrice = getCustomerPrice(priceNum);
  const points = getPoints(priceNum);

  const calculateSplit = (price: number) => {
    if (price <= 3.5) return { sup: 1.2, courier: 0.5, foodiz: 0.5, loyalty: 0.1, internal: 0.1 };
    if (price <= 8.49) return { sup: 2.5, courier: 1.0, foodiz: 1.0, loyalty: 0.2, internal: 0.1 };
    return { sup: 3.5, courier: 1.2, foodiz: 1.5, loyalty: 0.3, internal: 0.2 };
  };

  const split = calculateSplit(priceNum);

  const handleImageUpload = async (file?: File | null) => {
    if (!file) return;
    const base64 = await fileToBase64(file);
    setImage(base64);
  };

  const handleSave = () => {
    const product: PartnerProduct = {
      id: existingProduct?.id || `p-${Date.now()}`,
      name,
      desc,
      partnerPrice: priceNum,
      category,
      active: true,
      points,
      image,
    };

    upsertPartnerProduct(product);
    navigate("/partner/menu");
  };

  const handleDelete = () => {
    if (!existingProduct) return;
    const nextProfile = loadPartnerProfile();
    nextProfile.products = nextProfile.products.filter((p) => p.id !== existingProduct.id);
    savePartnerProfile(nextProfile);
    navigate("/partner/menu");
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner/menu")} className="text-foodiz-gold">
            <ChevronLeft size={24} />
          </button>
          <h1 className="foodiz-title text-lg">{isNew ? "Nouveau Plat" : "Modifier le Plat"}</h1>
          <button onClick={handleSave} className="text-foodiz-gold font-bold text-sm">Enregistrer</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <label className="foodiz-card aspect-video flex flex-col items-center justify-center border-dashed border-2 border-foodiz-gold/20 hover:border-foodiz-gold/40 transition-all cursor-pointer overflow-hidden">
          {image ? (
            <img src={image} alt="Produit" className="w-full h-full object-cover" />
          ) : (
            <>
              <ImageIcon size={40} className="text-foodiz-gold/40 mb-2" />
              <p className="text-xs text-foodiz-gray">Ajouter une photo premium</p>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageUpload(e.target.files?.[0])}
          />
        </label>

        <div className="space-y-4">
          <div className="foodiz-card p-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Nom du produit</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Burger Truffe Noire"
              className="w-full bg-transparent border-none text-foodiz-cream mt-2 outline-none text-lg font-serif italic"
            />
          </div>

          <div className="foodiz-card p-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Décrivez les ingrédients et l'aspect gourmand..."
              className="w-full bg-transparent border-none text-foodiz-gray mt-2 outline-none text-sm min-h-[80px] resize-none"
            />
          </div>

          <div className="foodiz-card p-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-2 bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-sm text-foodiz-cream outline-none"
            >
              {profile.categories.map((cat) => (
                <option key={cat} value={cat} className="bg-foodiz-card">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="foodiz-card p-4 ring-1 ring-foodiz-gold/30">
              <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Votre Prix Réel (Restaurant)</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  step="0.01"
                  value={partnerPrice}
                  onChange={(e) => setPartnerPrice(e.target.value)}
                  className="bg-transparent border-none text-foodiz-cream text-2xl font-bold outline-none w-full"
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
                  <span>+{points} pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

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

        <button
          onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
          className="w-full foodiz-btn-outline !py-3 text-xs flex items-center justify-center gap-2"
        >
          <Upload size={14} /> Mettre à jour la photo produit
        </button>

        {!isNew && (
          <button
            onClick={handleDelete}
            className="w-full py-4 flex items-center justify-center gap-2 text-red-500/60 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-widest"
          >
            <Trash2 size={14} /> Supprimer ce plat de la carte
          </button>
        )}
      </main>
    </div>
  );
}
