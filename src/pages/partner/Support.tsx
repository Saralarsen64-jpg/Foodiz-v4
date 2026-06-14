import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Send } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function PartnerSupport() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("Question partenaire");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expirée.");
      setSending(false);
      return;
    }
    const { error: insertError } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      user_email: user.email,
      subject: subject.trim(),
      message: message.trim(),
      status: "open",
      priority: "normal",
    });
    if (insertError) {
      setError("Impossible d'envoyer le ticket.");
      setSending(false);
      return;
    }
    setSent(true);
    setMessage("");
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">Support partenaire</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="foodiz-card p-5"><input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-foodiz-cream outline-none" /></div>
        <div className="foodiz-card p-5"><textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full min-h-[120px] bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-foodiz-cream outline-none resize-none" placeholder="Décrivez votre besoin..." /></div>
        {error && <div className="foodiz-card p-3 text-foodiz-red border-foodiz-red/20">{error}</div>}
        <button disabled={sending} onClick={submit} className="w-full foodiz-btn py-4 flex items-center justify-center gap-2 disabled:opacity-50">{sent ? "Ticket envoyé" : sending ? "Envoi..." : <><Send size={16} /> Envoyer au support</>}</button>
      </main>
    </div>
  );
}
