import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, Navigation, ShoppingBag, Sparkles } from "lucide-react";
import CourierShell from "../../components/CourierShell";
import { supabase } from "../../lib/supabase";
import { updateCourierPresence } from "../../lib/courierPresence";

async function courierRequest(method = "GET", body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch("/api/courier-deliveries", {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error || "Course indisponible"), { code: payload.error, orderId: payload.orderId });
  return payload;
}

export default function DeliveriesAvailable() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliveries = async () => {
    try {
      await updateCourierPresence(true);
      const payload = await courierRequest();
      setDeliveries(payload.deliveries || []);
      setError(null);
    } catch (requestError: any) {
      setDeliveries([]);
      setError(
        requestError.code === "COURIER_NOT_AVAILABLE"
          ? "Passez en ligne et vérifiez que votre dossier est validé pour voir les courses."
          : requestError.code === "COURIER_LOCATION_REQUIRED"
            ? "Activez une localisation précise pour recevoir les courses proches."
            : requestError.message || "Impossible de charger les courses disponibles.",
      );
    }
  };

  useEffect(() => {
    void fetchDeliveries();
    const interval = window.setInterval(() => void fetchDeliveries(), 15000);
    return () => window.clearInterval(interval);
  }, []);

  const handleAccept = async (orderId: string) => {
    setAcceptingId(orderId);
    setError(null);
    try {
      const payload = await courierRequest("POST", { orderId });
      navigate(`/courier/deliveries/${payload.orderId}/tracking`);
    } catch (requestError: any) {
      if (requestError.code === "ACTIVE_DELIVERY_EXISTS" && requestError.orderId) {
        navigate(`/courier/deliveries/${requestError.orderId}/tracking`);
        return;
      }
      setError("Cette course n'est plus disponible. La liste a été actualisée.");
      setDeliveries((current) => current.filter((delivery) => delivery.id !== orderId));
    } finally {
      setAcceptingId(null);
    }
  };

  return <CourierShell title="Courses disponibles" back="/courier">
    <section className="mb-5 rounded-[2rem] border border-weello-gold/20 bg-[linear-gradient(135deg,rgba(216,168,79,0.16),rgba(12,12,12,0.96)_55%)] p-5"><div className="flex items-center gap-2 text-weello-gold"><Sparkles size={16}/><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Opportunités en direct</span></div><p className="mt-3 text-sm leading-relaxed text-weello-gray">L'adresse client reste confidentielle jusqu'à l'acceptation de la course.</p></section>
    <div className="space-y-4">
      {error && <div className="rounded-xl border border-weello-red/30 bg-weello-red/10 p-3 text-sm text-weello-red">{error}</div>}
      {!error && deliveries.length === 0 && <div className="py-20 text-center"><Navigation size={48} className="mx-auto mb-4 text-weello-gray/20"/><p className="text-sm text-weello-gray">Aucune course disponible pour le moment.</p></div>}
      {deliveries.map((job) => <div key={job.id} className="weello-card p-5 bg-[#0A0A0A]/90 border-weello-gold/15">
        <div className="mb-4 flex items-start justify-between"><div><h3 className="text-lg font-serif italic text-weello-cream">{job.restaurant?.name || "Restaurant"}</h3><p className="mt-1 flex items-center gap-1 text-xs text-weello-gray"><MapPin size={12}/>{[job.restaurant?.address, job.restaurant?.postal_code, job.restaurant?.city].filter(Boolean).join(", ")}</p></div><div className="text-right"><span className="block text-xl font-bold text-weello-green">+{(((job.delivery_fee_cents || 0) + (job.courier_earnings_cents || 0) + (job.courier_prime_fund_cents || 0)) / 100).toFixed(2)} €</span><span className="text-[10px] text-weello-gray">Gain de la course</span></div></div>
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-weello-black/30 p-3 text-xs text-weello-gray"><span className="flex items-center gap-1"><Clock size={12}/>{typeof job.pickup_time_mins === "number" ? `${job.pickup_time_mins} min jusqu'au retrait` : "Temps de retrait à confirmer"}</span><span className="flex items-center gap-1"><ShoppingBag size={12}/>{job.item_count || 0} articles</span><span className="flex items-center gap-1 text-weello-gold"><Navigation size={12}/>{typeof job.pickup_distance_km === "number" ? `${job.pickup_distance_km.toFixed(1)} km jusqu'au restaurant` : "Distance de retrait à confirmer"}</span><span className="flex items-center gap-1"><Clock size={12}/>{typeof job.estimated_time_mins === "number" ? `${job.estimated_time_mins} min de livraison` : "Livraison à confirmer"}</span></div>
        <button disabled={acceptingId !== null} onClick={() => handleAccept(job.id)} className="weello-btn flex w-full items-center justify-center gap-2 py-3 text-sm disabled:opacity-50"><Navigation size={16}/>{acceptingId === job.id ? "Acceptation..." : "Accepter la course"}</button>
      </div>)}
    </div>
  </CourierShell>;
}
