import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Save, AlertCircle, CheckCircle, ImagePlus, Loader } from "lucide-react";
import Logo from "../../components/Logo";

export default function ProductEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "", // En euros pour l'input, converti en centimes pour la BDD
    category: "Plats",
    image_url: "",
    is_active: true,
    promotion_enabled: false,
    promotion_label: "",
    promotion_price: "",
    promotion_starts_at: "",
    promotion_ends_at: "",
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
                is_active: product.is_active,
                promotion_enabled: Boolean(product.promotion_partner_price_cents),
                promotion_label: product.promotion_label || "",
                promotion_price: product.promotion_partner_price_cents
                  ? (product.promotion_partner_price_cents / 100).toFixed(2)
                  : "",
                promotion_starts_at: product.promotion_starts_at
                  ? new Date(product.promotion_starts_at).toISOString().slice(0, 16)
                  : "",
                promotion_ends_at: product.promotion_ends_at
                  ? new Date(product.promotion_ends_at).toISOString().slice(0, 16)
                  : "",
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
    const promotionPriceCents = formData.promotion_enabled
      ? Math.round(parseFloat(formData.promotion_price) * 100)
      : null;
    if (
      formData.promotion_enabled
      && (
        !promotionPriceCents
        || promotionPriceCents < 50
        || promotionPriceCents >= priceCents
        || formData.promotion_label.trim().length < 2
      )
    ) {
      setMessage({
        type: 'error',
        text: "L’offre doit avoir un libellé et un prix compris entre 0,50 € et le prix habituel.",
      });
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
      is_active: formData.is_active,
      promotion_label: formData.promotion_enabled
        ? formData.promotion_label.trim()
        : null,
      promotion_partner_price_cents: promotionPriceCents,
      promotion_starts_at:
        formData.promotion_enabled && formData.promotion_starts_at
          ? new Date(formData.promotion_starts_at).toISOString()
          : null,
      promotion_ends_at:
        formData.promotion_enabled && formData.promotion_ends_at
          ? new Date(formData.promotion_ends_at).toISOString()
          : null,
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

  const uploadImage = async (file?: File) => {
    if (!file || !restaurantId) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Utilisez une image JPG, PNG ou WebP de 5 Mo maximum." });
      return;
    }
    setUploadingImage(true);
    setMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée.");
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${restaurantId}/products/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("restaurant-media").upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("restaurant-media").getPublicUrl(path);
      setFormData((current) => ({ ...current, image_url: data.publicUrl }));
      setMessage({ type: "success", text: "Photo chargée. Enregistrez le produit pour la publier." });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Upload impossible." });
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-weello-black flex items-center justify-center text-weello-gray">Chargement...</div>;

  return (
    <div className="min-h-screen bg-weello-black pb-24 relative border-x-2 border-weello-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />
      
      <header className="bg-weello-card border-b border-weello-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner/products")} className="text-weello-gold flex items-center gap-2">
            <ChevronLeft size={20} /> Retour
          </button>
          <Logo size="sm" />
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="weello-title text-2xl text-weello-cream mb-2">{isEditing ? "Modifier le plat" : "Nouveau plat"}</h1>
        <p className="text-weello-gray text-sm mb-8">Remplissez les informations de votre produit. Le prix sera utilisé par le moteur économique Weello.</p>

        <div className="weello-card p-6 bg-[#0A0A0A] border-weello-gold/20">
          {message && (
            <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 border ${message.type === 'success' ? 'bg-weello-green/10 text-weello-green border-weello-green/20' : 'bg-weello-red/10 text-weello-red border-weello-red/20'}`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-weello-gray tracking-wider">Nom du plat *</label>
              <input 
                type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-weello-black border border-weello-gold/30 rounded-xl px-4 py-3 text-weello-cream outline-none focus:border-weello-gold transition-colors"
                placeholder="Ex: Burger Maison K"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-weello-gray tracking-wider">Prix (€) *</label>
                <input 
                  type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="w-full bg-weello-black border border-weello-gold/30 rounded-xl px-4 py-3 text-weello-cream outline-none focus:border-weello-gold transition-colors"
                  placeholder="12.50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-weello-gray tracking-wider">Catégorie</label>
                <select 
                  value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-weello-black border border-weello-gold/30 rounded-xl px-4 py-3 text-weello-cream outline-none focus:border-weello-gold transition-colors appearance-none"
                >
                  <option value="Plats">Plats</option>
                  <option value="Entrées">Entrées</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Boissons">Boissons</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-weello-gray tracking-wider">Photo du produit</label>
              {formData.image_url && <img src={formData.image_url} alt="Aperçu du produit" className="h-44 w-full rounded-2xl border border-weello-gold/15 object-cover" />}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-weello-gold/30 bg-weello-gold/5 px-4 py-3 text-sm text-weello-gold hover:bg-weello-gold/10">
                {uploadingImage ? <Loader size={17} className="animate-spin"/> : <ImagePlus size={17}/>}
                {uploadingImage ? "Chargement..." : "Choisir une photo"}
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingImage} onChange={(event) => void uploadImage(event.target.files?.[0])} className="hidden" />
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-weello-gray tracking-wider">Description</label>
              <textarea 
                value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-weello-black border border-weello-gold/30 rounded-xl px-4 py-3 text-weello-cream outline-none focus:border-weello-gold transition-colors h-24 resize-none"
                placeholder="Description appétissante du plat..."
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input 
                type="checkbox" id="available" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-5 h-5 rounded border-weello-gold/30 bg-weello-black text-weello-gold focus:ring-weello-gold"
              />
              <label htmlFor="available" className="text-weello-cream text-sm">Produit disponible à la vente</label>
            </div>

            <div className="rounded-2xl border border-weello-gold/20 bg-weello-gold/5 p-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="promotion"
                  checked={formData.promotion_enabled}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      promotion_enabled: event.target.checked,
                    })}
                  className="h-5 w-5 rounded border-weello-gold/30 bg-weello-black text-weello-gold focus:ring-weello-gold"
                />
                <label htmlFor="promotion" className="text-sm font-semibold text-weello-cream">
                  Créer une offre sur ce produit
                </label>
              </div>
              {formData.promotion_enabled && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-[10px] font-bold uppercase tracking-wider text-weello-gray">
                    Libellé de l’offre
                    <input
                      value={formData.promotion_label}
                      maxLength={40}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          promotion_label: event.target.value,
                        })}
                      placeholder="Ex : Offre découverte"
                      className="mt-2 w-full rounded-xl border border-weello-gold/30 bg-weello-black px-4 py-3 text-sm normal-case text-weello-cream outline-none focus:border-weello-gold"
                    />
                  </label>
                  <label className="space-y-2 text-[10px] font-bold uppercase tracking-wider text-weello-gray">
                    Prix partenaire en offre (€)
                    <input
                      type="number"
                      min="0.50"
                      step="0.01"
                      value={formData.promotion_price}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          promotion_price: event.target.value,
                        })}
                      className="mt-2 w-full rounded-xl border border-weello-gold/30 bg-weello-black px-4 py-3 text-sm normal-case text-weello-cream outline-none focus:border-weello-gold"
                    />
                  </label>
                  <label className="space-y-2 text-[10px] font-bold uppercase tracking-wider text-weello-gray">
                    Début facultatif
                    <input
                      type="datetime-local"
                      value={formData.promotion_starts_at}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          promotion_starts_at: event.target.value,
                        })}
                      className="mt-2 w-full rounded-xl border border-weello-gold/30 bg-weello-black px-4 py-3 text-sm normal-case text-weello-cream outline-none focus:border-weello-gold"
                    />
                  </label>
                  <label className="space-y-2 text-[10px] font-bold uppercase tracking-wider text-weello-gray">
                    Fin facultative
                    <input
                      type="datetime-local"
                      value={formData.promotion_ends_at}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          promotion_ends_at: event.target.value,
                        })}
                      className="mt-2 w-full rounded-xl border border-weello-gold/30 bg-weello-black px-4 py-3 text-sm normal-case text-weello-cream outline-none focus:border-weello-gold"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={saving} className="weello-btn flex items-center gap-2 px-8 py-3 disabled:opacity-50">
                {saving ? "Enregistrement..." : <><Save size={18} /> Enregistrer le plat</>}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
