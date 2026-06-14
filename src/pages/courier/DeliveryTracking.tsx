import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bike, CheckCircle2, ChevronLeft, CircleUserRound, MapPin, MessageCircle, Navigation, Phone, ShieldCheck, Store, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

type DeliveryStep = "accepted" | "at_restaurant" | "picked_up" | "in_transit" | "at_customer" | "delivered";

const STEPS: { key: DeliveryStep; label: string }[] = [
  { key: "accepted", label: "Course acceptée" },
  { key: "at_restaurant", label: "Arrivé au restaurant" },
  { key: "picked_up", label: "Commande récupérée" },
  { key: "in_transit", label: "En route vers le client" },
  { key: "at_customer", label: "Arrivé chez le client" },
  { key: "delivered", label: "Livraison terminée" },
];

export default function DeliveryTrackingPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [step, setStep] = useState<DeliveryStep>("accepted");
  const [enteredCode, setEnteredCode] = useState(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locationError, setLocationError] = useState("");
  const lastLocationUpdate = useRef(0);

  const loadDelivery = async () => {
    if (!id) return;
    const { data } = await supabase.from("orders").select(`
      id, status, courier_id, delivery_address, client_latitude, client_longitude,
      courier_earnings_cents, courier_prime_fund_cents, created_at,
      restaurant:restaurants(name, address, postal_code, city, latitude, longitude),
      client:profiles!orders_client_id_fkey(full_name, first_name, phone),
      order_items(id, quantity, product:products(name))
    `).eq("id", id).single();
    if (!data) return;
    setOrder(data);
    const { data: trackingData } = await supabase.from("delivery_tracking").select("*").eq("order_id", id).maybeSingle();
    setTracking(trackingData);
    const status = trackingData?.status;
    if (["accepted", "at_restaurant", "picked_up", "in_transit", "at_customer", "delivered"].includes(status)) setStep(status);
    else if (data.status === "delivered") setStep("delivered");
    else if (data.status === "delivering") setStep("in_transit");
    else if (data.status === "picked_up") setStep("picked_up");
  };

  useEffect(() => {
    loadDelivery();
    if (!id) return;
    const channel = supabase.channel(`courier-delivery-${id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, loadDelivery).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    if (!id || !navigator.geolocation || step === "delivered") return;
    const watchId = navigator.geolocation.watchPosition(async (position) => {
      const now = Date.now();
      if (now - lastLocationUpdate.current < 5000) return;
      lastLocationUpdate.current = now;
      setLocationError("");
      await supabase.from("delivery_tracking").update({
        current_latitude: position.coords.latitude,
        current_longitude: position.coords.longitude,
        current_location_name: "Position GPS du livreur",
        updated_at: new Date().toISOString(),
      }).eq("order_id", id);
      setTracking((current: any) => ({ ...current, current_latitude: position.coords.latitude, current_longitude: position.coords.longitude }));
    }, () => setLocationError("Activez la localisation pour partager votre progression avec le client."), { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [id, step]);

  const earnings = ((order?.courier_earnings_cents || 0) + (order?.courier_prime_fund_cents || 0)) / 100;
  const currentIndex = STEPS.findIndex((item) => item.key === step);
  const progress = ((currentIndex + 1) / STEPS.length) * 100;
  const clientName = order?.client?.full_name || order?.client?.first_name || "Client Foodiz";
  const restaurantAddress = useMemo(() => [order?.restaurant?.address, order?.restaurant?.postal_code, order?.restaurant?.city].filter(Boolean).join(", "), [order]);

  const updateStep = async (next: DeliveryStep) => {
    if (!id) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const orderStatus = next === "picked_up" ? "picked_up" : next === "in_transit" || next === "at_customer" ? "delivering" : undefined;
      if (orderStatus) {
        const { error } = await supabase.from("orders").update({ status: orderStatus }).eq("id", id);
        if (error) throw error;
      }
      const { error } = await supabase.from("delivery_tracking").update({
        status: next,
        ...(next === "picked_up" ? { pickup_at: now } : {}),
        ...(next === "at_customer" ? { estimated_arrival_at: now } : {}),
      }).eq("order_id", id);
      if (error) throw error;
      setStep(next);
    } catch {
      toast.error("Impossible de valider cette étape. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const nextStep = () => {
    const next = STEPS[currentIndex + 1]?.key;
    if (next && next !== "delivered") updateStep(next);
  };

  const verifyCode = async (code: string) => {
    if (!id) return;
    setBusy(true);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    try {
      const response = await fetch("/api/verify-delivery-code", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: id, code }),
      });
      if (!response.ok) throw new Error("Invalid delivery code");
      setStep("delivered");
    } catch {
      setCodeError(true);
      setEnteredCode(["", "", "", "", "", ""]);
      document.getElementById("delivery-code-0")?.focus();
    } finally {
      setBusy(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...enteredCode];
    next[index] = digit;
    setEnteredCode(next);
    setCodeError(false);
    if (digit && index < 5) document.getElementById(`delivery-code-${index + 1}`)?.focus();
    if (index === 5 && digit && next.every(Boolean)) verifyCode(next.join(""));
  };

  const openNavigation = (destination: "restaurant" | "client") => {
    const lat = destination === "restaurant" ? order?.restaurant?.latitude : order?.client_latitude;
    const lng = destination === "restaurant" ? order?.restaurant?.longitude : order?.client_longitude;
    const query = lat && lng ? `${lat},${lng}` : destination === "restaurant" ? restaurantAddress : order?.delivery_address;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query || "")}`, "_blank", "noopener,noreferrer");
  };

  if (!order) return <div className="min-h-screen bg-foodiz-black flex items-center justify-center text-foodiz-gray animate-pulse">Chargement de la course...</div>;

  return (
    <div className="min-h-screen bg-foodiz-black pb-32 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(216,168,79,0.18),transparent_35%)]" />
      <header className="sticky top-0 z-40 border-b border-foodiz-gold/10 bg-foodiz-black/85 backdrop-blur-xl">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/courier")} className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-foodiz-gold"><ChevronLeft size={20} /></button>
          <div className="text-center"><p className="text-[9px] uppercase tracking-[0.25em] text-foodiz-gold">Course en direct</p><h1 className="foodiz-title text-lg">#{id?.slice(0, 8)}</h1></div>
          <div className="w-10 h-10 rounded-2xl bg-foodiz-green/10 border border-foodiz-green/20 flex items-center justify-center"><Bike size={19} className="text-foodiz-green" /></div>
        </div>
      </header>

      <main className="relative max-w-lg mx-auto px-4 py-6 space-y-4">
        <section className="rounded-[2rem] border border-foodiz-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,0.16),rgba(17,17,17,0.96)_38%,rgba(5,5,5,1))] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-foodiz-gray">Étape actuelle</p><h2 className="foodiz-title text-2xl mt-2">{STEPS[currentIndex]?.label}</h2></div>
            <div className="text-right"><p className="text-[10px] text-foodiz-gray">Votre gain</p><p className="text-2xl font-serif italic text-foodiz-green">+{earnings.toFixed(2)} €</p></div>
          </div>
          <div className="h-2 bg-white/5 rounded-full mt-6 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-foodiz-gold-dark via-foodiz-gold to-foodiz-green transition-all duration-700" style={{ width: `${progress}%` }} /></div>
          <div className="flex justify-between mt-2 text-[9px] text-foodiz-gray"><span>Restaurant</span><span>Client</span><span>Validée</span></div>
        </section>

        {locationError && <div className="rounded-2xl border border-foodiz-red/20 bg-foodiz-red/10 p-4 text-xs text-foodiz-red">{locationError}</div>}

        <section className="grid gap-3">
          <div className="foodiz-card p-5 bg-white/[0.025]">
            <div className="flex items-start gap-4"><div className="gold-glow-icon gold-glow-icon-md"><Store size={18} /></div><div className="flex-1 min-w-0"><p className="text-[10px] uppercase tracking-widest text-foodiz-gold">Récupération</p><h3 className="text-foodiz-cream font-semibold mt-1">{order.restaurant?.name || "Restaurant"}</h3><p className="text-xs text-foodiz-gray mt-1">{restaurantAddress || "Adresse non renseignée"}</p></div><button onClick={() => openNavigation("restaurant")} className="w-10 h-10 rounded-xl bg-foodiz-gold text-foodiz-black flex items-center justify-center"><Navigation size={17} /></button></div>
          </div>
          <div className="foodiz-card p-5 bg-white/[0.025]">
            <div className="flex items-start gap-4"><div className="gold-glow-icon gold-glow-icon-md"><CircleUserRound size={18} /></div><div className="flex-1 min-w-0"><p className="text-[10px] uppercase tracking-widest text-foodiz-gold">Livraison</p><h3 className="text-foodiz-cream font-semibold mt-1">{clientName}</h3><p className="text-xs text-foodiz-gray mt-1">{order.delivery_address}</p><div className="flex gap-4 mt-3">{order.client?.phone && <><a href={`tel:${order.client.phone}`} className="text-xs text-foodiz-gold flex items-center gap-1"><Phone size={13} /> Appeler</a><a href={`sms:${order.client.phone}`} className="text-xs text-foodiz-gold flex items-center gap-1"><MessageCircle size={13} /> Message</a></>}</div></div><button onClick={() => openNavigation("client")} className="w-10 h-10 rounded-xl bg-foodiz-gold text-foodiz-black flex items-center justify-center"><MapPin size={17} /></button></div>
          </div>
        </section>

        <section className="foodiz-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-foodiz-gold mb-4">Contenu de la commande</p>
          <div className="space-y-3">{order.order_items?.map((item: any) => <div key={item.id} className="flex justify-between text-sm"><span className="text-foodiz-cream">{item.product?.name || "Produit"}</span><span className="text-foodiz-gold">x{item.quantity}</span></div>)}</div>
        </section>

        {step === "at_customer" && (
          <section className="rounded-[2rem] border border-foodiz-gold/30 bg-foodiz-gold/[0.06] p-6 text-center shadow-[0_0_50px_rgba(216,168,79,0.08)]">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-foodiz-gold/10 border border-foodiz-gold/20 flex items-center justify-center mb-4"><ShieldCheck size={24} className="text-foodiz-gold" /></div>
            <h3 className="foodiz-title text-xl">Code de remise</h3><p className="text-xs text-foodiz-gray mt-2">Demandez au client son code personnel à 6 chiffres.</p>
            <div className="flex justify-center gap-2 mt-6">{enteredCode.map((digit, index) => <input key={index} id={`delivery-code-${index}`} value={digit} onChange={(event) => handleCodeChange(index, event.target.value)} inputMode="numeric" maxLength={1} className={`w-10 h-13 rounded-xl bg-foodiz-black border text-center text-lg font-bold text-foodiz-cream outline-none ${codeError ? "border-foodiz-red" : "border-foodiz-gold/30 focus:border-foodiz-gold"}`} />)}</div>
            {codeError && <p className="text-foodiz-red text-xs mt-4 flex items-center justify-center gap-1"><X size={13} /> Code incorrect, réessayez.</p>}
          </section>
        )}

        {step === "delivered" && <section className="rounded-[2rem] border border-foodiz-green/30 bg-foodiz-green/[0.08] p-8 text-center"><CheckCircle2 size={48} className="text-foodiz-green mx-auto" /><h3 className="foodiz-title text-2xl mt-4">Mission accomplie</h3><p className="text-foodiz-gray text-sm mt-2">{earnings.toFixed(2)} € ont été ajoutés à vos gains.</p><button onClick={() => navigate("/courier")} className="foodiz-btn mt-6">Retour au tableau de bord</button></section>}
      </main>

      {step !== "at_customer" && step !== "delivered" && <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-foodiz-black/85 backdrop-blur-xl border-t border-foodiz-gold/10"><button disabled={busy} onClick={nextStep} className="w-full max-w-lg mx-auto foodiz-btn py-4 flex items-center justify-center gap-2 disabled:opacity-50"><Navigation size={18} /> {STEPS[currentIndex + 1]?.label}</button></div>}
    </div>
  );
}
