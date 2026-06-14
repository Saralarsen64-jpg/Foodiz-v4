import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Megaphone, Plus, History, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

type PartnerCampaign = { id: string; title: string; message: string; status: string; sentAt: string };

export default function PartnerMarketing() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<PartnerCampaign[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [title, setTitle] = useState("Nouvelle offre Foodiz");
  const [message, setMessage] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: restaurantData } = await supabase.from("restaurants").select("id, name").eq("owner_id", user.id).single();
      if (!restaurantData) return;
      setRestaurant(restaurantData);
      setTitle(`Nouveauté chez ${restaurantData.name}`);
      const [{ data: productData }, { data: campaignData }] = await Promise.all([
        supabase.from("products").select("id, name").eq("restaurant_id", restaurantData.id).eq("is_active", true),
        supabase.from("marketing_campaigns").select("id, title, description, is_active, created_at").eq("restaurant_id", restaurantData.id).order("created_at", { ascending: false }),
      ]);
      setProducts(productData || []);
      if (productData?.[0]) {
        setSelectedProductId(productData[0].id);
        setMessage(`${productData[0].name} vous attend près de chez vous.`);
      }
      setCampaigns((campaignData || []).map((campaign: any) => ({ id: campaign.id, title: campaign.title, message: campaign.description || "", status: campaign.is_active ? "envoyée" : "terminée", sentAt: new Date(campaign.created_at).toLocaleString("fr-FR") })));
    };
    load();
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleSendCampaign = async () => {
    if (!restaurant || !title.trim() || !message.trim()) return;
    setSending(true);
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { data: campaign, error } = await supabase.from("marketing_campaigns").insert({
      restaurant_id: restaurant.id,
      title: title.trim(),
      description: message.trim(),
      start_date: now.toISOString(),
      end_date: end.toISOString(),
      is_active: true,
    }).select("id, title, description, created_at").single();
    if (error || !campaign) {
      setSending(false);
      return;
    }

    const { data: orders } = await supabase.from("orders").select("client_id").eq("restaurant_id", restaurant.id).eq("status", "delivered");
    const clientIds = [...new Set((orders || []).map((order: any) => order.client_id))];
    if (clientIds.length) {
      await supabase.from("notifications").insert(clientIds.map((clientId) => ({
        user_id: clientId,
        title: campaign.title,
        message: campaign.description,
        type: "marketing",
        link: `/client/establishments/${restaurant.id}`,
      })));
    }
    setCampaigns((prev) => [{ id: campaign.id, title: campaign.title, message: campaign.description || "", status: "envoyée", sentAt: new Date(campaign.created_at).toLocaleString("fr-FR") }, ...prev]);
    setSent(true);
    setSending(false);
    window.setTimeout(() => setSent(false), 1600);
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Foodiz+</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="foodiz-card p-6 bg-[linear-gradient(135deg,rgba(216,168,79,0.12),rgba(17,17,17,0.96)_28%,rgba(5,5,5,1)_100%)] border-foodiz-gold/20">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-foodiz-gold font-bold mb-2">Foodiz+</p>
              <h2 className="foodiz-title text-2xl mb-2">Créer une campagne locale</h2>
              <p className="text-foodiz-gray text-sm max-w-lg">
                C’est vous, partenaire Foodiz, qui choisissez le message, le produit mis en avant et l’angle de la notification reçue par vos clients.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-foodiz-gold/10 border border-foodiz-gold/15 flex items-center justify-center shrink-0">
              <Megaphone size={20} className="text-foodiz-gold" />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="foodiz-card p-4 bg-white/[0.02] border-foodiz-gold/10">
              <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Produit mis en avant</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full mt-2 bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-sm text-foodiz-cream outline-none"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id} className="bg-foodiz-card">
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="foodiz-card p-4 bg-white/[0.02] border-foodiz-gold/10">
              <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Titre de notification</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mt-2 bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-sm text-foodiz-cream outline-none"
              />
            </div>

            <div className="foodiz-card p-4 bg-white/[0.02] border-foodiz-gold/10">
              <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Message envoyé au client</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex: Le burger fond déjà… ce soir, il vous attend chez Maison K."
                className="w-full mt-2 min-h-[110px] resize-none bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-sm text-foodiz-cream outline-none"
              />
            </div>

            <div className="foodiz-card p-4 bg-foodiz-gold/5 border-foodiz-gold/15">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gold mb-2">Aperçu client</p>
              <div className="rounded-2xl border border-foodiz-gold/10 bg-black/30 p-4">
                <p className="text-sm font-medium text-foodiz-cream">{title || "Titre de notification"}</p>
                <p className="text-xs text-foodiz-gray mt-1">{message || "Votre message apparaîtra ici."}</p>
                {selectedProduct && (
                  <p className="text-[10px] text-foodiz-gold mt-3">Produit lié : {selectedProduct.name}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button disabled={sending} onClick={handleSendCampaign} className="foodiz-btn !py-3 !px-4 text-xs flex items-center gap-2 disabled:opacity-50">
                <Send size={14} /> {sending ? "Envoi..." : "Envoyer cette campagne"}
              </button>
              <button onClick={() => navigate("/partner/products/new")} className="foodiz-btn-outline !py-3 !px-4 text-xs flex items-center gap-2">
                <Plus size={14} /> Créer un nouveau produit à pousser
              </button>
            </div>

            {sent && (
              <div className="foodiz-card p-3 text-xs text-foodiz-green border-foodiz-green/20 bg-foodiz-green/5 flex items-center gap-2">
                <CheckCircle2 size={14} /> Campagne envoyée. Elle est maintenant visible côté client ciblé dans les notifications.
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <History size={16} className="text-foodiz-gold" />
            <h3 className="foodiz-title text-sm">Historique des campagnes envoyées</h3>
          </div>
          <div className="space-y-3">
            {campaigns.length === 0 && (
              <div className="foodiz-card p-4 text-sm text-foodiz-gray">Aucune campagne envoyée pour le moment.</div>
            )}
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="foodiz-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-foodiz-cream font-medium">{campaign.title}</p>
                    <p className="text-[10px] text-foodiz-gray mt-1">{campaign.message}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-foodiz-gold uppercase">{campaign.status}</p>
                    <p className="text-[10px] text-foodiz-gray mt-1">{campaign.sentAt}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
