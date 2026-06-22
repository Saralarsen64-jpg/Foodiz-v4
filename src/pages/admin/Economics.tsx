import { useEffect, useState } from "react";
import { Banknote, Bike, Building2, Gift, HandCoins, ReceiptText, Server, ShieldCheck, Users } from "lucide-react";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

const euros = (cents: number | bigint | null | undefined) => `${(Number(cents || 0) / 100).toFixed(2)} €`;

export default function AdminEconomics() {
  const [balances, setBalances] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [{ data: accountRows }, { data: ledgerRows }] = await Promise.all([
        supabase.from("admin_financial_account_balances").select("*").single(),
        supabase.from("order_financial_ledger").select("*,restaurant:restaurants(name),client:profiles!order_financial_ledger_client_id_fkey(email)").order("created_at", { ascending: false }).limit(50),
      ]);
      setBalances(accountRows);
      setOrders(ledgerRows || []);
      setLoading(false);
    })();
  }, []);

  const accounts = balances ? [
    { label: "Encaissé clients", value: balances.client_collected_cents, icon: Banknote, detail: "Montants réellement payés après avantages" },
    { label: "Dû aux partenaires", value: balances.partner_cents, icon: Building2, detail: "Prix des produits vendus" },
    { label: "Frais de livraison", value: balances.delivery_fee_cents, icon: Bike, detail: "Affectés aux règlements livreurs" },
    { label: "Rémunération livreurs", value: Number(balances.delivery_fee_cents || 0) + Number(balances.courier_earnings_cents || 0) + Number(balances.courier_prime_cents || 0) - Number(balances.courier_penalty_cents || 0), icon: HandCoins, detail: "Net après ajustements de retard" },
    { label: "Foodiz", value: balances.foodiz_revenue_cents, icon: ShieldCheck, detail: "Revenu plateforme enregistré" },
    { label: "Frais service et internes", value: Number(balances.service_fee_cents || 0) + Number(balances.internal_fees_cents || 0), icon: Server, detail: "Exploitation et traitement" },
    { label: "Réserve fidélité", value: balances.loyalty_balance_cents, icon: Gift, detail: `${euros(balances.loyalty_funded_cents)} alimentés · ${euros(balances.loyalty_consumed_cents)} consommés` },
    { label: "Réserve parrainage", value: balances.referral_fund_cents, icon: Users, detail: "Provision dédiée aux bonus éligibles" },
    { label: "Réserve système", value: balances.system_reserve_cents, icon: ReceiptText, detail: "Provision technique Foodiz" },
  ] : [];

  return <AdminShell title="Comptabilité de répartition" subtitle="Journal par commande, réserves et soldes comptables Foodiz">
    <section className="rounded-2xl border border-foodiz-gold/20 bg-foodiz-gold/5 p-4 text-xs leading-relaxed text-foodiz-gray">
      Les réserves fidélité et parrainage ne sont pas des sommes disponibles à distribuer. La fidélité est alimentée à chaque commande et diminuée du coût réellement financé lors de l'utilisation d'un avantage.
    </section>

    {loading ? <div className="foodiz-card p-8 text-center text-foodiz-gray animate-pulse">Chargement du registre...</div> : <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{accounts.map((account) => <article key={account.label} className="foodiz-card p-5"><account.icon size={20} className="text-foodiz-gold"/><p className="mt-4 text-[10px] uppercase tracking-widest text-foodiz-gray">{account.label}</p><p className="mt-2 text-3xl font-serif italic text-foodiz-cream">{euros(account.value)}</p><p className="mt-2 text-[10px] text-foodiz-gray">{account.detail}</p></article>)}</section>

      <section className="foodiz-card overflow-hidden"><div className="border-b border-foodiz-gold/10 p-5"><h2 className="foodiz-title text-lg">Ventilation des commandes</h2><p className="mt-1 text-xs text-foodiz-gray">Les 50 dernières écritures enregistrées.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-xs"><thead className="bg-white/[0.02] text-foodiz-gold"><tr>{["Commande", "Encaissé", "Avantage", "Partenaire", "Livraison", "Livreur net", "Pénalité", "Foodiz", "Interne + service", "Fidélité", "Parrainage", "Réserve"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{orders.map((order) => <tr key={order.id}><td className="px-4 py-4"><p className="font-mono text-foodiz-cream">#{order.order_id.slice(0, 8)}</p><p className="mt-1 text-[9px] text-foodiz-gray">{order.restaurant?.name}</p></td><td className="px-4 py-4">{euros(order.client_collected_cents)}</td><td className="px-4 py-4 text-amber-300">{euros(order.advantage_funded_cents)}</td><td className="px-4 py-4">{euros(order.partner_cents)}</td><td className="px-4 py-4">{euros(order.delivery_fee_cents)}</td><td className="px-4 py-4">{euros(Number(order.delivery_fee_cents) + Number(order.courier_earnings_cents) + Number(order.courier_prime_cents) - Number(order.courier_penalty_cents || 0))}</td><td className="px-4 py-4 text-foodiz-red">-{euros(order.courier_penalty_cents || 0)}</td><td className="px-4 py-4 text-foodiz-gold">{euros(order.foodiz_revenue_cents)}</td><td className="px-4 py-4">{euros(Number(order.internal_fees_cents) + Number(order.service_fee_cents))}</td><td className="px-4 py-4">{euros(order.loyalty_fund_cents)}</td><td className="px-4 py-4">{euros(order.referral_fund_cents)}</td><td className="px-4 py-4">{euros(order.system_reserve_cents)}</td></tr>)}</tbody></table></div></section>
    </>}
  </AdminShell>;
}
