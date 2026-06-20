import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, MapPin, Phone, User } from "lucide-react";
import { getOrder } from "../../lib/orders";
import { getPartnerOrderCustomers } from "../../lib/orderContacts";

export default function PartnerOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getOrder(id), getPartnerOrderCustomers()])
      .then(([orderData, contacts]) => {
        const contact = contacts.find((item) => item.order_id === id);
        setOrder({ ...orderData, client: contact || null });
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen bg-foodiz-black flex items-center justify-center text-foodiz-gray">Chargement...</div>;
  if (!order) return <div className="min-h-screen bg-foodiz-black flex items-center justify-center text-foodiz-gray">Commande introuvable.</div>;

  const products = order.order_items || [];
  const totalPartner = order.partner_total_cents / 100;
  const totalClient = order.final_client_total_cents / 100;
  const supplement = totalClient - totalPartner;
  const clientName = order.client?.display_name || "Client";

  return (
    <div className="min-h-screen bg-foodiz-black">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">Commande #{id?.slice(0, 6)}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Status */}
        <div className="foodiz-card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-foodiz-gold text-xs font-medium bg-foodiz-gold/10 px-3 py-1 rounded-full">{order.status}</span>
            <span className="text-foodiz-gray text-[10px]">{new Date(order.created_at).toLocaleString("fr-FR")}</span>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-foodiz-gradient-gold flex items-center justify-center shrink-0">
              <User size={18} className="text-foodiz-gold" />
            </div>
            <div>
              <p className="text-sm text-foodiz-cream">{clientName}</p>
              <p className="text-[10px] text-foodiz-gray">{order.client?.phone || "Téléphone non renseigné"}</p>
            </div>
            <a href={order.client?.phone ? `tel:${order.client.phone}` : undefined} className="ml-auto w-9 h-9 rounded-xl bg-foodiz-gold/10 border border-foodiz-gold/20 flex items-center justify-center">
              <Phone size={16} className="text-foodiz-gold" />
            </a>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-foodiz-gradient-gold flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-foodiz-gold" />
            </div>
            <div>
              <p className="text-sm text-foodiz-cream">{order.delivery_address || order.client?.address || "Adresse non renseignée"}</p>
              <p className="text-[10px] text-foodiz-gray">{[order.client?.postal_code, order.client?.city].filter(Boolean).join(" ")}</p>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="foodiz-card p-5">
          <h3 className="foodiz-title text-sm mb-4">Produits</h3>
          <div className="space-y-3">
            {products.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-foodiz-gold text-xs font-medium">x{p.quantity}</span>
                  <span className="text-sm text-foodiz-cream">{p.product?.name || "Produit"}</span>
                </div>
                <span className="text-foodiz-cream text-sm">{(p.total_price_cents / 100).toFixed(2).replace(".", ",")} €</span>
              </div>
            ))}
          </div>
        </div>

        {/* Economic Summary - Partner view */}
        <div className="foodiz-card p-5">
          <h3 className="foodiz-title text-sm mb-4">Récapitulatif économique</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-foodiz-gray">Total payé par le client</span>
              <span className="text-foodiz-cream">{totalClient.toFixed(2).replace(".", ",")} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foodiz-gray">Ce qui vous revient</span>
              <span className="text-foodiz-green font-semibold text-base">{totalPartner.toFixed(2).replace(".", ",")} €</span>
            </div>
            <div className="border-t border-foodiz-gold/10 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-foodiz-gray">Supplément Foodiz global payé par le client</span>
                <span className="text-foodiz-gold">{supplement.toFixed(2).replace(".", ",")} €</span>
              </div>
              <p className="text-[10px] text-foodiz-gray/50 mt-1">Ce supplément couvre les frais de service, de livraison, la commission Foodiz et la fidélité.</p>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="foodiz-card p-5">
          <h3 className="foodiz-title text-sm mb-4">Suivi</h3>
          <div className="space-y-3">
            {[{ label: "Commande créée", time: new Date(order.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }, { label: `Statut actuel : ${order.status}`, time: new Date(order.updated_at || order.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }].map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-foodiz-green mt-1.5" />
                <div className="flex-1 flex justify-between">
                  <span className="text-xs text-foodiz-cream">{s.label}</span>
                  <span className="text-[10px] text-foodiz-gray">{s.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
