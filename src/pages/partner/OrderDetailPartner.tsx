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

  if (loading) return <div className="min-h-screen bg-weello-black flex items-center justify-center text-weello-gray">Chargement...</div>;
  if (!order) return <div className="min-h-screen bg-weello-black flex items-center justify-center text-weello-gray">Commande introuvable.</div>;

  const products = order.order_items || [];
  const totalPartner = order.partner_total_cents / 100;
  const totalClient = order.final_client_total_cents / 100;
  const supplement = totalClient - totalPartner;
  const clientName = order.client?.display_name || "Client";

  return (
    <div className="min-h-screen bg-weello-black">
      <header className="bg-weello-card border-b border-weello-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-weello-gold"><ChevronLeft size={20} /></button>
          <h1 className="weello-title text-lg">Commande #{id?.slice(0, 6)}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Status */}
        <div className="weello-card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-weello-gold text-xs font-medium bg-weello-gold/10 px-3 py-1 rounded-full">{order.status}</span>
            <span className="text-weello-gray text-[10px]">{new Date(order.created_at).toLocaleString("fr-FR")}</span>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-weello-gradient-gold flex items-center justify-center shrink-0">
              <User size={18} className="text-weello-gold" />
            </div>
            <div>
              <p className="text-sm text-weello-cream">{clientName}</p>
              <p className="text-[10px] text-weello-gray">{order.client?.phone || "Téléphone non renseigné"}</p>
            </div>
            <a href={order.client?.phone ? `tel:${order.client.phone}` : undefined} className="ml-auto w-9 h-9 rounded-xl bg-weello-gold/10 border border-weello-gold/20 flex items-center justify-center">
              <Phone size={16} className="text-weello-gold" />
            </a>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-weello-gradient-gold flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-weello-gold" />
            </div>
            <div>
              <p className="text-sm text-weello-cream">{order.delivery_address || order.client?.address || "Adresse non renseignée"}</p>
              <p className="text-[10px] text-weello-gray">{[order.client?.postal_code, order.client?.city].filter(Boolean).join(" ")}</p>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="weello-card p-5">
          <h3 className="weello-title text-sm mb-4">Produits</h3>
          <div className="space-y-3">
            {products.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-weello-gold text-xs font-medium">x{p.quantity}</span>
                  <span className="text-sm text-weello-cream">{p.product?.name || "Produit"}</span>
                </div>
                <span className="text-weello-cream text-sm">{((p.partner_total_price_cents ?? p.total_price_cents) / 100).toFixed(2).replace(".", ",")} €</span>
              </div>
            ))}
          </div>
        </div>

        {/* Economic Summary - Partner view */}
        <div className="weello-card p-5">
          <h3 className="weello-title text-sm mb-4">Récapitulatif économique</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-weello-gray">Total payé par le client</span>
              <span className="text-weello-cream">{totalClient.toFixed(2).replace(".", ",")} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-weello-gray">Ce qui vous revient</span>
              <span className="text-weello-green font-semibold text-base">{totalPartner.toFixed(2).replace(".", ",")} €</span>
            </div>
            <div className="border-t border-weello-gold/10 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-weello-gray">Supplément Weello global payé par le client</span>
                <span className="text-weello-gold">{supplement.toFixed(2).replace(".", ",")} €</span>
              </div>
              <p className="text-[10px] text-weello-gray/50 mt-1">Ce supplément couvre les frais de service, de livraison, la commission Weello et la fidélité.</p>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="weello-card p-5">
          <h3 className="weello-title text-sm mb-4">Suivi</h3>
          <div className="space-y-3">
            {[{ label: "Commande créée", time: new Date(order.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }, { label: `Statut actuel : ${order.status}`, time: new Date(order.updated_at || order.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }].map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-weello-green mt-1.5" />
                <div className="flex-1 flex justify-between">
                  <span className="text-xs text-weello-cream">{s.label}</span>
                  <span className="text-[10px] text-weello-gray">{s.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
