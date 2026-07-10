import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Search, Clock, ChevronRight } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import { supabase } from "../../lib/supabase";
import { getPartnerOrderCustomers } from "../../lib/orderContacts";

export default function PartnerOrdersHistory() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: restaurant } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).single();
      if (!restaurant) return;
      const [{ data }, contacts] = await Promise.all([
        supabase.from("orders").select("id, status, final_client_total_cents, partner_total_cents, created_at, order_items(quantity, product:products(name))").eq("restaurant_id", restaurant.id).in("status", ["delivered", "cancelled"]).order("created_at", { ascending: false }),
        getPartnerOrderCustomers(),
      ]);
      const contactByOrder = new Map(contacts.map((contact) => [contact.order_id, contact]));
      setOrders((data || []).map((order: any) => ({
        ...order,
        client_name: contactByOrder.get(order.id)?.display_name || "Client",
      })));
    };
    load();
  }, []);

  const filtered = useMemo(() => orders.filter((order) => `${order.id} ${order.client?.full_name || order.client?.first_name || ""}`.toLowerCase().includes(search.toLowerCase())), [orders, search]);

  return (
    <div className="min-h-screen bg-weello-black">
      <header className="bg-weello-card border-b border-weello-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/partner")} className="text-weello-gold"><ChevronLeft size={20} /></button>
          <h1 className="weello-title text-lg">Historique des commandes</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="relative mb-6">
          <GoldIcon icon={Search} size={16} className="absolute left-4 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une commande..."
            className="w-full bg-weello-card border border-weello-gold/15 rounded-2xl py-3 pl-10 pr-4 text-weello-cream placeholder-weello-gray/50 text-sm outline-none focus:border-weello-gold/40"
          />
        </div>

        <div className="space-y-2">
          {filtered.map((h) => (
            <button key={h.id} onClick={() => navigate(`/partner/orders/${h.id}`)}
              className="w-full weello-card p-4 flex items-center gap-4 text-left hover:border-weello-gold/30 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-weello-gradient-gold flex items-center justify-center shrink-0">
                <Clock size={18} className="text-weello-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-weello-cream">{h.client_name}</h3>
                  <span className={`text-[10px] font-medium ${h.status === "delivered" ? "text-weello-green" : "text-weello-red"}`}>
                    {h.status === "delivered" ? "Livrée" : "Annulée"}
                  </span>
                </div>
                <p className="text-[11px] text-weello-gray mt-0.5">{(h.order_items || []).map((item: any) => `${item.product?.name || "Produit"} x${item.quantity}`).join(", ")}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-weello-gold text-xs font-semibold">{(h.final_client_total_cents / 100).toFixed(2).replace(".", ",")} €</span>
                  <span className="text-[10px] text-weello-gray">Client</span>
                  <span className="text-[10px] text-weello-gray">•</span>
                  <span className="text-weello-green text-xs font-semibold">{(h.partner_total_cents / 100).toFixed(2).replace(".", ",")} €</span>
                  <span className="text-[10px] text-weello-gray">Reçu</span>
                </div>
                <p className="text-[10px] text-weello-gray/50 mt-1">{new Date(h.created_at).toLocaleDateString("fr-FR")}</p>
              </div>
              <ChevronRight size={16} className="text-weello-gold/30 shrink-0" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
