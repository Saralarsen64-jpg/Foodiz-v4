import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, MessageSquare, Send, CheckCircle, HelpCircle, CreditCard, MapPin, Clock, AlertCircle } from "lucide-react";

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || "");
    };
    getUser();
  }, []);

  const faq = [
    { q: "Comment fonctionne le Foodiz Club ?", a: "À chaque commande, vous cumulez des points. Vous pouvez les échanger contre des avantages exclusifs qui se renouvellent toutes les 48h.", icon: <HelpCircle size={16} /> },
    { q: "Quand suis-je livré ?", a: "Nos livreurs Foodiz sont optimisés par IA pour vous livrer en 20 à 35 minutes en moyenne.", icon: <Clock size={16} /> },
    { q: "Mes paiements sont-ils sécurisés ?", a: "Absolument. Nous utilisons un cryptage de niveau bancaire. Nous ne stockons jamais votre numéro de carte complet.", icon: <CreditCard size={16} /> },
    { q: "Comment modifier mon adresse ?", a: "Rendez-vous dans 'Mon Compte' > 'Mes adresses' pour ajouter ou supprimer vos lieux de livraison.", icon: <MapPin size={16} /> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg("");
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setStatus('error');
      setErrorMsg("Session expirée. Veuillez vous reconnecter.");
      return;
    }

    // Envoi RÉEL vers la base de données (Payload simplifié)
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      user_email: userEmail,
      subject: subject,
      message: message,
      status: 'open'
    });

    if (error) {
      console.error("Erreur Supabase détaillée:", error); // Regarde la console (F12) si ça bloque encore
      setStatus('error');
      setErrorMsg("Impossible d'envoyer le message. Vérifiez votre connexion internet.");
    } else {
      setStatus('success');
      setSubject("");
      setMessage("");
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
              <p className="text-[10px] text-foodiz-gray">Réponse garantie sous 24h par notre équipe.</p>
            </div>
          </div>

          {status === 'success' ? (
            <div className="p-4 rounded-xl bg-foodiz-green/10 text-foodiz-green border border-foodiz-green/20 flex items-center gap-3 text-sm">
              <CheckCircle size={18} /> Message envoyé avec succès ! Nous vous répondrons à : {userEmail}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {status === 'error' && (
                <div className="p-3 rounded-lg bg-foodiz-red/10 text-foodiz-red border border-foodiz-red/20 flex items-center gap-2 text-xs">
                  <AlertCircle size={14} /> {errorMsg}
                </div>
              )}
              <input 
                type="email" 
                readOnly
                value={userEmail}
                className="w-full bg-foodiz-black/50 border border-foodiz-gold/10 rounded-xl p-3 text-foodiz-gray text-sm outline-none cursor-not-allowed" 
              />
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
                {status === 'loading' ? 'Envoi en cours...' : <><Send size={16} /> Envoyer au support</>}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}