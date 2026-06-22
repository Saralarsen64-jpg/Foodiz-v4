import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Clock, Navigation, ReceiptText } from "lucide-react";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

const euros = (cents: number) => `${((cents || 0) / 100).toFixed(2)} €`;

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [expanded, setExpanded] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("orders").select("*,client:profiles!orders_client_id_fkey(full_name,email),restaurant:restaurants!orders_restaurant_id_fkey(name),ledger:order_financial_ledger(*)").order("created_at", { ascending: false }).limit(100);
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { void load(); const channel = supabase.channel("admin-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void load()).subscribe(); return () => { void supabase.removeChannel(channel); }; }, []);

  return <AdminShell title="Commandes et répartitions" subtitle="Suivi opérationnel et justification financière par commande">
    {loading ? <div className="text-foodiz-gray animate-pulse">Chargement...</div> : <div className="space-y-3">{orders.length === 0 && <div className="foodiz-card p-8 text-center text-foodiz-gray">Aucune commande.</div>}{orders.map((order) => { const ledger = Array.isArray(order.ledger) ? order.ledger[0] : order.ledger; const isOpen = expanded === order.id; return <article key={order.id} className="foodiz-card overflow-hidden"><button onClick={() => setExpanded(isOpen ? "" : order.id)} className="flex w-full items-center gap-4 p-4 text-left"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foodiz-gold/10"><ReceiptText size={17} className="text-foodiz-gold"/></div><div className="min-w-0 flex-1"><p className="font-mono text-sm text-foodiz-cream">#{order.id.slice(0, 8)} · {order.restaurant?.name || "Restaurant"}</p><p className="mt-1 text-[10px] text-foodiz-gray">{order.client?.full_name || order.client?.email || "Client"} · {new Date(order.created_at).toLocaleString("fr-FR")}</p></div><p className="font-semibold text-foodiz-gold">{euros(order.final_client_total_cents)}</p><span className="hidden text-[10px] uppercase text-foodiz-gray sm:block">{order.status}</span>{isOpen ? <ChevronUp size={17}/> : <ChevronDown size={17}/>}</button>{isOpen && <div className="border-t border-foodiz-gold/10 p-4">{order.delivery_route_is_fallback && <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200"><AlertTriangle className="mt-0.5 shrink-0" size={16}/><span>OpenRouteService était indisponible lors du calcul. Les frais utilisent temporairement la distance à vol d’oiseau et aucune ETA vérifiée n’est appliquée.</span></div>}<p className="mb-4 flex flex-wrap items-center gap-2 text-[10px] text-foodiz-gray"><Navigation size={12}/>Routage : {order.delivery_route_provider || "non calculé"} · {typeof order.delivery_route_distance_meters === "number" ? `${(order.delivery_route_distance_meters / 1000).toFixed(2)} km` : "distance indisponible"} · {order.delivery_route_duration_seconds ? `${Math.ceil(order.delivery_route_duration_seconds / 60)} min` : "ETA indisponible"}</p>{!ledger ? <p className="text-xs text-foodiz-gray">L'écriture sera disponible après confirmation du paiement.</p> : <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
      ["Encaissé client", ledger.client_collected_cents], ["Avantage financé", ledger.advantage_funded_cents], ["Partenaire", ledger.partner_cents], ["Frais livraison", ledger.delivery_fee_cents], ["Livreur net", Number(ledger.delivery_fee_cents) + Number(ledger.courier_earnings_cents) + Number(ledger.courier_prime_cents) - Number(ledger.courier_penalty_cents || 0)], ["Pénalité retard", ledger.courier_penalty_cents || 0], ["Foodiz", ledger.foodiz_revenue_cents], ["Service + interne", Number(ledger.service_fee_cents) + Number(ledger.internal_fees_cents)], ["Fidélité", ledger.loyalty_fund_cents], ["Parrainage", ledger.referral_fund_cents], ["Réserve système", ledger.system_reserve_cents]
    ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/5 bg-white/[0.02] p-3"><p className="text-[9px] uppercase text-foodiz-gray">{label}</p><p className="mt-1 text-sm text-foodiz-cream">{euros(Number(value))}</p></div>)}</div><p className="mt-4 flex items-center gap-2 text-[10px] text-foodiz-gray"><Clock size={12}/>Paiement : {ledger.payment_status} · livraison : {ledger.order_status}</p></>}</div>}</article>; })}</div>}
  </AdminShell>;
}
