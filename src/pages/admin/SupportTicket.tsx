import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { MessageSquare, CheckCircle, Clock, ArrowLeft, Menu, X, LogOut, Activity, UserCheck, CreditCard, Megaphone, Send } from "lucide-react";
import Logo from "../../components/Logo";

export default function SupportTickets() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.email !== 'adminfoodiz@gmail.com') navigate("/admin-auth");
      else fetchTickets();
    };
    checkAuth();
  }, [navigate]);

  const fetchTickets = async () => {
    // Récupère tous les tickets, du plus récent au plus ancien
    const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (data) setTickets(data);
    setLoading(false);
  };

  const handleReplyAndClose = async (ticketId: string) => {
    if (!replyText) return;
    
    // Met à jour le ticket avec la réponse de l'admin et change le statut en 'closed'
    const { error } = await supabase
      .from('support_tickets')
      .update({ 
        admin_response: replyText, 
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId);

    if (!error) {
      setReplyText("");
      setActiveTicketId(null);
      fetchTickets(); // Rafraîchir la liste
    }
  };

  const menuItems = [
    { label: "Dashboard", icon: Activity, path: "/admin" },
    { label: "Validations", icon: UserCheck, path: "/admin/approvals" },
    { label: "Finances", icon: CreditCard, path: "/admin/payouts" },
    { label: "Foodiz+", icon: Megaphone, path: "/admin/foodiz-stats" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#FFF8EA] flex overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0A0A0A] border-r border-foodiz-gold/10 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between">
          <Logo size="md" />
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-foodiz-gray"><X size={24} /></button>
        </div>
        <nav className="px-4 space-y-2 mt-4">
          {menuItems.map((item) => (
            <button key={item.label} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foodiz-gray hover:text-foodiz-cream hover:bg-foodiz-gold/5 transition-all">
              <item.icon size={18} className="text-foodiz-gold" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-foodiz-gold/10">
          <button onClick={() => { supabase.auth.signOut(); navigate("/admin-auth"); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foodiz-red hover:bg-foodiz-red/5 transition-all">
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="bg-[#0A0A0A]/80 backdrop-blur-md border-b border-foodiz-gold/10 px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-foodiz-gold"><Menu size={24} /></button>
            <button onClick={() => navigate("/admin")} className="hidden md:flex items-center gap-2 text-foodiz-gray hover:text-foodiz-cream transition-colors"><ArrowLeft size={18} /> Retour</button>
            <h1 className="foodiz-title text-xl text-foodiz-cream">Centre de Support Admin</h1>
          </div>
        </header>

        <main className="p-6 max-w-5xl mx-auto w-full">
          {loading ? <div className="text-center py-20 text-foodiz-gray animate-pulse">Chargement des tickets...</div> : (
            <div className="space-y-6">
              {tickets.length === 0 ? (
                <div className="foodiz-card p-12 text-center bg-[#0A0A0A] border-foodiz-gold/10">
                  <MessageSquare size={48} className="mx-auto text-foodiz-gray/20 mb-4" />
                  <h3 className="text-foodiz-cream text-lg font-medium mb-2">Aucun ticket pour le moment</h3>
                  <p className="text-foodiz-gray text-sm">Tout va bien, vos clients n'ont pas de problèmes !</p>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div key={ticket.id} className={`foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/10 flex flex-col gap-4 ${ticket.status === 'open' ? 'border-l-4 border-l-foodiz-red' : 'opacity-70'}`}>
                    <div className="flex justify-between items-start border-b border-foodiz-gold/10 pb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-foodiz-cream font-bold text-lg">{ticket.subject}</h3>
                          <span className={`text-[10px] px-2 py-1 rounded-full border ${ticket.status === 'open' ? 'bg-foodiz-red/10 text-foodiz-red border-foodiz-red/20' : 'bg-foodiz-green/10 text-foodiz-green border-foodiz-green/20'}`}>
                            {ticket.status === 'open' ? 'OUVERT' : 'RÉPONDU / CLOS'}
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

                    {ticket.status === 'open' && (
                      <div className="mt-2">
                        {activeTicketId === ticket.id ? (
                          <div className="space-y-3 animate-fade-in-up">
                            <textarea 
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Écrivez votre réponse au client ici..."
                              className="w-full bg-foodiz-black border border-foodiz-gold/30 rounded-xl p-3 text-foodiz-cream text-sm outline-none focus:border-foodiz-gold h-24"
                            />
                            <div className="flex gap-3 justify-end">
                              <button onClick={() => setActiveTicketId(null)} className="px-4 py-2 rounded-xl text-foodiz-gray hover:text-foodiz-cream text-sm">Annuler</button>
                              <button onClick={() => handleReplyAndClose(ticket.id)} className="px-4 py-2 rounded-xl bg-foodiz-green text-foodiz-black font-bold flex items-center gap-2 text-sm hover:bg-foodiz-green/80">
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
                ))
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}