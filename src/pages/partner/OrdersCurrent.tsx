import { useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle, XCircle, Clock, ChefHat, Bike } from "lucide-react";
import { useOrders, OrderStatus } from "../../context/OrderContext";

export default function PartnerOrdersCurrent() {
  const navigate = useNavigate();
  const { getRestaurantOrders, updateOrderStatus } = useOrders();
  
  // Mock restaurant ID
  const restaurantId = "r1"; 
  const orders = getRestaurantOrders(restaurantId);
  
  // Filter out delivered orders for "Current" view
  const activeOrders = orders.filter(o => o.status !== 'delivered');

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch(status) {
      case 'pending': return 'text-foodiz-gold border-foodiz-gold/30 bg-foodiz-gold/5';
      case 'accepted': return 'text-blue-400 border-blue-400/30 bg-blue-400/5';
      case 'preparing': return 'text-amber-400 border-amber-400/30 bg-amber-400/5';
      case 'ready': return 'text-foodiz-green border-foodiz-green/30 bg-foodiz-green/5';
      default: return 'text-foodiz-gray';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch(status) {
      case 'pending': return 'Nouvelle commande';
      case 'accepted': return 'Acceptée';
      case 'preparing': return 'En cuisine';
      case 'ready': return 'Prête à livrer';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Commandes en cours</h1>
          <div className="w-6" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {activeOrders.length === 0 ? (
          <div className="text-center py-20">
            <ChefHat size={48} className="mx-auto text-foodiz-gray/20 mb-4" />
            <p className="text-foodiz-gray text-sm">Aucune commande en cours. C'est le calme !</p>
          </div>
        ) : (
          activeOrders.map((order) => (
            <div key={order.id} className="foodiz-card p-5 bg-[#0A0A0A] border-foodiz-gold/10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-serif italic text-foodiz-cream">Commande #{order.id.slice(-6)}</h3>
                    <span className={`text-[10px] px-2 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-xs text-foodiz-gray">Client: {order.clientName} · {new Date(order.createdAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <span className="text-foodiz-gold font-bold text-xl">{order.total.toFixed(2)} €</span>
              </div>
              
              <div className="space-y-2 mb-6">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm text-foodiz-cream/80">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{(item.price * item.quantity).toFixed(2)} €</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                {order.status === 'pending' && (
                  <>
                    <button onClick={() => handleStatusChange(order.id, 'accepted')} className="flex-1 py-3 rounded-xl bg-foodiz-green text-foodiz-black font-bold text-sm flex items-center justify-center gap-2"><CheckCircle size={16} /> Accepter</button>
                    <button onClick={() => handleStatusChange(order.id, 'delivered')} className="flex-1 py-3 rounded-xl bg-foodiz-red/10 text-foodiz-red border border-foodiz-red/20 font-bold text-sm flex items-center justify-center gap-2"><XCircle size={16} /> Refuser</button>
                  </>
                )}
                {order.status === 'accepted' && (
                  <button onClick={() => handleStatusChange(order.id, 'preparing')} className="w-full py-3 rounded-xl bg-foodiz-gold text-foodiz-black font-bold text-sm flex items-center justify-center gap-2"><ChefHat size={16} /> Marquer en préparation</button>
                )}
                {order.status === 'preparing' && (
                  <button onClick={() => handleStatusChange(order.id, 'ready')} className="w-full py-3 rounded-xl bg-foodiz-gold text-foodiz-black font-bold text-sm flex items-center justify-center gap-2"><Clock size={16} /> Marquer comme prête</button>
                )}
                {order.status === 'ready' && (
                  <div className="w-full py-3 rounded-xl bg-foodiz-green/10 border border-foodiz-green/30 text-foodiz-green font-bold text-sm flex items-center justify-center gap-2">
                    <Bike size={16} /> En attente d'un livreur...
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
