import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Bike, CheckCircle2, Clock3, MapPinned, Navigation, Power, Sparkles, WalletCards } from "lucide-react";
import { supabase } from "../../lib/supabase";
import CourierShell from "../../components/CourierShell";

export default function CourierDashboard() {
  const navigate = useNavigate();
  const [name, setName] = useState("Livreur");
  const [online, setOnline] = useState(false);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [available, setAvailable] = useState(0);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [{ data: profile }, { data: delivered }, { data: active }] = await Promise.all([
      supabase.from("profiles").select("full_name, courier_online").eq("id", user.id).single(),
      supabase.from("orders").select("courier_earnings_cents, courier_prime_fund_cents").eq("courier_id", user.id).eq("status", "delivered").gte("delivered_at", today.toISOString()),
      supabase.from("orders").select("id, status, delivery_address, restaurant:restaurants(name)").eq("courier_id", user.id).in("status", ["pickup", "picked_up", "delivering"]).limit(1).maybeSingle(),
    ]);
    setName(profile?.full_name?.split(" ")[0] || "Livreur"); setOnline(Boolean(profile?.courier_online));
    setTodayDeliveries(delivered?.length || 0); setTodayEarnings((delivered || []).reduce((sum, order) => sum + (order.courier_earnings_cents || 0) + (order.courier_prime_fund_cents || 0), 0) / 100);
    setActiveOrder(active);
    if (profile?.courier_online) {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/courier-deliveries", { headers: { Authorization: `Bearer ${session?.access_token || ""}` } });
      const payload = await response.json().catch(() => ({}));
      setAvailable(response.ok ? payload.deliveries?.length || 0 : 0);
    } else {
      setAvailable(0);
    }
  };

  useEffect(() => { void load(); const interval = window.setInterval(() => void load(), 20000); return () => window.clearInterval(interval); }, []);

  const toggleOnline = async () => { const next = !online; const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const { error } = await supabase.from("profiles").update({ courier_online: next }).eq("id", user.id); if (!error) { setOnline(next); if (!next) setAvailable(0); else void load(); } };

  return <CourierShell>
    <section className="rounded-[2rem] border border-foodiz-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,0.18),rgba(17,17,17,0.97)_38%,rgba(5,5,5,1))] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
      <div className="flex justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-foodiz-gold flex items-center gap-2"><Sparkles size={12} /> Bonjour {name}</p><h1 className="foodiz-title text-3xl mt-3">Prêt pour la route ?</h1><p className="text-foodiz-gray text-sm mt-2">Votre journée, vos courses, votre rythme.</p></div><button onClick={toggleOnline} className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${online ? "bg-foodiz-green text-white border-foodiz-green shadow-[0_0_35px_rgba(63,167,109,0.3)]" : "bg-white/5 text-foodiz-gray border-white/10"}`}><Power size={22} /></button></div>
      <div className="mt-6 flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${online ? "bg-foodiz-green animate-pulse" : "bg-foodiz-gray"}`} /><span className="text-xs text-foodiz-cream">{online ? "En ligne, visible pour les nouvelles courses" : "Hors ligne"}</span></div>
    </section>

    {activeOrder && <button onClick={() => navigate(`/courier/deliveries/${activeOrder.id}/tracking`)} className="w-full mt-4 rounded-[1.6rem] border border-foodiz-green/25 bg-foodiz-green/[0.08] p-5 text-left flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-foodiz-green/15 flex items-center justify-center"><Navigation size={20} className="text-foodiz-green" /></div><div className="flex-1"><p className="text-[10px] uppercase tracking-widest text-foodiz-green">Course active</p><p className="text-foodiz-cream font-semibold mt-1">{activeOrder.restaurant?.name || "Restaurant"}</p><p className="text-xs text-foodiz-gray mt-1 truncate">{activeOrder.delivery_address}</p></div><ArrowUpRight size={18} className="text-foodiz-green" /></button>}

    <section className="grid grid-cols-2 gap-3 mt-4">
      <div className="foodiz-card p-5 bg-white/[0.025]"><WalletCards size={18} className="text-foodiz-green" /><p className="text-2xl font-serif italic text-foodiz-green mt-4">{todayEarnings.toFixed(2)} €</p><p className="text-[10px] uppercase tracking-widest text-foodiz-gray mt-1">Gains aujourd'hui</p></div>
      <div className="foodiz-card p-5 bg-white/[0.025]"><CheckCircle2 size={18} className="text-foodiz-gold" /><p className="text-2xl font-serif italic text-foodiz-cream mt-4">{todayDeliveries}</p><p className="text-[10px] uppercase tracking-widest text-foodiz-gray mt-1">Courses terminées</p></div>
    </section>

    <button disabled={!online} onClick={() => navigate("/courier/deliveries/available")} className="w-full mt-4 rounded-[1.6rem] bg-foodiz-gold text-foodiz-black p-5 flex items-center gap-4 disabled:opacity-40"><div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center"><MapPinned size={22} /></div><div className="flex-1 text-left"><p className="font-bold">{available} course{available > 1 ? "s" : ""} disponible{available > 1 ? "s" : ""}</p><p className="text-xs text-black/65 mt-1">Voir les missions autour de vous</p></div><ArrowUpRight size={20} /></button>

    <section className="grid grid-cols-3 gap-3 mt-4">
      {[{ label: "Historique", icon: Clock3, path: "/courier/deliveries/history" }, { label: "Mes gains", icon: WalletCards, path: "/courier/revenues" }, { label: "Mon profil", icon: Bike, path: "/courier/profile" }].map((item) => <button key={item.path} onClick={() => navigate(item.path)} className="foodiz-card p-4 flex flex-col items-center gap-2 text-foodiz-gray hover:text-foodiz-gold"><item.icon size={19} /><span className="text-[10px]">{item.label}</span></button>)}
    </section>
  </CourierShell>;
}
