import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { ChevronLeft, Trash2, ShoppingBag, ChevronRight } from "lucide-react";

export default function CartPage() {
  const navigate = useNavigate();
  const { items, subtotal, removeItem, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-weello-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-weello-card border border-weello-gold/20 flex items-center justify-center mb-6">
          <ShoppingBag size={32} className="text-weello-gray" />
        </div>
        <h1 className="weello-title text-2xl text-weello-cream mb-2">Votre sélection est vide</h1>
        <p className="text-weello-gray text-sm mb-8">Une envie mérite un premier choix.</p>
        <button onClick={() => navigate("/client/restaurants")} className="weello-btn px-8 py-3">Découvrir les restaurants</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-weello-black pb-32 animate-fade-in-up border-x-2 border-weello-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />
      
      <header className="bg-weello-card border-b border-weello-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-weello-gold"><ChevronLeft size={24} /></button>
          <h1 className="weello-title text-lg">Votre sélection</h1>
          <button onClick={clearCart} className="text-weello-red text-xs font-bold uppercase">Tout vider</button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="weello-card p-4 flex items-center gap-4 bg-[#0A0A0A]">
            <div className="w-16 h-16 rounded-xl bg-weello-black overflow-hidden shrink-0">
              {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
            </div>
            <div className="flex-1">
              <h3 className="text-weello-cream font-bold text-sm">{item.name}</h3>
              <p className="text-weello-gold text-xs font-mono">{item.price.toFixed(2)} € x {item.quantity}</p>
            </div>
            <div className="text-right">
              <p className="text-weello-cream font-bold text-sm">{(item.price * item.quantity).toFixed(2)} €</p>
              <button onClick={() => removeItem(item.id)} className="text-weello-gray hover:text-weello-red mt-1"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-weello-card border-t border-weello-gold/20 p-4 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-4">
            <span className="text-weello-gray text-sm">Votre sélection</span>
            <span className="text-weello-cream text-2xl font-serif italic font-bold">{subtotal.toFixed(2)} €</span>
          </div>
          <button onClick={() => navigate("/client/checkout")} className="w-full weello-btn py-4 flex items-center justify-center gap-2 text-lg">
            Continuer <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
