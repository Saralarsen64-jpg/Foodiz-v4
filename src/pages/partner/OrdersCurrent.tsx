import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

type OrderStatus = "pending" | "preparing" | "ready";

type PartnerOrder = {
  id: string;
  client: string;
  items: string;
  total: number;
  status: OrderStatus;
  time: string;
  table: string;
};

export default function PartnerOrdersCurrent() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Nouvelles");
  const [orders, setOrders] = useState<PartnerOrder[]>([]);

  useEffect(() => {
    let restaurantId = "";
    const fetchOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: restaurant } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).single();
      if (!restaurant) return;
      restaurantId = restaurant.id;
      const { data } = await supabase.from("orders").select("id, status, final_client_total_cents, created_at, client:profiles!orders_client_id_fkey(full_name, first_name), order_items(quantity, product:products(name))").eq("restaurant_id", restaurant.id).eq("payment_status", "completed").in("status", ["pending", "preparing", "ready"]).order("created_at");
      setOrders((data || []).map((order: any) => ({
        id: order.id,
        client: order.client?.full_name || order.client?.first_name || "Client",
        items: (order.order_items || []).map((item: any) => `${item.product?.name || "Produit"} x${item.quantity}`).join(", "),
        total: order.final_client_total_cents / 100,
        status: order.status,
        time: new Date(order.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        table: "Livraison",
      })));
    };
    fetchOrders();
    const channel = supabase.channel("partner-current-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const visibleOrders = useMemo(() => {
    if (activeTab === "Toutes") return orders;
    if (activeTab === "Nouvelles") return orders.filter((o) => o.status === "pending");
    if (activeTab === "En préparation") return orders.filter((o) => o.status === "preparing");
    return orders.filter((o) => o.status === "ready");
  }, [activeTab, orders]);

  const runAction = async (id: string, action: "accept" | "ready" | "refuse", reason?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch("/api/partner-order-action", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify({ orderId: id, action, reason }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Action impossible");
    return payload;
  };

  const acceptOrder = async (id: string) => {
    try { await runAction(id, "accept"); setOrders((prev) => prev.map((order) => order.id === id ? { ...order, status: "preparing" } : order)); toast.success("Commande acceptée."); }
    catch { toast.error("Impossible d'accepter cette commande."); }
  };

  const refuseOrder = async (id: string) => {
    const reason = window.prompt("Indiquez brièvement pourquoi la commande est refusée :");
    if (reason === null) return;
    try { const result = await runAction(id, "refuse", reason || "Indisponibilité exceptionnelle"); setOrders((prev) => prev.filter((order) => order.id !== id)); toast.success(result.refunded ? "Commande refusée, remboursement lancé." : "Commande refusée, points restitués."); }
    catch { toast.error("Le refus n'a pas pu être finalisé. Aucun changement n'a été appliqué."); }
  };

  const markReady = async (id: string) => {
    try { await runAction(id, "ready"); setOrders((prev) => prev.map((order) => order.id === id ? { ...order, status: "ready", time: "Prête" } : order)); toast.success("Commande prête pour le livreur."); }
    catch { toast.error("Impossible de déclarer cette commande prête."); }
  };

  return (
    <div className="min-h-screen bg-foodiz-black">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">Commandes en cours</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-none">
          {["Nouvelles", "En préparation", "Prêtes", "Toutes"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                tab === activeTab ? "bg-foodiz-gold text-foodiz-black" : "bg-foodiz-card border border-foodiz-gold/15 text-foodiz-gray"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {visibleOrders.map((order) => (
            <div key={order.id} className="foodiz-card p-4 hover:border-foodiz-gold/30 transition-all">
              <button onClick={() => navigate(`/partner/orders/${order.id}`)} className="w-full text-left">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-foodiz-cream">{order.client}</h3>
                    <p className="text-[11px] text-foodiz-gray mt-0.5">{order.items}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                    order.status === "pending"
                      ? "bg-foodiz-gold/20 text-foodiz-gold"
                      : order.status === "preparing"
                      ? "bg-foodiz-gold/10 text-foodiz-gold/70"
                      : "bg-foodiz-green/10 text-foodiz-green"
                  }`}>
                    {order.status === "pending" ? "Nouvelle" : order.status === "preparing" ? "En préparation" : "Prête"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-foodiz-gray mb-3">
                  <span className="flex items-center gap-1"><Clock size={12} /> {order.time}</span>
                  <span className="text-foodiz-gold font-semibold">{order.total.toFixed(2).replace(".", ",")} €</span>
                </div>
              </button>

              <div className="flex gap-2">
                {order.status === "pending" && (
                  <>
                    <button onClick={() => acceptOrder(order.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-foodiz-green text-white text-xs font-medium hover:bg-foodiz-green/90 transition-all">
                      <CheckCircle size={14} /> Accepter
                    </button>
                    <button onClick={() => refuseOrder(order.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-foodiz-red/40 text-foodiz-red text-xs font-medium hover:bg-foodiz-red/5 transition-all">
                      <XCircle size={14} /> Refuser
                    </button>
                  </>
                )}
                {order.status === "preparing" && (
                  <button onClick={() => markReady(order.id)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-foodiz-gold text-foodiz-black text-xs font-medium hover:bg-foodiz-gold-light transition-all">
                    <CheckCircle size={14} /> Marquer comme prête
                  </button>
                )}
                {order.status === "ready" && (
                  <button onClick={() => navigate(`/partner/orders/${order.id}`)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-foodiz-green/10 text-foodiz-green text-xs font-medium border border-foodiz-green/30">
                    En attente livreur
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
