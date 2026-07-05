import { useEffect, useState } from "react";
import { CheckCircle, Megaphone, Send, Users } from "lucide-react";
import toast from "react-hot-toast";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

export default function AdminBroadcast() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [clientCount, setClientCount] = useState(0);

  const load = async () => {
    const [{ count }, { data }] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client"),
      supabase.from("admin_broadcasts").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setClientCount(count || 0);
    setHistory(data || []);
  };

  useEffect(() => { void load(); }, []);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: clients, error: clientsError } = await supabase.from("profiles").select("id").eq("role", "client");
    if (clientsError) { toast.error(clientsError.message); setLoading(false); return; }
    if (!clients?.length) { toast.error("Aucun client destinataire."); setLoading(false); return; }

    const { error: notificationError } = await supabase.from("notifications").insert(clients.map((client) => ({
      user_id: client.id,
      title: title.trim(),
      message: message.trim(),
      type: "info",
      is_read: false,
    })));
    if (notificationError) { toast.error(notificationError.message); setLoading(false); return; }

    const { error: broadcastError } = await supabase.from("admin_broadcasts").insert({
      admin_id: user.id,
      title: title.trim(),
      message: message.trim(),
      target_roles: ["client"],
      is_sent: true,
      sent_at: new Date().toISOString(),
      recipients_count: clients.length,
    });
    if (broadcastError) { toast.error(broadcastError.message); setLoading(false); return; }

    toast.success(`Notification envoyée à ${clients.length} client(s).`);
    setTitle("");
    setMessage("");
    setLoading(false);
    await load();
  };

  return <AdminShell title="Notification globale" subtitle="Diffusion administrative fiable avec historique d’envoi réel">
    <section className="grid gap-4 md:grid-cols-[1fr_320px]">
      <form onSubmit={handleSend} className="foodiz-card space-y-5 border-foodiz-gold/20 bg-[radial-gradient(circle_at_top_right,rgba(216,168,79,0.12),transparent_40%)] p-6 shadow-[0_0_45px_rgba(216,168,79,0.05)]">
        <div className="flex items-center gap-3"><Megaphone size={21} className="text-foodiz-gold"/><div><h2 className="foodiz-title text-xl">Créer une annonce</h2><p className="mt-1 text-xs text-foodiz-gray">Envoyée dans la cloche de notification des clients.</p></div></div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Titre<input required maxLength={90} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex : Weello arrive dans votre ville" className="mt-2 w-full rounded-2xl border border-foodiz-gold/20 bg-foodiz-black p-4 text-sm normal-case text-foodiz-cream outline-none"/></label>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">Message<textarea required maxLength={240} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message court, clair, utile." className="mt-2 h-36 w-full resize-none rounded-2xl border border-foodiz-gold/20 bg-foodiz-black p-4 text-sm normal-case text-foodiz-cream outline-none"/></label>
        <button disabled={loading} className="foodiz-btn flex w-full items-center justify-center gap-2 py-4 disabled:opacity-50"><Send size={18}/>{loading ? "Envoi vérifié..." : `Envoyer à ${clientCount} client(s)`}</button>
      </form>
      <aside className="foodiz-card border-foodiz-gold/20 p-6">
        <Users size={22} className="text-foodiz-gold"/><p className="mt-5 text-[10px] uppercase tracking-widest text-foodiz-gray">Audience actuelle</p><p className="mt-2 text-5xl font-serif italic text-foodiz-cream">{clientCount}</p><p className="mt-2 text-xs text-foodiz-gray">Clients enregistrés et ciblables par notification interne.</p>
      </aside>
    </section>

    <section className="foodiz-card overflow-hidden">
      <div className="border-b border-foodiz-gold/10 p-5"><h2 className="foodiz-title text-lg">Historique</h2></div>
      {history.length === 0 ? <div className="p-6 text-sm text-foodiz-gray">Aucune diffusion enregistrée.</div> : <div className="divide-y divide-white/5">{history.map((item) => <article key={item.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center"><CheckCircle size={17} className="text-foodiz-green"/><div className="flex-1"><p className="font-semibold text-foodiz-cream">{item.title}</p><p className="mt-1 text-xs text-foodiz-gray">{item.message}</p></div><div className="text-xs text-foodiz-gray md:text-right"><p>{item.recipients_count} destinataire(s)</p><p>{item.sent_at ? new Date(item.sent_at).toLocaleString("fr-FR") : "-"}</p></div></article>)}</div>}
    </section>
  </AdminShell>;
}
