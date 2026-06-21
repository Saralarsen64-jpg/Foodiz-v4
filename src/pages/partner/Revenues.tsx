import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, TrendingUp, DollarSign, ShoppingBag, ReceiptText } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import { supabase } from "../../lib/supabase";

export default function PartnerRevenues() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: restaurant } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).maybeSingle();
    if (!restaurant) { setLoading(false); return; }
    const { data } = await supabase.from("orders").select("id,partner_total_cents,final_client_total_cents,delivered_at,created_at,order_items(quantity,total_price_cents,partner_total_price_cents,product:products(name))").eq("restaurant_id", restaurant.id).eq("status", "delivered").order("delivered_at", { ascending: false });
    setOrders(data || []); setLoading(false);
  })(); }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const monthOrders = orders.filter((order) => { const date = new Date(order.delivered_at || order.created_at); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); });
    const yearOrders = orders.filter((order) => new Date(order.delivered_at || order.created_at).getFullYear() === now.getFullYear());
    const sum = (list: any[]) => list.reduce((total, order) => total + (order.partner_total_cents || 0), 0) / 100;
    const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const order of orders) for (const item of order.order_items || []) {
      const name = item.product?.name || "Produit archivé";
      const current = productMap.get(name) || { name, qty: 0, revenue: 0 };
      current.qty += item.quantity || 0; current.revenue += (item.partner_total_price_cents ?? item.total_price_cents ?? 0) / 100; productMap.set(name, current);
    }
    const months = Array.from({ length: 6 }, (_, offset) => { const date = new Date(now.getFullYear(), now.getMonth() - 5 + offset, 1); const value = orders.filter((order) => { const delivered = new Date(order.delivered_at || order.created_at); return delivered.getMonth() === date.getMonth() && delivered.getFullYear() === date.getFullYear(); }).reduce((total, order) => total + (order.partner_total_cents || 0), 0) / 100; return { label: date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""), value }; });
    return { monthRevenue: sum(monthOrders), yearRevenue: sum(yearOrders), monthCount: monthOrders.length, averageBasket: monthOrders.length ? sum(monthOrders) / monthOrders.length : 0, months, topProducts: [...productMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5) };
  }, [orders]);
  const maxRevenue = Math.max(1, ...stats.months.map((month) => month.value));

  return <div className="min-h-screen bg-foodiz-black"><header className="sticky top-0 z-30 border-b border-foodiz-gold/10 bg-foodiz-card px-4 py-3"><div className="mx-auto flex max-w-6xl items-center gap-3"><button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={20}/></button><h1 className="foodiz-title text-lg">Revenus & analyses</h1></div></header><main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
    {loading ? <div className="foodiz-card p-8 text-center text-foodiz-gray animate-pulse">Calcul des revenus...</div> : <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        { label: "Revenus du mois", value: `${stats.monthRevenue.toFixed(2)} €`, icon: DollarSign }, { label: "Revenus annuels", value: `${stats.yearRevenue.toFixed(2)} €`, icon: TrendingUp }, { label: "Panier partenaire moyen", value: `${stats.averageBasket.toFixed(2)} €`, icon: ShoppingBag }, { label: "Commandes ce mois", value: stats.monthCount, icon: ReceiptText },
      ].map((item) => <div key={item.label} className="foodiz-card p-4"><GoldIcon icon={item.icon} size={18}/><p className="mt-3 text-xl font-bold font-serif text-foodiz-cream">{item.value}</p><p className="mt-1 text-[10px] text-foodiz-gray">{item.label}</p></div>)}</div>
      <div className="foodiz-card p-5"><h3 className="foodiz-title mb-4 text-sm">Six derniers mois</h3><div className="flex h-44 items-end gap-2">{stats.months.map((month) => <div key={month.label} className="flex flex-1 flex-col items-center gap-2"><span className="text-[9px] text-foodiz-gray">{month.value.toFixed(0)} €</span><div className="w-full rounded-t-lg bg-gradient-to-t from-foodiz-gold/55 to-foodiz-gold/20" style={{ height: `${(month.value / maxRevenue) * 100}%` }}/><span className="text-[10px] capitalize text-foodiz-gray">{month.label}</span></div>)}</div></div>
      <div className="foodiz-card p-5"><h3 className="foodiz-title mb-4 text-sm">Produits les plus vendus</h3>{stats.topProducts.length === 0 ? <p className="text-sm text-foodiz-gray">Aucune vente livrée.</p> : <div className="space-y-3">{stats.topProducts.map((product, index) => <div key={product.name} className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="w-4 text-[10px] text-foodiz-gray">{index + 1}</span><span className="text-sm text-foodiz-cream">{product.name}</span></div><div className="text-right"><span className="text-xs font-semibold text-foodiz-gold">{product.revenue.toFixed(2)} €</span><p className="text-[9px] text-foodiz-gray">{product.qty} vendu(s)</p></div></div>)}</div>}</div>
    </>}
  </main></div>;
}
