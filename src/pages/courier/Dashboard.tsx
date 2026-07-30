import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Bike, CheckCircle2, Clock3, MapPinned, Navigation, Power, ShieldCheck, WalletCards } from "lucide-react";
import { supabase } from "../../lib/supabase";
import CourierShell from "../../components/CourierShell";
import { updateCourierPresence } from "../../lib/courierPresence";
import toast from "react-hot-toast";
import { WeelloActionCard, WeelloHero, WeelloMetricCard, WeelloPill } from "../../components/WeelloWebUI";

export default function CourierDashboard() {
  const navigate = useNavigate();
  const [name, setName] = useState("Livreur");
  const [online, setOnline] = useState(false);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [available, setAvailable] = useState(0);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [{ data: profile, error: profileError }, { data: delivered, error: deliveredError }, { data: active, error: activeError }] = await Promise.all([
        supabase.from("profiles").select("full_name, courier_online").eq("id", user.id).single(),
        supabase.from("orders").select("delivery_fee_cents, courier_earnings_cents, courier_prime_fund_cents, courier_delay_penalty_cents").eq("courier_id", user.id).eq("status", "delivered").gte("delivered_at", today.toISOString()),
        supabase.from("orders").select("id, status, delivery_address, restaurant:restaurants(name)").eq("courier_id", user.id).in("status", ["pickup", "picked_up", "delivering"]).limit(1).maybeSingle(),
      ]);
      if (profileError || deliveredError || activeError) throw profileError || deliveredError || activeError;

      setName(profile?.full_name?.split(" ")[0] || "Livreur"); setOnline(Boolean(profile?.courier_online));
      setTodayDeliveries(delivered?.length || 0); setTodayEarnings((delivered || []).reduce((sum, order) => sum + (order.delivery_fee_cents || 0) + (order.courier_earnings_cents || 0) + (order.courier_prime_fund_cents || 0) - (order.courier_delay_penalty_cents || 0), 0) / 100);
      setActiveOrder(active);
      if (profile?.courier_online) {
        await updateCourierPresence(true);
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch("/api/courier-deliveries", { headers: { Authorization: `Bearer ${session?.access_token || ""}` } });
        const payload = await response.json().catch(() => ({}));
        setAvailable(response.ok ? payload.deliveries?.length || 0 : 0);
      } else {
        setAvailable(0);
      }
      setLoadError(false);
    } catch (error) {
      console.error("Courier dashboard loading error", error);
      setLoadError(true);
      setAvailable(0);
    }
  };

  useEffect(() => { void load(); const interval = window.setInterval(() => void load(), 20000); return () => window.clearInterval(interval); }, []);

  const toggleOnline = async () => {
    const next = !online;
    try {
      await updateCourierPresence(next);
      setOnline(next);
      if (!next) setAvailable(0); else void load();
    } catch (error: any) {
      toast.error(error.message || "Impossible de modifier votre disponibilité.");
    }
  };

  if (loadError) return <CourierShell>
    <section className="rounded-[1.75rem] border border-red-400/20 bg-red-400/[0.06] p-6 text-center">
      <h1 className="text-xl font-bold text-weello-cream">Votre espace livreur est momentanément indisponible</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-weello-gray">Votre dossier reste validé et votre compte est bien conservé. Réessayez dans un instant.</p>
      <button type="button" onClick={() => void load()} className="mt-5 rounded-2xl bg-weello-cream px-5 py-3 text-sm font-bold text-weello-black hover:bg-white">Réessayer</button>
    </section>
  </CourierShell>;

  return <CourierShell>
    <WeelloHero
      eyebrow={`Bonjour ${name}`}
      title="Prêt pour la route ?"
      description="Votre journée, vos courses, votre rythme. Weello privilégie une position précise, des étapes confirmées et une livraison rassurante pour le client."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeelloPill tone={online ? "green" : "muted"}>
          {online ? "En ligne" : "Hors ligne"}
        </WeelloPill>
        <button
          onClick={toggleOnline}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${
            online
              ? "border-weello-green bg-weello-green text-white shadow-[0_0_35px_rgba(63,167,109,0.25)]"
              : "border-weello-gold/25 bg-weello-gold/10 text-weello-gold hover:bg-weello-gold hover:text-weello-black"
          }`}
        >
          <Power size={18} /> {online ? "Passer hors ligne" : "Passer en ligne"}
        </button>
      </div>
    </WeelloHero>

    {activeOrder && <button onClick={() => navigate(`/courier/deliveries/${activeOrder.id}/tracking`)} className="w-full mt-4 rounded-[1.6rem] border border-weello-green/25 bg-weello-green/[0.08] p-5 text-left flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-weello-green/15 flex items-center justify-center"><Navigation size={20} className="text-weello-green" /></div><div className="flex-1"><p className="text-[10px] uppercase tracking-widest text-weello-green">Course active</p><p className="text-weello-cream font-semibold mt-1">{activeOrder.restaurant?.name || "Restaurant"}</p><p className="text-xs text-weello-gray mt-1 truncate">{activeOrder.delivery_address}</p></div><ArrowUpRight size={18} className="text-weello-green" /></button>}

    <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <WeelloMetricCard label="Gains" value={`${todayEarnings.toFixed(2)} €`} helper="aujourd’hui" icon={WalletCards} tone="green" />
      <WeelloMetricCard label="Courses" value={todayDeliveries} helper="terminées" icon={CheckCircle2} />
      <WeelloMetricCard label="Disponibles" value={available} helper={online ? "autour de vous" : "passez en ligne"} icon={MapPinned} tone={available ? "green" : "muted"} />
    </section>

    <button disabled={!online} onClick={() => navigate("/courier/deliveries/available")} className="w-full mt-4 rounded-[1.6rem] bg-weello-gold text-weello-black p-5 flex items-center gap-4 disabled:opacity-40"><div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center"><MapPinned size={22} /></div><div className="flex-1 text-left"><p className="font-bold">{available} course{available > 1 ? "s" : ""} disponible{available > 1 ? "s" : ""}</p><p className="text-xs text-black/65 mt-1">Voir les missions autour de vous</p></div><ArrowUpRight size={20} /></button>

    <section className="mt-4 grid gap-3">
      <WeelloActionCard
        title="Assurez votre activité avec un partenaire Weello"
        description="Demandez à être rappelé par un partenaire spécialisé. Vous restez libre de choisir votre assureur."
        icon={ShieldCheck}
        badge="Mise en relation"
        onClick={() => navigate("/courier/insurance")}
      />
      {[
        { label: "Historique", icon: Clock3, path: "/courier/deliveries/history", desc: "Retrouvez les courses terminées et les détails associés." },
        { label: "Mes gains", icon: WalletCards, path: "/courier/revenues", desc: "Suivez vos revenus, primes et pénalités éventuelles." },
        { label: "Mon profil", icon: Bike, path: "/courier/profile", desc: "Gérez votre profil, vos justificatifs et vos informations livreur." },
      ].map((item) => (
        <WeelloActionCard
          key={item.path}
          title={item.label}
          description={item.desc}
          icon={item.icon}
          onClick={() => navigate(item.path)}
        />
      ))}
    </section>
  </CourierShell>;
}
