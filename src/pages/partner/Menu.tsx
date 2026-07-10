import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Plus,
  GripVertical,
  Edit2,
  EyeOff,
  Info,
  ArrowRight,
  FolderPlus,
} from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import { supabase } from "../../lib/supabase";
import { getCustomerPrice } from "../../utils/partnerStore";

type PartnerProduct = { id: string; name: string; desc: string; partnerPrice: number; image: string; category: string };

export default function PartnerMenu() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [restaurantId, setRestaurantId] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: restaurant } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).single();
      if (!restaurant) return;
      setRestaurantId(restaurant.id);
      const [{ data: productData }, { data: categoryData }] = await Promise.all([
        supabase.from("products").select("id, name, description, partner_price_cents, image_url, category").eq("restaurant_id", restaurant.id),
        supabase.from("partner_menu_categories").select("name").eq("restaurant_id", restaurant.id).order("created_at"),
      ]);
      const mapped = (productData || []).map((product: any) => ({ id: product.id, name: product.name, desc: product.description || "", partnerPrice: product.partner_price_cents / 100, image: product.image_url || "", category: product.category || "Menu" }));
      setProducts(mapped);
      setCategories([...new Set([...(categoryData || []).map((category: any) => category.name), ...mapped.map((product) => product.category)])]);
    };
    load();
  }, []);

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name || !restaurantId) return;
    const { error } = await supabase.from("partner_menu_categories").insert({ restaurant_id: restaurantId, name });
    if (!error) setCategories((current) => current.includes(name) ? current : [...current, name]);
    setNewCategory("");
  };

  const toggleAvailability = async (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    const { error } = await supabase.from("products").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", productId).eq("restaurant_id", restaurantId);
    if (!error) setProducts((current) => current.filter((item) => item.id !== productId));
  };

  return (
    <div className="min-h-screen bg-weello-black pb-24">
      <header className="bg-weello-card border-b border-weello-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner")} className="text-weello-gold">
            <ChevronLeft size={24} />
          </button>
          <h1 className="weello-title text-lg">Gestion du Menu</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="weello-card p-4 bg-weello-gold/5 border-weello-gold/20 flex gap-3">
          <GoldIcon icon={Info} size={20} className="shrink-0" />
          <p className="text-xs text-weello-cream/80 leading-relaxed">
            <span className="text-weello-gold font-bold">Rappel Weello :</span> vos prix affichés doivent rester identiques à ceux de votre carte physique. Le supplément Weello est ajouté uniquement côté client.
          </p>
        </div>

        <div className="weello-card p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-weello-gold">Nouvelle catégorie</label>
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Ex: Tapas, Spécialités, Signature..."
              className="w-full mt-2 bg-white/[0.03] border border-weello-gold/10 rounded-2xl px-4 py-3 text-sm text-weello-cream outline-none focus:border-weello-gold/30"
            />
          </div>
          <button
            onClick={handleAddCategory}
            className="weello-btn !py-3 !px-4 text-xs flex items-center justify-center gap-2 shrink-0"
          >
            <FolderPlus size={14} /> Ajouter la catégorie
          </button>
          <button
            onClick={() => navigate("/partner/products/new")}
            className="weello-btn-outline !py-3 !px-4 text-xs flex items-center justify-center gap-2 shrink-0"
          >
            <Plus size={14} /> Ajouter un plat
          </button>
        </div>

        <div className="space-y-8">
          {categories.map((cat) => (
            <div key={cat} className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-weello-gray border-l-2 border-weello-gold pl-3">
                {cat}
              </h3>
              <div className="space-y-3">
                {products.filter((p) => p.category === cat).map((product) => {
                  const customerPrice = getCustomerPrice(product.partnerPrice);
                  return (
                    <div key={product.id} className="weello-card p-4 flex items-center gap-4 group">
                      <GripVertical size={20} className="text-weello-gray/20 cursor-grab shrink-0" />

                      <div className="w-16 h-16 rounded-[1rem] overflow-hidden border border-weello-gold/10 shrink-0 bg-white/[0.03]">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-weello-gray text-xs">Photo</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-weello-cream">{product.name}</h4>
                        <p className="text-[11px] text-weello-gray mt-0.5 line-clamp-1">{product.desc}</p>
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          <div>
                            <p className="text-[9px] text-weello-gray uppercase font-bold">Prix Partenaire</p>
                            <p className="text-sm text-weello-cream">{product.partnerPrice.toFixed(2)} €</p>
                          </div>
                          <ArrowRight size={14} className="text-weello-gold/40" />
                          <div className="bg-weello-gold/5 px-2 py-1 rounded-lg border border-weello-gold/10">
                            <p className="text-[9px] text-weello-gold uppercase font-bold">Visible Client</p>
                            <p className="text-sm text-weello-gold font-bold">{customerPrice.toFixed(2)} €</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => navigate(`/partner/products/${product.id}/edit`)}
                          className="p-2 rounded-lg bg-weello-card border border-weello-gold/10 text-weello-gold hover:bg-weello-gold/5"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => toggleAvailability(product.id)} title="Retirer de la vente" className="p-2 rounded-lg bg-weello-card border border-weello-gold/10 text-weello-cream hover:bg-weello-card/80">
                          <EyeOff size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {products.filter((p) => p.category === cat).length === 0 && (
                  <div className="weello-card p-4 text-xs text-weello-gray">Aucun produit dans cette catégorie pour le moment.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
