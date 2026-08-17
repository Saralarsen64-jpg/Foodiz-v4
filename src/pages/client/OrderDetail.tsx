import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, Download, MapPin, Navigation, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { getOrder } from "../../lib/orders";
import { supabase } from "../../lib/supabase";
import { downloadFinancialDocument } from "../../lib/financialDocuments";
import { useCart } from "../../context/CartContext";

const PENDING_CHECKOUT_KEY = "weello_pending_checkout_order";

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [params] = useSearchParams();
  const { clearCart } = useCart();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<any>(null);
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [resolvingItem, setResolvingItem] = useState<string | null>(null);
  const paymentSucceeded = params.get("payment") === "success";

  useEffect(() => {
    if (paymentSucceeded) {
      clearCart();
      sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
    }
  }, [paymentSucceeded]);

  useEffect(() => {
    if (!id) return;
    void Promise.all([
      getOrder(id).then(setOrder),
      supabase.from("financial_documents").select("id,document_number,status,last_emailed_at").eq("order_id", id).eq("document_type", "client_payment_receipt").maybeSingle().then(({ data }) => setReceipt(data)),
      supabase.from("order_item_resolutions").select("*, proposed_product:products!order_item_resolutions_proposed_product_id_fkey(name)").eq("order_id", id).then(({ data }) => setResolutions(data || [])),
    ]).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-20 text-center text-weello-gray animate-pulse">Chargement de la commande...</div>;
  if (!order) return <div className="py-20 text-center text-weello-gray">Commande introuvable.</div>;

  const decideReplacement = async (item: any, action: "accept_replacement" | "reject_replacement") => {
    if (!id) return;
    setResolvingItem(item.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/order-item-resolution", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ orderId: id, orderItemId: item.id, action }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Action impossible");
      setResolutions((current) => current.map((row) => row.order_item_id === item.id ? { ...row, status: payload.status } : row));
      setOrder((current: any) => ({ ...current, order_items: current.order_items.map((row: any) => row.id === item.id ? { ...row, fulfillment_status: payload.status === "replaced" ? "replaced" : "refunded" } : row) }));
      toast.success(action === "accept_replacement" ? "Remplacement accepté." : "Remboursement de l’article lancé.");
    } catch (error: any) {
      toast.error(error.message || "Votre choix n’a pas pu être enregistré.");
    } finally {
      setResolvingItem(null);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/orders")} className="flex items-center gap-1 text-weello-gold text-sm mb-6"><ChevronLeft size={18} /> Mes commandes</button>
      <h1 className="weello-title text-2xl mb-2">Commande #{id?.slice(0, 6)}</h1>
      <p className="text-weello-gray text-xs mb-6">{order.restaurant?.name || "Restaurant"} · {new Date(order.created_at).toLocaleString("fr-FR")}</p>
      
      <div className="weello-card p-5 mb-6">
        <h2 className="weello-title text-sm mb-4">Récapitulatif</h2>
        <div className="space-y-3 mb-4">
          {order.order_items?.map((item: any) => {
            const resolution = resolutions.find((row) => row.order_item_id === item.id);
            return <div key={item.id} className="rounded-lg py-1.5">
              <div className="flex justify-between text-sm"><span className="text-weello-cream">{item.quantity}x {item.product?.name || "Produit"}</span><span className="text-weello-cream">{(item.total_price_cents / 100).toFixed(2)} €</span></div>
              {resolution?.status === "proposed" && <div className="mt-3 rounded-xl border border-weello-gold/25 bg-weello-gold/5 p-3">
                <p className="text-xs text-weello-cream"><span className="font-semibold">Article indisponible.</span> Le partenaire propose : {resolution.proposed_product?.name || "un produit de remplacement"}.</p>
                <p className="mt-1 text-[10px] text-weello-gray">Aucun supplément ne vous sera facturé.</p>
                <div className="mt-3 flex gap-2"><button disabled={resolvingItem === item.id} onClick={() => void decideReplacement(item, "accept_replacement")} className="flex-1 rounded-lg bg-weello-green px-3 py-2 text-xs font-medium text-white disabled:opacity-50">Accepter</button><button disabled={resolvingItem === item.id} onClick={() => void decideReplacement(item, "reject_replacement")} className="flex-1 rounded-lg border border-weello-red/40 px-3 py-2 text-xs font-medium text-weello-red disabled:opacity-50">Rembourser</button></div>
              </div>}
              {resolution?.status === "replaced" && <p className="mt-1 text-[11px] text-weello-green">Remplacé par {resolution.proposed_product?.name || "le produit accepté"}.</p>}
              {resolution?.status === "refunded" && <p className="mt-1 text-[11px] text-weello-green">Article indisponible : remboursement lancé.</p>}
            </div>;
          })}
        </div>
        <div className="border-t border-weello-gold/10 pt-3 flex justify-between">
          <span className="text-weello-cream font-semibold">Total payé</span>
          <span className="text-weello-gold font-bold text-lg">{(order.final_client_total_cents / 100).toFixed(2)} €</span>
        </div>
      </div>

      {receipt && <button onClick={() => void downloadFinancialDocument(receipt.id, receipt.document_number).catch((error) => toast.error(error.message))} className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border border-weello-gold/20 px-4 py-3 text-sm text-weello-gold"><Download size={17}/>Télécharger mon reçu de paiement</button>}

      <div className="weello-card p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <MapPin size={18} className="text-weello-gold" />
          <h2 className="weello-title text-sm">Livré à</h2>
        </div>
        <p className="text-sm text-weello-cream">{order.delivery_address || "Adresse non renseignée"}</p>
      </div>

      {order.fulfillment_method === 'pickup' && !['delivered', 'cancelled'].includes(order.status) && (
        <div className="weello-card mb-5 p-4 text-center"><p className="text-sm font-semibold text-weello-cream">Commande à emporter</p><p className="mt-1 text-xs text-weello-gray">Présentez-vous chez le partenaire lorsque la commande est prête.</p></div>
      )}

      {order.fulfillment_method !== 'pickup' && !['delivered', 'cancelled'].includes(order.status) && order.payment_status === 'completed' && (
        <button onClick={() => navigate(`/client/orders/${id}/tracking`)} className="w-full weello-btn py-4 text-base mb-3 flex items-center justify-center gap-2">
          <Navigation size={18} /> Suivre la commande et voir mon code
        </button>
      )}

      {order.fulfillment_method !== 'pickup' && !['delivered', 'cancelled'].includes(order.status) && order.payment_status === 'completed' && (
        <p className="mb-5 flex items-center justify-center gap-2 text-center text-xs text-weello-gray"><ShieldCheck size={14} className="text-weello-gold" />Le code à 6 chiffres est personnel. Donnez-le uniquement après réception.</p>
      )}

      {order.status === "delivered" && <button onClick={() => navigate(`/client/orders/${id}/review`)} className="w-full weello-btn py-4 text-base">Noter cette commande</button>}
    </div>
  );
}
