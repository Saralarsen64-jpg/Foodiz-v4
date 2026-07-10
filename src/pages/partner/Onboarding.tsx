import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle2, FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function PartnerOnboarding() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", siret: "", phone: "", address: "", postalCode: "", city: "", description: "" });
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const siret = form.siret.replace(/\s/g, "");
    if (!form.name.trim() || !/^\d{14}$/.test(siret) || !form.phone.trim() || !form.address.trim() || !form.postalCode.trim() || !form.city.trim()) {
      toast.error("Complétez tous les champs obligatoires avec un SIRET de 14 chiffres."); return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Utilisateur non connecté.");
      const response = await fetch("/api/address-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "save", ...form, siret }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Adresse professionnelle invalide.");
      toast.success("Dossier partenaire envoyé.");
      window.setTimeout(() => navigate("/partner/validation-status"), 700);
    } catch (error: any) { toast.error(error.message || "Impossible d'envoyer le dossier."); }
    setSending(false);
  };

  const field = (key: keyof typeof form, placeholder: string) => <input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={placeholder} className="w-full rounded-2xl border border-weello-gold/10 bg-white/[0.03] px-4 py-3 text-weello-cream outline-none"/>;
  return <div className="min-h-screen bg-weello-black pb-24"><header className="sticky top-0 z-30 border-b border-weello-gold/10 bg-weello-card px-4 py-3"><div className="mx-auto flex max-w-3xl items-center gap-3"><button onClick={() => navigate("/partner/validation-status")} className="text-weello-gold"><ChevronLeft size={20}/></button><h1 className="weello-title text-lg">Dossier partenaire</h1></div></header><main className="mx-auto max-w-3xl space-y-4 px-4 py-6"><section className="weello-card p-5"><h2 className="weello-title text-xl">Votre établissement</h2><p className="mt-2 text-xs text-weello-gray">Ces informations permettent à Weello de vérifier l'entreprise et préparer sa fiche publique. L'adresse sera géocodée côté serveur avant validation.</p></section><section className="weello-card grid gap-4 p-5 md:grid-cols-2">{field("name", "Nom de l'établissement *")}{field("siret", "SIRET - 14 chiffres *")}{field("phone", "Téléphone professionnel *")}{field("city", "Ville *")}{field("address", "Numéro et rue *")}{field("postalCode", "Code postal *")}<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description de l'établissement" className="min-h-28 rounded-2xl border border-weello-gold/10 bg-white/[0.03] px-4 py-3 text-weello-cream outline-none md:col-span-2"/><div className="rounded-xl border border-weello-gold/15 bg-weello-gold/5 p-3 text-xs text-weello-gray md:col-span-2">Les coordonnées bancaires seront demandées via Stripe Connect lors de l'activation des virements. Ne transmettez pas votre IBAN au support.</div><button onClick={submit} disabled={sending} className="weello-btn flex w-full items-center justify-center gap-2 py-4 disabled:opacity-50 md:col-span-2">{sending ? <CheckCircle2 size={18}/> : <FileText size={18}/>} {sending ? "Vérification de l'adresse..." : "Envoyer mon dossier"}</button></section></main></div>;
}
