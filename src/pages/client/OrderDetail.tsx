import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Download, MapPin, Navigation, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { getOrder } from "../../lib/orders";
import { supabase } from "../../lib/supabase";
import { downloadFinancialDocument } from "../../lib/financialDocuments";

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    void Promise.all([
      getOrder(id).then(setOrder),
      supabase.from("financial_documents").select("id,document_number,status,last_emailed_at").eq("order_id", id).eq("document_type", "client_payment_receipt").maybeSingle().then(({ data }) => setReceipt(data)),
    ]).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-20 text-center text-foodiz-gray animate-pulse">Chargement de la commande...</div>;
  if (!order) return <div className="py-20 text-center text-foodiz-gray">Commande introuvable.</div>;

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/orders")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6"><ChevronLeft size={18} /> Mes commandes</button>
      <h1 className="foodiz-title text-2xl mb-2">Commande #{id?.slice(0, 6)}</h1>
      <p className="text-foodiz-gray text-xs mb-6">{order.restaurant?.name || "Restaurant"} · {new Date(order.created_at).toLocaleString("fr-FR")}</p>
      
      <div className="foodiz-card p-5 mb-6">
        <h2 className="foodiz-title text-sm mb-4">Récapitulatif</h2>
        <div className="space-y-3 mb-4">
          {order.order_items?.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-foodiz-cream">{item.quantity}x {item.product?.name || "Produit"}</span>
              <span className="text-foodiz-cream">{(item.total_price_cents / 100).toFixed(2)} €</span>
            </div>
          ))}
        </div>
        <div className="border-t border-foodiz-gold/10 pt-3 flex justify-between">
          <span className="text-foodiz-cream font-semibold">Total payé</span>
          <span className="text-foodiz-gold font-bold text-lg">{(order.final_client_total_cents / 100).toFixed(2)} €</span>
        </div>
      </div>

      {receipt && <button onClick={() => void downloadFinancialDocument(receipt.id, receipt.document_number).catch((error) => toast.error(error.message))} className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border border-foodiz-gold/20 px-4 py-3 text-sm text-foodiz-gold"><Download size={17}/>Télécharger mon reçu de paiement</button>}

      <div className="foodiz-card p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <MapPin size={18} className="text-foodiz-gold" />
          <h2 className="foodiz-title text-sm">Livré à</h2>
        </div>
        <p className="text-sm text-foodiz-cream">{order.delivery_address || "Adresse non renseignée"}</p>
      </div>

      {!['delivered', 'cancelled'].includes(order.status) && order.payment_status === 'completed' && (
        <button onClick={() => navigate(`/client/orders/${id}/tracking`)} className="w-full foodiz-btn py-4 text-base mb-3 flex items-center justify-center gap-2">
          <Navigation size={18} /> Suivre la commande et voir mon code
        </button>
      )}

      {!['delivered', 'cancelled'].includes(order.status) && order.payment_status === 'completed' && (
        <p className="mb-5 flex items-center justify-center gap-2 text-center text-xs text-foodiz-gray"><ShieldCheck size={14} className="text-foodiz-gold" />Le code à 6 chiffres est personnel. Donnez-le uniquement après réception.</p>
      )}

      {order.status === "delivered" && <button onClick={() => navigate(`/client/orders/${id}/review`)} className="w-full foodiz-btn py-4 text-base">Noter cette commande</button>}
    </div>
  );
}
