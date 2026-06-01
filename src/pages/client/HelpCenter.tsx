import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, MessageSquare, Send, CheckCircle, HelpCircle, CreditCard, MapPin, Clock } from "lucide-react";

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const faq = [
    { q: "Comment fonctionne le Foodiz Club ?", a: "À chaque commande, vous cumulez des points (1 centime généré = 1 point). Vous pouvez les échanger contre des avantages exclusifs.", icon: <HelpCircle size={16} /> },
    { q: "Quand suis-je livré ?", a: "Nos livreurs Foodiz sont optimisés par IA pour vous livrer en 20 à 35 minutes en moyenne.", icon: <Clock size={16} /> },
    { q: "Mes paiements sont-ils sécurisés ?", a: "Absolument. Nous utilisons un cryptage de niveau bancaire. Nous ne stockons jamais votre numéro de carte complet.", icon: <CreditCard size={16} /> },
    { q: "Comment modifier mon adresse ?", a: "Rendez-vous dans 'Mon Compte' > 'Mes adresses' pour ajouter ou supprimer vos lieux de livraison.", icon: <MapPin size={16} /> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && subject && message) {
      // Envoi d'un VRAI ticket vers la base de données (visible sur le Dashboard Admin)
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        user_email: user.email,
        subject,
        message,
        status: 'open'
      });

      if (!error) {
        setStatus('success');
        setSubject("");
        setMessage("");
      }
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up border-x-2 border-foodiz-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/client/account")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Centre d'Aide</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-8">
        
        {/* FAQ */}
        <div>
          <h2 className="foodiz-title text-lg mb-4">Questions Fréquentes</h2>
          <div className="space-y-3">
            {faq.map((item, idx) => (
              <div key={idx} className="foodiz-card p-4 bg-[#0A0A0A] border-foodiz-gold/10">
                <div className="flex items-start gap-3">
                  <div className="text-foodiz-gold mt-0.5">{item.icon}</div>
                  <div>
                    <p className="text-foodiz-cream text-sm font-bold mb-1">{item.q}</p>
                    <p className="text-foodiz-gray text-xs leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulaire de Contact Réel */}
        <div className="foodiz-card p-6 bg-gradient-to-br from-foodiz-gold/5 to-foodiz-card border border-foodiz-gold/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-foodiz-gold/10 flex items-center justify-center text-foodiz-gold">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="foodiz-title text-base">Contacter le Support</h2>
              <p className="text-[10px] text-foodiz-gray">Une réponse sous 24h garantie.</p>
            </div>
          </div>

          {status === 'success' ? (
            <div className="p-4 rounded-xl bg-foodiz-green/10 text-foodiz-green border border-foodiz-green/20 flex items-center gap-3 text-sm">
              <CheckCircle size={18} /> Message envoyé ! Nous vous répondrons bientôt.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                type="text" 
                placeholder="Sujet de votre demande..." 
                required 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
                className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-3 text-foodiz-cream text-sm outline-none focus:border-foodiz-gold" 
              />
              <textarea 
                placeholder="Décrivez votre problème en détail..." 
                required 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl p-3 text-foodiz-cream text-sm outline-none focus:border-foodiz-gold h-24 resize-none" 
              />
              <button type="submit" disabled={status === 'loading'} className="w-full foodiz-btn py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                {status === 'loading' ? 'Envoi en cours...' : <><Send size={16} /> Envoyer le message</>}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}