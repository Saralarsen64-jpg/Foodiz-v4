import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Clock, ShoppingBag, ChevronRight } from "lucide-react";

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Récupération des VRAIES commandes du client
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false });
        
        if (data) setOrders(data);
      }
      setLoading(false);
    };
    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    if (status === 'delivered') return 'text-foodiz-green';
    if (status === 'pending' || status === 'preparing') return 'text-foodiz-gold';
    return 'text-foodiz-gray';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'delivered') return 'Livrée';
    if (status === 'pending') return 'En attente';
    if (status === 'preparing') return 'En préparation';
    return status;
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up border-x-2 border-foodiz-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/client/account")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Mes Commandes</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="text-center py-10 text-foodiz-gray animate-pulse">Chargement de l'historique...</div>
        ) : orders.length === 0 ? (
          <div className="foodiz-card p-12 text-center bg-[#0A0A0A] border-foodiz-gold/10">
            <ShoppingBag size={48} className="mx-auto text-foodiz-gray/20 mb-4" />
            <h3 className="text-foodiz-cream text-lg font-medium mb-2">Aucune commande</h3>
            <p className="text-foodiz-gray text-sm mb-6">Vous n'avez pas encore commandé sur Weello.</p>
            <button onClick={() => navigate("/client/restaurants")} className="foodiz-btn px-6 py-3 text-sm">Découvrir les restaurants</button>
          </div>
        ) : (
          orders.map((order) => (
            <button 
              key={order.id} 
              onClick={() => navigate(`/client/orders/${order.id}`)}
              className="w-full foodiz-card p-4 flex items-center justify-between hover:border-foodiz-gold/30 transition-all group bg-[#0A0A0A]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-foodiz-black border border-foodiz-gold/20 flex items-center justify-center text-foodiz-gold">
                  <Clock size={20} />
                </div>
                <div className="text-left">
                  <p className="text-foodiz-cream font-bold text-sm">Commande #{order.id.slice(0, 8)}</p>
                  <p className="text-foodiz-gray text-xs">{new Date(order.created_at).toLocaleDateString('fr-FR')} · {(order.final_client_total_cents / 100).toFixed(2)} €</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xs font-bold uppercase ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</p>
                <ChevronRight size={16} className="text-foodiz-gray/50 ml-auto mt-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))
        )}
      </main>
    </div>
  );
}