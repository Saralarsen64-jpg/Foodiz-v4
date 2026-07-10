import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Users, Crown, TrendingUp, Star } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { getPartnerOrderCustomers } from "../../lib/orderContacts";

export default function PartnerCustomers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: restaurant } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).single();
      if (!restaurant) return;
      const [{ data }, contacts] = await Promise.all([
        supabase.from("orders").select("id, client_id, final_client_total_cents").eq("restaurant_id", restaurant.id).eq("status", "delivered"),
        getPartnerOrderCustomers(),
      ]);
      const contactByOrder = new Map(contacts.map((contact) => [contact.order_id, contact]));
      const grouped = (data || []).reduce<Record<string, any>>((acc, order: any) => {
        const current = acc[order.client_id] || { name: contactByOrder.get(order.id)?.display_name || "Client", orders: 0, total: 0 };
        current.orders += 1;
        current.total += order.final_client_total_cents / 100;
        acc[order.client_id] = current;
        return acc;
      }, {});
      setCustomers(Object.values(grouped).map((customer: any) => ({
        ...customer,
        avgBasket: customer.total / customer.orders,
        score: customer.orders >= 15 ? "Elite" : customer.orders >= 8 ? "Gold" : customer.orders >= 3 ? "Silver" : "Nouveau",
        retention: customer.orders >= 10 ? "Très fidèle" : customer.orders >= 4 ? "Récurrent" : "Occasionnel",
      })).sort((a, b) => b.orders - a.orders).slice(0, 10));
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-weello-black pb-24">
      <header className="bg-weello-card border-b border-weello-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/partner")} className="text-weello-gold"><ChevronLeft size={20} /></button>
          <h1 className="weello-title text-lg">Top 10 meilleurs clients</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="weello-card p-5 bg-[linear-gradient(135deg,rgba(216,168,79,0.12),rgba(17,17,17,0.96)_28%,rgba(5,5,5,1)_100%)] border-weello-gold/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-weello-gold/12 border border-weello-gold/15 flex items-center justify-center">
              <Crown size={20} className="text-weello-gold" />
            </div>
            <div>
              <h2 className="weello-title text-lg">Clients les plus fidèles</h2>
              <p className="text-weello-gray text-xs mt-1">Analyse de fréquence, panier moyen et rétention</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {customers.length === 0 && <div className="weello-card p-4 text-sm text-weello-gray">Aucun client livré pour le moment.</div>}
          {customers.map((customer, index) => (
            <div key={customer.name} className="weello-card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-weello-gold/10 border border-weello-gold/15 flex items-center justify-center text-weello-gold font-bold shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-weello-cream">{customer.name}</p>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-weello-gold/10 border border-weello-gold/15 text-weello-gold uppercase tracking-widest">
                    {customer.score}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px] text-weello-gray">
                  <span className="flex items-center gap-1"><Users size={10} className="text-weello-gold/60" /> {customer.orders} commandes</span>
                  <span className="flex items-center gap-1"><TrendingUp size={10} className="text-weello-gold/60" /> panier moyen {customer.avgBasket.toFixed(2).replace(".", ",")} €</span>
                  <span className="flex items-center gap-1"><Star size={10} className="text-weello-gold/60" /> {customer.retention}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
