import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, MapPin, ReceiptText } from "lucide-react";
import { supabase } from "../../lib/supabase";
import CourierShell from "../../components/CourierShell";

export default function DeliveriesHistoryPage() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  useEffect(() => { (async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const { data } = await supabase.from("orders").select("id, delivered_at, delivery_address, courier_earnings_cents, courier_prime_fund_cents, restaurant:restaurants(name)").eq("courier_id", user.id).eq("status", "delivered").order("delivered_at", { ascending: false }); setDeliveries(data || []); })(); }, []);
  return <CourierShell title="Historique" back="/courier"><div className="space-y-3">{deliveries.length === 0 && <div className="foodiz-card p-10 text-center"><ReceiptText size={38} className="text-foodiz-gold/30 mx-auto" /><p className="text-foodiz-gray text-sm mt-4">Votre première livraison apparaîtra ici.</p></div>}{deliveries.map((delivery) => <button key={delivery.id} onClick={() => navigate(`/courier/deliveries/${delivery.id}/tracking`)} className="w-full foodiz-card p-5 text-left bg-white/[0.025] flex gap-4"><div className="w-12 h-12 rounded-2xl bg-foodiz-green/10 border border-foodiz-green/20 flex items-center justify-center"><CheckCircle2 size={19} className="text-foodiz-green" /></div><div className="flex-1 min-w-0"><p className="text-foodiz-cream font-semibold">{delivery.restaurant?.name || "Restaurant"}</p><p className="text-xs text-foodiz-gray mt-1 flex items-center gap-1 truncate"><MapPin size={11} /> {delivery.delivery_address}</p><p className="text-[10px] text-foodiz-gray mt-2">{new Date(delivery.delivered_at).toLocaleString("fr-FR")}</p></div><p className="text-foodiz-green font-serif text-lg">+{(((delivery.courier_earnings_cents || 0) + (delivery.courier_prime_fund_cents || 0)) / 100).toFixed(2)} €</p></button>)}</div></CourierShell>;
}
