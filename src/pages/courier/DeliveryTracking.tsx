import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bike, CheckCircle2, ChevronLeft, CircleUserRound, MapPin, MessageCircle, Navigation, Phone, ShieldCheck, Store, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import { getCourierOrderClientContact } from "../../lib/orderContacts";

type DeliveryStep = "accepted" | "at_restaurant" | "picked_up" | "in_transit" | "at_customer" | "delivered";

const STEPS: { key: DeliveryStep; label: string }[] = [
  { key: "accepted", label: "Course acceptée" },
  { key: "at_restaurant", label: "Arrivé au restaurant" },
  { key: "picked_up", label: "Commande récupérée" },
  { key: "in_transit", label: "En route vers le client" },
  { key: "at_customer", label: "Arrivé chez le client" },
  { key: "delivered", label: "Livraison terminée" },
];

async function courierDeliveryAction(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch("/api/courier-delivery-action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Étape impossible.");
  return payload;
}

function currentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("La géolocalisation n’est pas disponible sur cet appareil."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    });
  });
}

function euros(cents: number) {
  return `${(Math.max(0, cents) / 100).toFixed(2)} €`;
}

function formatTimer(seconds: number) {
  const absolute = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(absolute / 60);
  const remaining = absolute % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function penaltyForDelay(delaySeconds: number) {
  if (delaySeconds > 1200) return 200;
  if (delaySeconds > 900) return 100;
  if (delaySeconds >= 600) return 50;
  return 0;
}

function delayLabel(delaySeconds: number) {
  if (delaySeconds > 1200) return "Retard +20 min";
  if (delaySeconds > 900) return "Retard +15 min";
  if (delaySeconds >= 600) return "Retard +10 min";
  if (delaySeconds > 0) return "Tolérance retard";
  return "À l’heure";
}

export default function DeliveryTrackingPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [step, setStep] = useState<DeliveryStep>("accepted");
  const [enteredCode, setEnteredCode] = useState(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const lastLocationUpdate = useRef(0);

  const loadDelivery = async () => {
    if (!id) return;
    const { data } = await supabase.from("orders").select(`
      id, status, courier_id, delivery_address, client_latitude, client_longitude,
      delivery_fee_cents, courier_earnings_cents, courier_prime_fund_cents,
      courier_delay_penalty_cents, client_delay_reward_points, created_at,
      restaurant:restaurants(name, address, postal_code, city, latitude, longitude),
      order_items(id, quantity, product:products(name))
    `).eq("id", id).single();
    if (!data) return;
    const client = await getCourierOrderClientContact(id);
    setOrder({ ...data, client });
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
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!id || !navigator.geolocation || step === "delivered") return;
    const watchId = navigator.geolocation.watchPosition(async (position) => {
      const now = Date.now();
      if (now - lastLocationUpdate.current < 5000) return;
      lastLocationUpdate.current = now;
      setLocationError("");
      try {
        await courierDeliveryAction({
          orderId: id,
          action: "location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
        setTracking((current: any) => ({ ...current, current_latitude: position.coords.latitude, current_longitude: position.coords.longitude }));
      } catch {
        setLocationError("La position n’a pas pu être synchronisée avec Weello.");
      }
    }, () => setLocationError("Activez la localisation pour partager votre progression avec le client."), { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [id, step]);

  const grossCourierCents = (order?.delivery_fee_cents || 0) + (order?.courier_earnings_cents || 0) + (order?.courier_prime_fund_cents || 0);
  const earnings = (grossCourierCents - (order?.courier_delay_penalty_cents || 0)) / 100;
  const maxDelayPenaltyCents = Math.min(200, grossCourierCents);
  const expectedArrivalMs = tracking?.pickup_expected_arrival_at ? new Date(tracking.pickup_expected_arrival_at).getTime() : null;
  const hasRegulatedTimer = ["picked_up", "in_transit", "at_customer"].includes(step) && typeof expectedArrivalMs === "number" && Number.isFinite(expectedArrivalMs);
  const delaySeconds = hasRegulatedTimer ? Math.max(0, Math.floor((now - expectedArrivalMs!) / 1000)) : 0;
  const remainingSeconds = hasRegulatedTimer ? Math.max(0, Math.floor((expectedArrivalMs! - now) / 1000)) : 0;
  const currentPenaltyCents = penaltyForDelay(delaySeconds);
  const expectedArrivalLabel = tracking?.pickup_expected_arrival_at
    ? new Date(tracking.pickup_expected_arrival_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;
  const currentIndex = STEPS.findIndex((item) => item.key === step);
  const progress = ((currentIndex + 1) / STEPS.length) * 100;
  const clientName = order?.client?.display_name || order?.client?.first_name || "Client Weello";
  const restaurantAddress = useMemo(() => [order?.restaurant?.address, order?.restaurant?.postal_code, order?.restaurant?.city].filter(Boolean).join(", "), [order]);

  const updateStep = async (next: DeliveryStep) => {
    if (!id) return;
    setBusy(true);
    try {
      const position = next === "picked_up" || next === "at_customer"
        ? await currentPosition()
        : null;
      await courierDeliveryAction({
        orderId: id,
        action: next,
        ...(position ? {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        } : {}),
      });
      setStep(next);
      if (next === "picked_up") setOrder((current: any) => ({ ...current, status: "picked_up" }));
      if (next === "in_transit" || next === "at_customer") setOrder((current: any) => ({ ...current, status: "delivering" }));
    } catch (error: any) {
      toast.error(error.message || "Impossible de valider cette étape. Réessayez.");
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
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 429) {
          const minutes = Math.max(1, Math.ceil(Number(payload.retryAfterSeconds || 900) / 60));
          throw new Error(`Trop de tentatives. Réessayez dans ${minutes} min.`);
        }
        throw new Error(payload.remainingAttempts !== undefined ? `Code incorrect. ${payload.remainingAttempts} essai(s) restant(s).` : "Code incorrect.");
      }
      setStep("delivered");
      await loadDelivery();
    } catch (error: any) {
      setCodeError(error.message || "Code incorrect.");
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
    setCodeError("");
    if (digit && index < 5) document.getElementById(`delivery-code-${index + 1}`)?.focus();
    if (index === 5 && digit && next.every(Boolean)) verifyCode(next.join(""));
  };

  const openNavigation = (destination: "restaurant" | "client") => {
    const lat = destination === "restaurant" ? order?.restaurant?.latitude : order?.client_latitude;
    const lng = destination === "restaurant" ? order?.restaurant?.longitude : order?.client_longitude;
    const query = lat && lng ? `${lat},${lng}` : destination === "restaurant" ? restaurantAddress : order?.delivery_address;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query || "")}`, "_blank", "noopener,noreferrer");
  };

  if (!order) return <div className="min-h-screen bg-weello-black flex items-center justify-center text-weello-gray animate-pulse">Chargement de la course...</div>;

  return (
    <div className="min-h-screen bg-weello-black pb-32 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(216,168,79,0.18),transparent_35%)]" />
      <header className="sticky top-0 z-40 border-b border-weello-gold/10 bg-weello-black/85 backdrop-blur-xl">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/courier")} className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-weello-gold"><ChevronLeft size={20} /></button>
          <div className="text-center"><p className="text-[9px] uppercase tracking-[0.25em] text-weello-gold">Course en direct</p><h1 className="weello-title text-lg">#{id?.slice(0, 8)}</h1></div>
          <div className="w-10 h-10 rounded-2xl bg-weello-green/10 border border-weello-green/20 flex items-center justify-center"><Bike size={19} className="text-weello-green" /></div>
        </div>
      </header>

      <main className="relative max-w-lg mx-auto px-4 py-6 space-y-4">
        <section className="rounded-[2rem] border border-weello-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,0.16),rgba(17,17,17,0.96)_38%,rgba(5,5,5,1))] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-weello-gray">Étape actuelle</p><h2 className="weello-title text-2xl mt-2">{STEPS[currentIndex]?.label}</h2></div>
            <div className="text-right"><p className="text-[10px] text-weello-gray">Votre gain</p><p className="text-2xl font-serif italic text-weello-green">+{earnings.toFixed(2)} €</p></div>
          </div>
          <div className="h-2 bg-white/5 rounded-full mt-6 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-weello-gold-dark via-weello-gold to-weello-green transition-all duration-700" style={{ width: `${progress}%` }} /></div>
          <div className="flex justify-between mt-2 text-[9px] text-weello-gray"><span>Restaurant</span><span>Client</span><span>Validée</span></div>
        </section>

        {["accepted", "at_restaurant"].includes(step) && (
          <section className="weello-card border-weello-gold/25 bg-weello-gold/[0.05] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-weello-gold">
              Numéro à présenter au restaurant
            </p>
            <p className="mt-3 text-4xl font-black tracking-[0.15em] text-weello-cream">
              #{id?.slice(0, 8).toUpperCase()}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-weello-gray">
              Présentez ce numéro au partenaire pour récupérer la bonne commande.
              Le chrono réglementé démarre uniquement après “Commande récupérée”.
            </p>
          </section>
        )}

        <section className="weello-card p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-weello-gold/15 bg-black/25 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-weello-gold">Gain max</p>
              <p className="mt-2 text-2xl font-serif italic text-weello-green">{euros(grossCourierCents)}</p>
              <p className="mt-1 text-[10px] text-weello-gray">Si livraison à l’heure</p>
            </div>
            <div className="rounded-2xl border border-weello-gold/15 bg-black/25 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-weello-gold">Gain mini</p>
              <p className="mt-2 text-2xl font-serif italic text-weello-gold">{euros(grossCourierCents - maxDelayPenaltyCents)}</p>
              <p className="mt-1 text-[10px] text-weello-gray">Si pénalité max appliquée</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-weello-gold/15 bg-weello-gold/[0.04] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-weello-gold">Chrono réglementé</p>
            {hasRegulatedTimer ? (
              <>
                <p className={`mt-2 text-4xl font-black ${currentPenaltyCents > 0 ? "text-weello-red" : "text-weello-green"}`}>
                  {delaySeconds > 0 ? `+${formatTimer(delaySeconds)}` : formatTimer(remainingSeconds)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-weello-gray">
                  Arrivée prévue {expectedArrivalLabel || "en calcul"} · {delayLabel(delaySeconds)}
                  {currentPenaltyCents > 0 ? ` · pénalité actuelle -${euros(currentPenaltyCents)}` : ""}
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-weello-gray">
                Le chrono exact sera calculé au moment où vous confirmez la récupération avec GPS précis.
              </p>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-weello-gray">
              Règles Weello : +10 min = -0,50 €, +15 min = -1 €, +20 min = -2 € et priorité réduite.
            </p>
          </div>
        </section>

        {locationError && <div className="rounded-2xl border border-weello-red/20 bg-weello-red/10 p-4 text-xs text-weello-red">{locationError}</div>}

        <section className="grid gap-3">
          <div className="weello-card p-5 bg-white/[0.025]">
            <div className="flex items-start gap-4"><div className="gold-glow-icon gold-glow-icon-md"><Store size={18} /></div><div className="flex-1 min-w-0"><p className="text-[10px] uppercase tracking-widest text-weello-gold">Récupération</p><h3 className="text-weello-cream font-semibold mt-1">{order.restaurant?.name || "Restaurant"}</h3><p className="text-xs text-weello-gray mt-1">{restaurantAddress || "Adresse non renseignée"}</p></div><button onClick={() => openNavigation("restaurant")} className="w-10 h-10 rounded-xl bg-weello-gold text-weello-black flex items-center justify-center"><Navigation size={17} /></button></div>
          </div>
          <div className="weello-card p-5 bg-white/[0.025]">
            <div className="flex items-start gap-4"><div className="gold-glow-icon gold-glow-icon-md"><CircleUserRound size={18} /></div><div className="flex-1 min-w-0"><p className="text-[10px] uppercase tracking-widest text-weello-gold">Livraison</p><h3 className="text-weello-cream font-semibold mt-1">{clientName}</h3><p className="text-xs text-weello-gray mt-1">{order.delivery_address}</p><div className="flex gap-4 mt-3">{order.client?.phone && <><a href={`tel:${order.client.phone}`} className="text-xs text-weello-gold flex items-center gap-1"><Phone size={13} /> Appeler</a><a href={`sms:${order.client.phone}`} className="text-xs text-weello-gold flex items-center gap-1"><MessageCircle size={13} /> Message</a></>}</div></div><button onClick={() => openNavigation("client")} className="w-10 h-10 rounded-xl bg-weello-gold text-weello-black flex items-center justify-center"><MapPin size={17} /></button></div>
          </div>
        </section>

        <section className="weello-card p-5">
          <p className="text-[10px] uppercase tracking-widest text-weello-gold mb-4">Contenu de la commande</p>
          <div className="space-y-3">{order.order_items?.map((item: any) => <div key={item.id} className="flex justify-between text-sm"><span className="text-weello-cream">{item.product?.name || "Produit"}</span><span className="text-weello-gold">x{item.quantity}</span></div>)}</div>
        </section>

        {step === "at_customer" && (
          <section className="rounded-[2rem] border border-weello-gold/30 bg-weello-gold/[0.06] p-6 text-center shadow-[0_0_50px_rgba(216,168,79,0.08)]">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-weello-gold/10 border border-weello-gold/20 flex items-center justify-center mb-4"><ShieldCheck size={24} className="text-weello-gold" /></div>
            <h3 className="weello-title text-xl">Code de remise</h3><p className="text-xs text-weello-gray mt-2">Demandez au client son code personnel à 6 chiffres.</p>
            <div className="flex justify-center gap-2 mt-6">{enteredCode.map((digit, index) => <input key={index} id={`delivery-code-${index}`} value={digit} onChange={(event) => handleCodeChange(index, event.target.value)} inputMode="numeric" maxLength={1} className={`w-10 h-13 rounded-xl bg-weello-black border text-center text-lg font-bold text-weello-cream outline-none ${codeError ? "border-weello-red" : "border-weello-gold/30 focus:border-weello-gold"}`} />)}</div>
            {codeError && <p className="text-weello-red text-xs mt-4 flex items-center justify-center gap-1"><X size={13} /> {codeError}</p>}
          </section>
        )}

        {step === "delivered" && <section className="rounded-[2rem] border border-weello-green/30 bg-weello-green/[0.08] p-8 text-center"><CheckCircle2 size={48} className="text-weello-green mx-auto" /><h3 className="weello-title text-2xl mt-4">Mission accomplie</h3><p className="text-weello-gray text-sm mt-2">{earnings.toFixed(2)} € ont été ajoutés à vos gains.</p><button onClick={() => navigate("/courier")} className="weello-btn mt-6">Retour au tableau de bord</button></section>}
      </main>

      {step !== "at_customer" && step !== "delivered" && <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-weello-black/85 backdrop-blur-xl border-t border-weello-gold/10"><button disabled={busy} onClick={nextStep} className="w-full max-w-lg mx-auto weello-btn py-4 flex items-center justify-center gap-2 disabled:opacity-50"><Navigation size={18} /> {STEPS[currentIndex + 1]?.label}</button></div>}
    </div>
  );
}
