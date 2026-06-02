import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { MessageSquare, Clock, CheckCircle, AlertCircle } from "lucide-react";

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      // Récupère tous les tickets, du plus récent au plus ancien
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) setTickets(data);
      setLoading(false);
    };

    fetchTickets();
    
    // Écoute en temps réel : si un client envoie un message, il apparaît sans recharger la page
    const channel = supabase
      .channel('support_tickets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="foodiz-title text-3xl text-foodiz-cream mb-2">Centre de Support</h1>
      <p className="text-foodiz-gray text-sm mb-8">Gestion des demandes clients en temps réel.</p>

      {loading ? (
        <div className="text-center py-20 text-foodiz-gray animate-pulse">Chargement des tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="foodiz-card p-12 text-center bg-[#0A0A0A] border-foodiz-gold/10">
          <MessageSquare size={48} className="mx-auto text-foodiz-gray/20 mb-4" />
          <h3 className="text-foodiz-cream text-lg font-medium mb-2">Aucun ticket pour le moment</h3>
          <p className="text-foodiz-gray text-sm">Tout va bien, vos clients n'ont pas de problèmes !</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div key={ticket.id} className={`foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/10 flex flex-col gap-4 ${ticket.status === 'open' ? 'border-l-4 border-l-foodiz-gold' : 'opacity-60'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-foodiz-cream font-bold text-lg">{ticket.subject}</h3>
                    <span className={`text-[10px] px-2 py-1 rounded-full border flex items-center gap-1 ${ticket.status === 'open' ? 'bg-foodiz-gold/10 text-foodiz-gold border-foodiz-gold/20' : 'bg-foodiz-green/10 text-foodiz-green border-foodiz-green/20'}`}>
                      {ticket.status === 'open' ? <AlertCircle size={10} /> : <CheckCircle size={10} />}
                      {ticket.status === 'open' ? 'EN ATTENTE' : 'TRAITÉ'}
                    </span>
                  </div>
                  <p className="text-[10px] text-foodiz-gray">De: {ticket.user_email} · Le {new Date(ticket.created_at).toLocaleDateString('fr-FR')} à {new Date(ticket.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
              
              <div className="bg-foodiz-black/50 p-4 rounded-xl border border-foodiz-gold/5">
                <p className="text-foodiz-gray text-sm whitespace-pre-wrap">{ticket.message}</p>
              </div>

              {ticket.admin_response && (
                <div className="bg-foodiz-green/5 p-4 rounded-xl border border-foodiz-green/20">
                  <p className="text-[10px] text-foodiz-green uppercase font-bold mb-1">Votre réponse :</p>
                  <p className="text-foodiz-cream text-sm whitespace-pre-wrap">{ticket.admin_response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}