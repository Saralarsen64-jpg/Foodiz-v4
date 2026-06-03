import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Send, CheckCircle, Users } from "lucide-react";

export default function AdminBroadcast() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Récupérer tous les IDs des clients
    const { data: clients } = await supabase.from('profiles').select('id').eq('role', 'client');
    
    if (clients && clients.length > 0) {
      // 2. Créer les notifications pour tout le monde
      const notifications = clients.map(client => ({
        user_id: client.id,
        title: title,
        message: message,
        type: 'marketing',
        link: '/client/advantages',
        is_read: false
      }));

      await supabase.from('notifications').insert(notifications);
      
      // 3. Enregistrer dans l'historique admin
      await supabase.from('admin_broadcasts').insert({
        title, message, sent_by: user.id
      });
    }
    
    setSent(true);
    setLoading(false);
    setTimeout(() => setSent(false), 3000);
    setTitle(""); setMessage("");
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="foodiz-title text-3xl text-foodiz-cream mb-2">Notification Globale</h1>
      <p className="text-foodiz-gray text-sm mb-8">Envoyer une promotion ou une information à tous les clients Foodiz.</p>

      <div className="foodiz-card p-8 bg-[#0A0A0A] border-foodiz-gold/10">
        {sent ? (
          <div className="p-6 rounded-xl bg-foodiz-green/10 text-foodiz-green border border-foodiz-green/20 flex flex-col items-center justify-center text-center animate-fade-in-up">
            <CheckCircle size={48} className="mb-4" />
            <h3 className="text-lg font-bold mb-2">Envoyé avec succès !</h3>
            <p className="text-sm">Tous les clients ont reçu la notification sur leur cloche.</p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-6">
            <div>
              <label className="block text-foodiz-gold text-xs uppercase tracking-widest font-bold mb-2">Titre de la notification</label>
              <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: -20% sur les burgers ce soir !" className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-4 text-foodiz-cream outline-none focus:border-foodiz-gold" />
            </div>
            <div>
              <label className="block text-foodiz-gold text-xs uppercase tracking-widest font-bold mb-2">Message</label>
              <textarea required value={message} onChange={e => setMessage(e.target.value)} placeholder="Profitez de cette offre exclusive..." className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-4 text-foodiz-cream outline-none focus:border-foodiz-gold h-32 resize-none" />
            </div>
            <button type="submit" disabled={loading} className="w-full foodiz-btn py-4 flex items-center justify-center gap-2 disabled:opacity-50">
              <Send size={18} /> {loading ? 'Envoi en cours...' : `Envoyer à tous les clients`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}