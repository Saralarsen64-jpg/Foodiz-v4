import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, MapPin, Clock, Navigation, ShoppingBag } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function DeliveriesAvailable() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<any[]>([]);

  useEffect(() => {
    // Écouter les commandes prêtes à être livrées en temps réel
    const fetchDeliveries = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, restaurants(name, address), order_items(quantity)')
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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('orders').update({ status: 'pickup', courier_id: user.id }).eq('id', orderId);
      navigate(`/courier/deliveries/${orderId}/tracking`);
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/courier")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Courses disponibles</h1>
          <div className="w-6" />
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {deliveries.length === 0 ? (
          <div className="text-center py-20">
            <Navigation size={48} className="mx-auto text-foodiz-gray/20 mb-4" />
            <p className="text-foodiz-gray text-sm">Aucune course disponible pour le moment.</p>
            <p className="text-[10px] text-foodiz-gray mt-2">Revenez dans quelques minutes.</p>
          </div>
        ) : (
          deliveries.map((job) => (
            <div key={job.id} className="foodiz-card p-5 bg-[#0A0A0A] border-foodiz-gold/10 animate-fade-in-up">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-serif italic text-foodiz-cream">{job.restaurants?.name || "Restaurant"}</h3>
                  <p className="text-xs text-foodiz-gray mt-1 flex items-center gap-1"><MapPin size={12} /> {job.restaurants?.address || job.delivery_address}</p>
                </div>
                <div className="text-right">
                  <span className="text-foodiz-green font-bold text-xl block">
                    +{(((job.courier_earnings_cents || 0) + (job.courier_prime_fund_cents || 0) + (job.delivery_fee_cents || 0)) / 100).toFixed(2)} €
                  </span>
                  <span className="text-[10px] text-foodiz-gray">Frais de course</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-foodiz-gray mb-6 bg-foodiz-black/30 p-3 rounded-xl">
                <span className="flex items-center gap-1"><Clock size={12} /> ~20 min</span>
                <span className="flex items-center gap-1"><ShoppingBag size={12} /> {job.order_items?.length || 0} articles</span>
                <span className="flex items-center gap-1 text-foodiz-gold"><Navigation size={12} /> 1.2 km</span>
              </div>

              <button onClick={() => handleAccept(job.id)} className="w-full foodiz-btn py-3 text-sm flex items-center justify-center gap-2">
                <Navigation size={16} /> Accepter la course
              </button>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
