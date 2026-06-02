import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { MessageSquare, Clock, CheckCircle, AlertCircle, Send } from "lucide-react";

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
      if (data) setTickets(data);
      setLoading(false);
    };
    fetchTickets();

    // Écoute en temps réel
    const channel = supabase.channel('support_tickets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => fetchTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleReply = async (ticketId: string) => {
    if (!replyText) return;
    await supabase.from('support_tickets').update({ 
      admin_response: replyText, 
      status: 'closed' 
    }).eq('id', ticketId);
    setReplyText("");
    setActiveTicketId(null);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="foodiz-title text-3xl text-foodiz-cream mb-2">Centre de Support</h1>
      <p className="text-foodiz-gray text-sm mb-8">Gestion des demandes clients.</p>

      {loading ? <div className="text-center py-20 text-foodiz-gray animate-pulse">Chargement...</div> : tickets.length === 0 ? (
        <div className="foodiz-card p-12 text-center bg-[#0A0A0A] border-foodiz-gold/10">
          <MessageSquare size={48} className="mx-auto text-foodiz-gray/20 mb-4" />
          <p className="text-foodiz-gray text-sm">Aucun ticket pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
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
                  <p className="text-[10px] text-foodiz-gray">De: {ticket.user_email} · Le {new Date(ticket.created_at).toLocaleDateString('fr-FR')}</p>
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

              {ticket.status === 'open' && (
                <div className="mt-2">
                  {activeTicketId === ticket.id ? (
                    <div className="space-y-3 animate-fade-in-up">
                      <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Écrivez votre réponse..." className="w-full bg-foodiz-black border border-foodiz-gold/30 rounded-xl p-3 text-foodiz-cream text-sm outline-none focus:border-foodiz-gold h-24" />
                      <div className="flex gap-3 justify-end">
                        <button onClick={() => setActiveTicketId(null)} className="px-4 py-2 rounded-xl text-foodiz-gray hover:text-foodiz-cream text-sm">Annuler</button>
                        <button onClick={() => handleReply(ticket.id)} className="px-4 py-2 rounded-xl bg-foodiz-green text-foodiz-black font-bold flex items-center gap-2 text-sm hover:bg-foodiz-green/80">
                          <Send size={14} /> Répondre et Clôturer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setActiveTicketId(ticket.id)} className="px-4 py-2 rounded-xl bg-foodiz-gold/10 text-foodiz-gold border border-foodiz-gold/20 hover:bg-foodiz-gold/20 transition-all flex items-center gap-2 text-sm font-bold">
                      <MessageSquare size={14} /> Traiter ce ticket
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}