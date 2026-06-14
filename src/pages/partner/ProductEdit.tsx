import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Save, AlertCircle, CheckCircle } from "lucide-react";
import Logo from "../../components/Logo";

export default function ProductEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "", // En euros pour l'input, converti en centimes pour la BDD
    category: "Plats",
    image_url: "",
    is_active: true
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: restaurant } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
        if (restaurant) {
          setRestaurantId(restaurant.id);
          if (isEditing) {
            setLoading(true);
            const { data: product } = await supabase.from('products').select('*').eq('id', id).eq('restaurant_id', restaurant.id).single();
            if (product) {
              setFormData({
                name: product.name,
                description: product.description || "",
                price: (product.partner_price_cents / 100).toString(),
                category: product.category || "Plats",
                image_url: product.image_url || "",
                is_active: product.is_active
              });
            }
            setLoading(false);
          }
        }
      }
    };
    init();
  }, [id, isEditing]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;
    setSaving(true);
    setMessage(null);

    const priceCents = Math.round(parseFloat(formData.price) * 100);
    if (isNaN(priceCents) || priceCents <= 0) {
      setMessage({ type: 'error', text: "Veuillez entrer un prix valide." });
      setSaving(false);
      return;
    }

    const productData = {
      restaurant_id: restaurantId,
      name: formData.name,
      description: formData.description,
      partner_price_cents: priceCents,
      category: formData.category,
      image_url: formData.image_url,
      is_active: formData.is_active
    };

    let error;
    if (isEditing) {
      const res = await supabase.from('products').update(productData).eq('id', id);
      error = res.error;
    } else {
      const res = await supabase.from('products').insert(productData);
      error = res.error;
    }

    if (error) {
      setMessage({ type: 'error', text: "Erreur lors de la sauvegarde." });
    } else {
      setMessage({ type: 'success', text: "Plat enregistré avec succès !" });
      setTimeout(() => navigate("/partner/products"), 1500);
    }
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-foodiz-black flex items-center justify-center text-foodiz-gray">Chargement...</div>;

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner/products")} className="text-foodiz-gold flex items-center gap-2">
            <ChevronLeft size={20} /> Retour
          </button>
          <Logo size="sm" />
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="foodiz-title text-2xl text-foodiz-cream mb-2">{isEditing ? "Modifier le plat" : "Nouveau plat"}</h1>
        <p className="text-foodiz-gray text-sm mb-8">Remplissez les informations de votre produit. Le prix sera utilisé par le moteur économique Foodiz.</p>

        <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/20">
          {message && (
            <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 border ${message.type === 'success' ? 'bg-foodiz-green/10 text-foodiz-green border-foodiz-green/20' : 'bg-foodiz-red/10 text-foodiz-red border-foodiz-red/20'}`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider">Nom du plat *</label>
              <input 
                type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-foodiz-black border border-foodiz-gold/30 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold transition-colors"
                placeholder="Ex: Burger Maison K"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider">Prix (€) *</label>
                <input 
                  type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="w-full bg-foodiz-black border border-foodiz-gold/30 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold transition-colors"
                  placeholder="12.50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider">Catégorie</label>
                <select 
                  value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-foodiz-black border border-foodiz-gold/30 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold transition-colors appearance-none"
                >
                  <option value="Plats">Plats</option>
                  <option value="Entrées">Entrées</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Boissons">Boissons</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider">URL de l'image</label>
              <input 
                type="text" value={formData.image_url} onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                className="w-full bg-foodiz-black border border-foodiz-gold/30 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold transition-colors"
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider">Description</label>
              <textarea 
                value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-foodiz-black border border-foodiz-gold/30 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold transition-colors h-24 resize-none"
                placeholder="Description appétissante du plat..."
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input 
                type="checkbox" id="available" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-5 h-5 rounded border-foodiz-gold/30 bg-foodiz-black text-foodiz-gold focus:ring-foodiz-gold"
              />
              <label htmlFor="available" className="text-foodiz-cream text-sm">Produit disponible à la vente</label>
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={saving} className="foodiz-btn flex items-center gap-2 px-8 py-3 disabled:opacity-50">
                {saving ? "Enregistrement..." : <><Save size={18} /> Enregistrer le plat</>}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
