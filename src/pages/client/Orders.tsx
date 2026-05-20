import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Star,
} from "lucide-react";

type Tab = "en_cours" | "passées" | "annulées";
const STORAGE_KEY = "foodiz_client_orders_v1";

const MOCK_ORDERS = [
  {
    id: "o1",
    restaurant: "Maison K",
    date: "Hier, 19:30",
    status: "delivered",
    statusLabel: "Livrée",
    total: 38.40,
    points: 70,
    items: ["Burger Artisanal x2", "Limonade Maison x1"],
  },
  {
    id: "o2",
    restaurant: "Sushi Ko",
    date: "Avant-hier, 20:15",
    status: "delivered",
    statusLabel: "Livrée",
    total: 42.50,
    points: 80,
    items: ["Menu Découverte x1", "Maki Saumon x2"],
  },
  {
    id: "o3",
    restaurant: "Marché Bio",
    date: "Il y a 3 jours, 10:00",
    status: "cancelled",
    statusLabel: "Annulée",
    total: 22.00,
    points: 0,
    items: ["Panier Fruits x1"],
  },
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("en_cours");
  const [orders, setOrders] = useState<any[]>(MOCK_ORDERS);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const formatted = parsed.map((o: any) => ({
          id: o.id,
          restaurant: o.restaurant,
          date: `${o.date}, ${o.time}`,
          status: o.status === "in_progress" ? "pending" : o.status,
          statusLabel:
            o.status === "in_progress"
              ? "En cours"
              : o.status === "delivered"
              ? "Livrée"
              : o.status === "cancelled"
              ? "Annulée"
              : "En cours",
          total: o.total,
          points: o.loyaltyPoints || 0,
          items: [],
        }));
        setOrders([...formatted, ...MOCK_ORDERS]);
      } catch {
        setOrders(MOCK_ORDERS);
      }
    }
  }, []);

  const statusIcons: Record<string, typeof CheckCircle> = {
    delivered: CheckCircle,
    cancelled: XCircle,
    pending: Clock,
    preparing: Package,
    in_progress: Clock,
  };

  const filteredOrders = orders.filter((o) => {
    if (tab === "en_cours") return o.status === "pending" || o.status === "preparing" || o.status === "in_progress";
    if (tab === "passées") return o.status === "delivered";
    return o.status === "cancelled";
  });

  return (
    <div className="animate-fade-in-up">
      <h1 className="foodiz-title text-2xl mb-6">Mes commandes</h1>

      <div className="flex gap-0 border-b border-foodiz-gold/10 mb-6">
        {[
          { key: "en_cours" as Tab, label: "En cours" },
          { key: "passées" as Tab, label: "Passées" },
          { key: "annulées" as Tab, label: "Annulées" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 pb-3 text-xs font-medium text-center border-b-2 transition-all ${
              tab === t.key ? "text-foodiz-gold border-foodiz-gold" : "text-foodiz-gray border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredOrders.map((order) => {
          const StatusIcon = statusIcons[order.status] || Clock;
          return (
            <button
              key={order.id}
              onClick={() => navigate(`/client/orders/${order.id}`)}
              className="w-full foodiz-card p-4 text-left hover:border-foodiz-gold/30 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  order.status === "delivered"
                    ? "bg-foodiz-green/10"
                    : order.status === "cancelled"
                    ? "bg-foodiz-red/10"
                    : "bg-foodiz-gradient-gold"
                }`}>
                  <StatusIcon
                    size={18}
                    className={
                      order.status === "delivered"
                        ? "text-foodiz-green"
                        : order.status === "cancelled"
                        ? "text-foodiz-red"
                        : "text-foodiz-gold"
                    }
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foodiz-cream">{order.restaurant}</h3>
                    <span
                      className={`text-[10px] font-medium ${
                        order.status === "delivered"
                          ? "text-foodiz-green"
                          : order.status === "cancelled"
                          ? "text-foodiz-red"
                          : "text-foodiz-gold"
                      }`}
                    >
                      {order.statusLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-foodiz-gray mt-1">{order.date}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-foodiz-gold text-sm font-semibold">{order.total.toFixed(2).replace(".", ",")} €</span>
                    {order.points > 0 && (
                      <span className="text-[10px] text-foodiz-gold/60 flex items-center gap-1">
                        <Star size={10} /> +{order.points} pts
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-foodiz-gold/30 self-center" />
              </div>

              {order.status === "delivered" && (
                <div className="mt-3 pt-3 border-t border-foodiz-gold/10 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/client/orders/${order.id}/review`);
                    }}
                    className="flex-1 text-center text-[10px] py-2 rounded-lg border border-foodiz-gold/20 text-foodiz-gold hover:bg-foodiz-gold/5 transition-all"
                  >
                    Noter
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/client/restaurants");
                    }}
                    className="flex-1 text-center text-[10px] py-2 rounded-lg bg-foodiz-gold text-foodiz-black font-medium hover:bg-foodiz-gold-light transition-all flex items-center justify-center gap-1"
                  >
                    <RotateCcw size={12} /> Recommander
                  </button>
                </div>
              )}
            </button>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package size={40} className="mx-auto text-foodiz-gold/30 mb-3" />
            <p className="text-foodiz-gray text-sm">Aucune commande dans cette catégorie</p>
          </div>
        )}
      </div>
    </div>
  );
}
