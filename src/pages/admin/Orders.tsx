import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      // Récupère les commandes actives avec les infos client et resto
      const { data } = await supabase
        .from('orders')
        .select(`
          *, 
          client:profiles!orders_client_id_fkey(full_name, email),
          restaurant:restaurants!orders_restaurant_id_fkey(name)
        `)
        .not('status', 'in', '(delivered,cancelled)')
        .order('created_at', { ascending: false });
      
      if (data) setOrders(data);
      setLoading(false);
    };
    fetchOrders();

    // Écoute en temps réel des nouvelles commandes
    const channel = supabase.channel('realtime-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <span className="px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs border border-yellow-500/20 flex items-center gap-1"><Clock size={10}/> En attente</span>;
      case 'preparing': return <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs border border-blue-500/20 flex items-center gap-1"><AlertCircle size={10}/> En cuisine</span>;
      case 'delivering': return <span className="px-2 py-1 rounded-full bg-foodiz-gold/10 text-foodiz-gold text-xs border border-foodiz-gold/20 flex items-center gap-1"><Clock size={10}/> En livraison</span>;
      default: return <span className="text-foodiz-gray text-xs">{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="foodiz-title text-3xl text-foodiz-cream mb-2">Vue "Dieu" des Commandes</h1>
      <p className="text-foodiz-gray text-sm mb-8">Suivi en temps réel de l'activité sur la plateforme.</p>

      {loading ? <div className="text-foodiz-gray animate-pulse">Chargement...</div> : orders.length === 0 ? (
        <div className="foodiz-card p-12 text-center bg-[#0A0A0A] border-foodiz-gold/10">
          <CheckCircle size={48} className="mx-auto text-foodiz-green/20 mb-4" />
          <p className="text-foodiz-gray text-sm">Aucune commande active pour le moment. La plateforme est calme.</p>
        </div>
      ) : (
        <div className="foodiz-card bg-[#0A0A0A] border-foodiz-gold/10 overflow-hidden rounded-2xl">
          <table className="w-full text-left text-sm text-foodiz-gray">
            <thead className="bg-foodiz-black text-foodiz-gold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">ID Commande</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Restaurant</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foodiz-gold/10">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-foodiz-gold/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-foodiz-cream">#{order.id.slice(0, 8)}</td>
                  <td className="px-6 py-4">
                    <p className="text-foodiz-cream">{order.client?.full_name || 'Inconnu'}</p>
                    <p className="text-[10px]">{order.client?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-foodiz-cream">{order.restaurant?.name || 'Inconnu'}</td>
                  <td className="px-6 py-4 font-bold text-foodiz-gold">{(order.final_client_total_cents / 100).toFixed(2)} €</td>
                  <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-4 text-xs">{new Date(order.created_at).toLocaleTimeString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}