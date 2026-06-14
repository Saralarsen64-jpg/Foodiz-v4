import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CreditCard } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function AdminSubscriptions() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  useEffect(() => { void supabase.from("partner_subscriptions").select("id,status,billing_period,current_period_end,restaurant:restaurants(name),plan:foodiz_plus_plans(name,monthly_campaign_limit)").order("created_at", { ascending: false }).then(({ data }) => setSubscriptions(data || [])); }, []);
  return <div className="min-h-screen bg-foodiz-black text-foodiz-cream"><header className="border-b border-foodiz-gold/10 bg-foodiz-card px-6 py-4"><div className="mx-auto flex max-w-6xl items-center gap-3"><button onClick={() => navigate("/admin")} className="text-foodiz-gold"><ChevronLeft size={20}/></button><h1 className="foodiz-title text-lg">Abonnements Foodiz+</h1></div></header><main className="mx-auto max-w-6xl space-y-3 p-6">{subscriptions.length === 0 && <div className="foodiz-card p-5 text-sm text-foodiz-gray">Aucun abonnement réel enregistré.</div>}{subscriptions.map((subscription) => <article key={subscription.id} className="foodiz-card flex items-center justify-between p-4"><div className="flex items-center gap-3"><CreditCard size={18} className="text-foodiz-gold"/><div><p className="text-sm font-medium">{subscription.restaurant?.name || "Établissement"} · {subscription.plan?.name || "Forfait inconnu"}</p><p className="mt-1 text-[10px] text-foodiz-gray">{subscription.billing_period} · renouvellement {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString("fr-FR") : "non défini"}</p></div></div><span className="text-xs uppercase text-foodiz-gold">{subscription.status}</span></article>)}</main></div>;
}
