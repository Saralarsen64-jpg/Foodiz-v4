import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Clock, CheckCircle, XCircle } from "lucide-react";

type OrderStatus = "new" | "preparing" | "ready";

type PartnerOrder = {
  id: string;
  client: string;
  items: string;
  total: number;
  status: OrderStatus;
  time: string;
  table: string;
};

const INITIAL_ORDERS: PartnerOrder[] = [
  { id: "o1", client: "Alexandre", items: "Burger Artisanal x2, Frites x1", total: 28.6, status: "new", time: "Il y a 2 min", table: "Livraison" },
  { id: "o2", client: "Marie", items: "Salade Caesar x1, Tiramisu x1", total: 18.2, status: "preparing", time: "12 min", table: "Livraison" },
  { id: "o3", client: "Julien", items: "Poulet Rôti x1, Légumes x2", total: 24.0, status: "ready", time: "Prête", table: "Livraison" },
  { id: "o4", client: "Sophie", items: "Bowl Buddha x1, Limonade x1", total: 19.5, status: "preparing", time: "8 min", table: "Livraison" },
];

export default function PartnerOrdersCurrent() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Nouvelles");
  const [orders, setOrders] = useState(INITIAL_ORDERS);

  const visibleOrders = useMemo(() => {
    if (activeTab === "Toutes") return orders;
    if (activeTab === "Nouvelles") return orders.filter((o) => o.status === "new");
    if (activeTab === "En préparation") return orders.filter((o) => o.status === "preparing");
    return orders.filter((o) => o.status === "ready");
  }, [activeTab, orders]);

  const acceptOrder = (id: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "preparing", time: "10 min" } : o)));
  };

  const refuseOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const markReady = (id: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "ready", time: "Prête" } : o)));
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
                    order.status === "new"
                      ? "bg-foodiz-gold/20 text-foodiz-gold"
                      : order.status === "preparing"
                      ? "bg-foodiz-gold/10 text-foodiz-gold/70"
                      : "bg-foodiz-green/10 text-foodiz-green"
                  }`}>
                    {order.status === "new" ? "Nouvelle" : order.status === "preparing" ? "En préparation" : "Prête"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-foodiz-gray mb-3">
                  <span className="flex items-center gap-1"><Clock size={12} /> {order.time}</span>
                  <span className="text-foodiz-gold font-semibold">{order.total.toFixed(2).replace(".", ",")} €</span>
                </div>
              </button>

              <div className="flex gap-2">
                {order.status === "new" && (
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
