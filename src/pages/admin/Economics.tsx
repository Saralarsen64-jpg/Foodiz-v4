import { useEffect, useState } from "react";
import { Banknote, Bike, Building2, Calculator, Gift, HandCoins, Percent, ReceiptText, Server, ShieldCheck, TrendingUp, Users } from "lucide-react";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

const euros = (cents: number | bigint | null | undefined) => `${(Number(cents || 0) / 100).toFixed(2)} €`;
const cents = (value: number | bigint | null | undefined) => Number(value || 0);

export default function AdminEconomics() {
  const [balances, setBalances] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [completedOrderCount, setCompletedOrderCount] = useState(0);
  const [stripePercent, setStripePercent] = useState(1.5);
  const [stripeFixedCents, setStripeFixedCents] = useState(25);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [{ data: accountRows }, { data: ledgerRows }, { count: completedCount }] = await Promise.all([
        supabase.from("admin_financial_account_balances").select("*").single(),
        supabase.from("order_financial_ledger").select("*,restaurant:restaurants(name),client:profiles!order_financial_ledger_client_id_fkey(email)").order("created_at", { ascending: false }).limit(50),
        supabase.from("order_financial_ledger").select("id", { count: "exact", head: true }).eq("payment_status", "completed"),
      ]);
      setBalances(accountRows);
      setOrders(ledgerRows || []);
      setCompletedOrderCount(completedCount || 0);
      setLoading(false);
    })();
  }, []);

  const accounts = balances ? [
    { label: "Encaissé clients", value: balances.client_collected_cents, icon: Banknote, detail: "Montants réellement payés après avantages" },
    { label: "Dû aux partenaires", value: balances.partner_cents, icon: Building2, detail: "Prix des produits vendus" },
    { label: "Frais de livraison", value: balances.delivery_fee_cents, icon: Bike, detail: "Affectés aux règlements livreurs" },
    { label: "Rémunération livreurs", value: Number(balances.delivery_fee_cents || 0) + Number(balances.courier_earnings_cents || 0) + Number(balances.courier_prime_cents || 0) - Number(balances.courier_penalty_cents || 0), icon: HandCoins, detail: "Net après ajustements de retard" },
    { label: "Weello", value: balances.foodiz_revenue_cents, icon: ShieldCheck, detail: "Revenu plateforme enregistré" },
    { label: "Frais service et internes", value: Number(balances.service_fee_cents || 0) + Number(balances.internal_fees_cents || 0), icon: Server, detail: "Exploitation et traitement" },
    { label: "Réserve fidélité", value: balances.loyalty_balance_cents, icon: Gift, detail: `${euros(balances.loyalty_funded_cents)} alimentés · ${euros(balances.loyalty_consumed_cents)} consommés` },
    { label: "Réserve parrainage", value: balances.referral_fund_cents, icon: Users, detail: "Provision dédiée aux bonus éligibles" },
    { label: "Réserve système", value: balances.system_reserve_cents, icon: ReceiptText, detail: "Provision technique Weello" },
  ] : [];

  const collectedCents = cents(balances?.client_collected_cents);
  const foodizOperatingGrossCents =
    cents(balances?.foodiz_revenue_cents)
    + cents(balances?.service_fee_cents)
    + cents(balances?.internal_fees_cents)
    + cents(balances?.system_reserve_cents);
  const growthReserveCents = cents(balances?.loyalty_balance_cents) + cents(balances?.referral_fund_cents);
  const estimatedStripeFeesCents = Math.max(0, Math.round(collectedCents * (Math.max(0, stripePercent) / 100)) + (completedOrderCount * Math.max(0, stripeFixedCents)));
  const estimatedNetMarginCents = foodizOperatingGrossCents - growthReserveCents - estimatedStripeFeesCents;
  const estimatedNetRate = collectedCents > 0 ? (estimatedNetMarginCents / collectedCents) * 100 : 0;
  const manualPayoutExposureCents =
    cents(balances?.partner_cents)
    + cents(balances?.delivery_fee_cents)
    + cents(balances?.courier_earnings_cents)
    + cents(balances?.courier_prime_cents)
    - cents(balances?.courier_penalty_cents);

  return <AdminShell title="Comptabilité de répartition" subtitle="Journal par commande, réserves et soldes comptables Weello">
    <section className="rounded-2xl border border-weello-gold/20 bg-weello-gold/5 p-4 text-xs leading-relaxed text-weello-gray">
      Les réserves fidélité et parrainage ne sont pas des sommes disponibles à distribuer. La fidélité est alimentée à chaque commande et diminuée du coût réellement financé lors de l'utilisation d'un avantage.
    </section>

    {loading ? <div className="weello-card p-8 text-center text-weello-gray animate-pulse">Chargement du registre...</div> : <>
      <section className="weello-card overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="border-b border-weello-gold/10 p-5 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-weello-gold/30 bg-weello-gold/10 text-weello-gold">
                <Calculator size={20} />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-weello-gold">Pilotage gratuit</p>
                <h2 className="weello-title text-xl">Marge Weello estimée</h2>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-weello-gray">
              Cette vue te permet de piloter à moindre coût : Stripe encaisse, Weello garde la main sur les virements manuels, et l'écran estime ce qui reste après réserves fidélité/parrainage et frais de paiement simulés.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <TrendingUp size={18} className="text-weello-gold" />
                <p className="mt-3 text-[10px] uppercase tracking-widest text-weello-gray">Brut Weello</p>
                <p className="mt-1 text-2xl font-serif italic text-weello-cream">{euros(foodizOperatingGrossCents)}</p>
                <p className="mt-2 text-[10px] text-weello-gray">Weello + service + réserve interne.</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <Gift size={18} className="text-weello-gold" />
                <p className="mt-3 text-[10px] uppercase tracking-widest text-weello-gray">Réserves clients</p>
                <p className="mt-1 text-2xl font-serif italic text-weello-cream">{euros(growthReserveCents)}</p>
                <p className="mt-2 text-[10px] text-weello-gray">Fidélité + parrainage à honorer.</p>
              </article>
              <article className={`rounded-2xl border p-4 ${estimatedNetMarginCents >= 0 ? "border-weello-gold/25 bg-weello-gold/10" : "border-weello-red/30 bg-weello-red/10"}`}>
                <Percent size={18} className={estimatedNetMarginCents >= 0 ? "text-weello-gold" : "text-weello-red"} />
                <p className="mt-3 text-[10px] uppercase tracking-widest text-weello-gray">Net estimé</p>
                <p className="mt-1 text-2xl font-serif italic text-weello-cream">{euros(estimatedNetMarginCents)}</p>
                <p className="mt-2 text-[10px] text-weello-gray">{estimatedNetRate.toFixed(1)}% de l'encaissé client.</p>
              </article>
            </div>
          </div>

          <div className="p-5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-weello-gold">Simulation frais Stripe</p>
            <p className="mt-2 text-sm text-weello-gray">
              À ajuster selon tes vrais frais. Pour démarrer gratuitement côté automatisation, on garde les virements manuels.
            </p>
            <div className="mt-5 grid gap-3">
              <label className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <span className="text-[10px] uppercase tracking-widest text-weello-gray">Pourcentage estimé</span>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={stripePercent}
                    onChange={(event) => setStripePercent(Number(event.target.value))}
                    className="w-full bg-transparent text-2xl font-serif italic text-weello-cream outline-none"
                  />
                  <span className="text-weello-gold">%</span>
                </div>
              </label>
              <label className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <span className="text-[10px] uppercase tracking-widest text-weello-gray">Fixe par paiement</span>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={(stripeFixedCents / 100).toFixed(2)}
                    onChange={(event) => setStripeFixedCents(Math.round(Number(event.target.value) * 100))}
                    className="w-full bg-transparent text-2xl font-serif italic text-weello-cream outline-none"
                  />
                  <span className="text-weello-gold">€</span>
                </div>
              </label>
            </div>
            <div className="mt-5 rounded-2xl border border-weello-gold/20 bg-weello-gold/5 p-4 text-xs leading-relaxed text-weello-gray">
              <p><span className="text-weello-cream">Frais estimés :</span> {euros(estimatedStripeFeesCents)} sur {completedOrderCount} commande{completedOrderCount > 1 ? "s" : ""} payée{completedOrderCount > 1 ? "s" : ""}.</p>
              <p className="mt-2"><span className="text-weello-cream">À virer manuellement :</span> {euros(manualPayoutExposureCents)} aux partenaires et livreurs, depuis l'écran Virements.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{accounts.map((account) => <article key={account.label} className="weello-card p-5"><account.icon size={20} className="text-weello-gold"/><p className="mt-4 text-[10px] uppercase tracking-widest text-weello-gray">{account.label}</p><p className="mt-2 text-3xl font-serif italic text-weello-cream">{euros(account.value)}</p><p className="mt-2 text-[10px] text-weello-gray">{account.detail}</p></article>)}</section>

      <section className="weello-card overflow-hidden"><div className="border-b border-weello-gold/10 p-5"><h2 className="weello-title text-lg">Ventilation des commandes</h2><p className="mt-1 text-xs text-weello-gray">Les 50 dernières écritures enregistrées.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-xs"><thead className="bg-white/[0.02] text-weello-gold"><tr>{["Commande", "Encaissé", "Avantage", "Partenaire", "Livraison", "Livreur net", "Pénalité", "Weello", "Interne + service", "Fidélité", "Parrainage", "Réserve"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{orders.map((order) => <tr key={order.id}><td className="px-4 py-4"><p className="font-mono text-weello-cream">#{order.order_id.slice(0, 8)}</p><p className="mt-1 text-[9px] text-weello-gray">{order.restaurant?.name}</p></td><td className="px-4 py-4">{euros(order.client_collected_cents)}</td><td className="px-4 py-4 text-amber-300">{euros(order.advantage_funded_cents)}</td><td className="px-4 py-4">{euros(order.partner_cents)}</td><td className="px-4 py-4">{euros(order.delivery_fee_cents)}</td><td className="px-4 py-4">{euros(Number(order.delivery_fee_cents) + Number(order.courier_earnings_cents) + Number(order.courier_prime_cents) - Number(order.courier_penalty_cents || 0))}</td><td className="px-4 py-4 text-weello-red">-{euros(order.courier_penalty_cents || 0)}</td><td className="px-4 py-4 text-weello-gold">{euros(order.foodiz_revenue_cents)}</td><td className="px-4 py-4">{euros(Number(order.internal_fees_cents) + Number(order.service_fee_cents))}</td><td className="px-4 py-4">{euros(order.loyalty_fund_cents)}</td><td className="px-4 py-4">{euros(order.referral_fund_cents)}</td><td className="px-4 py-4">{euros(order.system_reserve_cents)}</td></tr>)}</tbody></table></div></section>
    </>}
  </AdminShell>;
}
