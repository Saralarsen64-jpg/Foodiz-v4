import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, MessageSquare, Send, CheckCircle, HelpCircle, CreditCard, MapPin, Clock, AlertCircle } from "lucide-react";

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    if (!userId) { setStatus('error'); return; }

    const { error } = await supabase.from('support_tickets').insert({
      user_id: userId,
      user_email: userEmail,
      subject: subject,
      message: message,
      status: 'open'
    });

    if (error) {
      console.error(error);
      setStatus('error');
    } else {
      setStatus('success');
      setSubject("");
      setMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up border-x-2 border-foodiz-gold/20 relative">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30 flex items-center justify-between max-w-lg mx-auto">
        <button onClick={() => navigate("/client/account")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
        <h1 className="foodiz-title text-lg">Centre d'Aide</h1>
        <div className="w-6" />
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-8">
        <div className="foodiz-card p-6 bg-gradient-to-br from-foodiz-gold/5 to-foodiz-card border border-foodiz-gold/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-foodiz-gold/10 flex items-center justify-center text-foodiz-gold"><MessageSquare size={20} /></div>
            <div>
              <h2 className="foodiz-title text-base">Contacter le Support</h2>
              <p className="text-[10px] text-foodiz-gray">Réponse garantie sous 24h.</p>
            </div>
          </div>

          {status === 'success' ? (
            <div className="p-4 rounded-xl bg-foodiz-green/10 text-foodiz-green border border-foodiz-green/20 flex items-center gap-3 text-sm animate-fade-in-up">
              <CheckCircle size={18} /> Message envoyé !
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {status === 'error' && <div className="p-3 rounded-lg bg-foodiz-red/10 text-foodiz-red border border-foodiz-red/20 text-xs">Erreur lors de l'envoi.</div>}
              <input type="email" readOnly value={userEmail} className="w-full bg-foodiz-black/50 border border-foodiz-gold/10 rounded-xl p-3 text-foodiz-gray text-sm outline-none cursor-not-allowed" />
              <input type="text" placeholder="Sujet..." required value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-3 text-foodiz-cream text-sm outline-none focus:border-foodiz-gold" />
              <textarea placeholder="Votre message..." required value={message} onChange={e => setMessage(e.target.value)} className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-3 text-foodiz-cream text-sm outline-none focus:border-foodiz-gold h-24 resize-none" />
              <button type="submit" disabled={status === 'loading'} className="w-full foodiz-btn py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                {status === 'loading' ? 'Envoi...' : <><Send size={16} /> Envoyer</>}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}