import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Users, Crown, TrendingUp, Star } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function PartnerCustomers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: restaurant } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).single();
      if (!restaurant) return;
      const { data } = await supabase.from("orders").select("client_id, final_client_total_cents, client:profiles!orders_client_id_fkey(full_name, first_name, last_name)").eq("restaurant_id", restaurant.id).eq("status", "delivered");
      const grouped = (data || []).reduce<Record<string, any>>((acc, order: any) => {
        const current = acc[order.client_id] || { name: order.client?.full_name || [order.client?.first_name, order.client?.last_name].filter(Boolean).join(" ") || "Client", orders: 0, total: 0 };
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
    <div className="min-h-screen bg-foodiz-black pb-24">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">Top 10 meilleurs clients</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="foodiz-card p-5 bg-[linear-gradient(135deg,rgba(216,168,79,0.12),rgba(17,17,17,0.96)_28%,rgba(5,5,5,1)_100%)] border-foodiz-gold/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-foodiz-gold/12 border border-foodiz-gold/15 flex items-center justify-center">
              <Crown size={20} className="text-foodiz-gold" />
            </div>
            <div>
              <h2 className="foodiz-title text-lg">Clients les plus fidèles</h2>
              <p className="text-foodiz-gray text-xs mt-1">Analyse de fréquence, panier moyen et rétention</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {customers.length === 0 && <div className="foodiz-card p-4 text-sm text-foodiz-gray">Aucun client livré pour le moment.</div>}
          {customers.map((customer, index) => (
            <div key={customer.name} className="foodiz-card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-foodiz-gold/10 border border-foodiz-gold/15 flex items-center justify-center text-foodiz-gold font-bold shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foodiz-cream">{customer.name}</p>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-foodiz-gold/10 border border-foodiz-gold/15 text-foodiz-gold uppercase tracking-widest">
                    {customer.score}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px] text-foodiz-gray">
                  <span className="flex items-center gap-1"><Users size={10} className="text-foodiz-gold/60" /> {customer.orders} commandes</span>
                  <span className="flex items-center gap-1"><TrendingUp size={10} className="text-foodiz-gold/60" /> panier moyen {customer.avgBasket.toFixed(2).replace(".", ",")} €</span>
                  <span className="flex items-center gap-1"><Star size={10} className="text-foodiz-gold/60" /> {customer.retention}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
