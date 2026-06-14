import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Navigation, ShoppingBag, Sparkles } from "lucide-react";
import { supabase } from "../../lib/supabase";
import CourierShell from "../../components/CourierShell";

function distanceKm(lat1?: number, lon1?: number, lat2?: number, lon2?: number) {
  if (![lat1, lon1, lat2, lon2].every((value) => typeof value === "number")) return null;
  const radius = 6371;
  const dLat = ((lat2! - lat1!) * Math.PI) / 180;
  const dLon = ((lon2! - lon1!) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1! * Math.PI) / 180) * Math.cos((lat2! * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DeliveriesAvailable() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Écouter les commandes prêtes à être livrées en temps réel
    const fetchDeliveries = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, restaurants(name, address, postal_code, city, latitude, longitude), order_items(quantity)')
        .eq('status', 'ready')
        .is('courier_id', null)
        .order('created_at', { ascending: false });
      
      if (data) setDeliveries(data);
    };

    fetchDeliveries();

    const channel = supabase
      .channel('available-deliveries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: 'status=eq.ready' }, () => {
        fetchDeliveries();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAccept = async (orderId: string) => {
    setAcceptingId(orderId);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Votre session a expiré. Reconnectez-vous.");
      setAcceptingId(null);
      return;
    }

    const { data, error: updateError } = await supabase
      .from('orders')
      .update({ status: 'pickup', courier_id: user.id })
      .eq('id', orderId)
      .eq('status', 'ready')
      .is('courier_id', null)
      .select('id')
      .maybeSingle();

    if (updateError || !data) {
      setError("Cette course n'est plus disponible. La liste va être actualisée.");
      setDeliveries((current) => current.filter((delivery) => delivery.id !== orderId));
      setAcceptingId(null);
      return;
    }

    const delivery = deliveries.find((item) => item.id === orderId);
    await supabase.from("delivery_tracking").upsert({
      order_id: orderId,
      courier_id: user.id,
      pickup_latitude: delivery?.restaurants?.latitude,
      pickup_longitude: delivery?.restaurants?.longitude,
      dropoff_latitude: delivery?.client_latitude,
      dropoff_longitude: delivery?.client_longitude,
      status: "accepted",
    }, { onConflict: "order_id" });

    navigate(`/courier/deliveries/${orderId}/tracking`);
  };

  return (
    <CourierShell title="Courses disponibles" back="/courier">
      <section className="mb-5 rounded-[2rem] border border-foodiz-gold/20 bg-[linear-gradient(135deg,rgba(216,168,79,0.16),rgba(12,12,12,0.96)_55%)] p-5">
        <div className="flex items-center gap-2 text-foodiz-gold"><Sparkles size={16} /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Opportunités en direct</span></div>
        <p className="mt-3 text-sm leading-relaxed text-foodiz-gray">Choisissez une course, récupérez la commande puis accompagnez le client jusqu'à la remise sécurisée.</p>
      </section>
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-foodiz-red/30 bg-foodiz-red/10 p-3 text-sm text-foodiz-red">
            {error}
          </div>
        )}
        {deliveries.length === 0 ? (
          <div className="text-center py-20">
            <Navigation size={48} className="mx-auto text-foodiz-gray/20 mb-4" />
            <p className="text-foodiz-gray text-sm">Aucune course disponible pour le moment.</p>
            <p className="text-[10px] text-foodiz-gray mt-2">Revenez dans quelques minutes.</p>
          </div>
        ) : (
          deliveries.map((job) => (
            <div key={job.id} className="foodiz-card p-5 bg-[#0A0A0A]/90 border-foodiz-gold/15 animate-fade-in-up shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-serif italic text-foodiz-cream">{job.restaurants?.name || "Restaurant"}</h3>
                  <p className="text-xs text-foodiz-gray mt-1 flex items-center gap-1"><MapPin size={12} /> {job.restaurants?.address || job.delivery_address}</p>
                </div>
                <div className="text-right">
                  <span className="text-foodiz-green font-bold text-xl block">
                    +{(((job.courier_earnings_cents || 0) + (job.courier_prime_fund_cents || 0)) / 100).toFixed(2)} €
                  </span>
                  <span className="text-[10px] text-foodiz-gray">Frais de course</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-foodiz-gray mb-6 bg-foodiz-black/30 p-3 rounded-xl">
                <span className="flex items-center gap-1"><Clock size={12} /> {job.estimated_time_mins || 30} min</span>
                <span className="flex items-center gap-1"><ShoppingBag size={12} /> {job.order_items?.length || 0} articles</span>
                <span className="flex items-center gap-1 text-foodiz-gold"><Navigation size={12} /> {distanceKm(job.restaurants?.latitude, job.restaurants?.longitude, job.client_latitude, job.client_longitude)?.toFixed(1) || "-"} km</span>
              </div>

              <button disabled={acceptingId !== null} onClick={() => handleAccept(job.id)} className="w-full foodiz-btn py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                <Navigation size={16} /> {acceptingId === job.id ? "Acceptation..." : "Accepter la course"}
              </button>
            </div>
          ))
        )}
      </div>
    </CourierShell>
  );
}
