import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, CreditCard, Plus, Trash2, ShieldCheck } from "lucide-react";

export default function PaymentsPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newCard, setNewCard] = useState({ number: "", expiry: "" });

  useEffect(() => { fetchCards(); }, []);

  const fetchCards = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('client_payment_methods').select('*').eq('user_id', user.id);
      if (data) setCards(data);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && newCard.number.length >= 4) {
      // SÉCURITÉ : On ne stocke que les 4 derniers chiffres
      const lastFour = newCard.number.slice(-4);
      await supabase.from('client_payment_methods').insert({ 
        user_id: user.id, 
        last_four: lastFour, 
        expiry_date: newCard.expiry,
        brand: 'Visa' // Simplifié pour la démo
      });
      setNewCard({ number: "", expiry: "" });
      setShowForm(false);
      fetchCards();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('client_payment_methods').delete().eq('id', id);
    fetchCards();
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up border-x-2 border-foodiz-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/client/account")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Mes Paiements</h1>
          <button onClick={() => setShowForm(!showForm)} className="text-foodiz-gold"><Plus size={24} /></button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-foodiz-green text-xs bg-foodiz-green/5 p-3 rounded-xl border border-foodiz-green/10 mb-6">
          <ShieldCheck size={14} /> Paiements 100% sécurisés. Nous ne stockons jamais votre numéro complet.
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="foodiz-card p-4 bg-[#0A0A0A] border-foodiz-gold/30 space-y-3 animate-fade-in-up">
            <input type="text" placeholder="Numéro de carte (16 chiffres)" maxLength={19} required value={newCard.number} onChange={e => setNewCard({...newCard, number: e.target.value})} className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-3 text-foodiz-cream text-sm outline-none font-mono tracking-widest" />
            <input type="text" placeholder="Date d'expiration (MM/AA)" maxLength={5} required value={newCard.expiry} onChange={e => setNewCard({...newCard, expiry: e.target.value})} className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-3 text-foodiz-cream text-sm outline-none" />
            <button type="submit" className="w-full foodiz-btn py-3 text-sm">Ajouter la carte en toute sécurité</button>
          </form>
        )}

        {cards.length === 0 ? (
          <div className="text-center py-10 text-foodiz-gray text-sm">Aucune carte enregistrée.</div>
        ) : (
          cards.map((card) => (
            <div key={card.id} className="foodiz-card p-4 flex items-center justify-between group bg-gradient-to-r from-foodiz-card to-[#0A0A0A]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-8 bg-foodiz-cream rounded flex items-center justify-center">
                  <CreditCard size={16} className="text-foodiz-black" />
                </div>
                <div>
                  <p className="text-foodiz-cream text-sm font-bold font-mono">•••• •••• •••• {card.last_four}</p>
                  <p className="text-foodiz-gray text-xs">Expire le {card.expiry_date}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(card.id)} className="text-foodiz-gray hover:text-foodiz-red transition-colors p-2">
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </main>
    </div>
  );
}