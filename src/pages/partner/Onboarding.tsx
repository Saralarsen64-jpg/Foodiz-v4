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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté.");
      const restaurantData = { name: form.name.trim(), siret, phone: form.phone.trim(), address: form.address.trim(), postal_code: form.postalCode.trim(), city: form.city.trim(), description: form.description.trim(), updated_at: new Date().toISOString() };
      const { data: existing } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).maybeSingle();
      const restaurantResult = existing
        ? await supabase.from("restaurants").update(restaurantData).eq("id", existing.id)
        : await supabase.from("restaurants").insert({ owner_id: user.id, ...restaurantData, status: "pending", is_active: false });
      if (restaurantResult.error) throw restaurantResult.error;
      const { error: applicationError } = await supabase.from("partner_applications").update({ business_name: form.name.trim(), siret, phone: form.phone.trim(), address: form.address.trim(), postal_code: form.postalCode.trim(), city: form.city.trim(), description: form.description.trim(), updated_at: new Date().toISOString() }).eq("user_id", user.id);
      if (applicationError) throw applicationError;
      toast.success("Dossier partenaire envoyé.");
      window.setTimeout(() => navigate("/partner/validation-status"), 700);
    } catch (error: any) { toast.error(error.message || "Impossible d'envoyer le dossier."); }
    setSending(false);
  };

  const field = (key: keyof typeof form, placeholder: string) => <input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={placeholder} className="w-full rounded-2xl border border-foodiz-gold/10 bg-white/[0.03] px-4 py-3 text-foodiz-cream outline-none"/>;
  return <div className="min-h-screen bg-foodiz-black pb-24"><header className="sticky top-0 z-30 border-b border-foodiz-gold/10 bg-foodiz-card px-4 py-3"><div className="mx-auto flex max-w-3xl items-center gap-3"><button onClick={() => navigate("/partner/validation-status")} className="text-foodiz-gold"><ChevronLeft size={20}/></button><h1 className="foodiz-title text-lg">Dossier partenaire</h1></div></header><main className="mx-auto max-w-3xl space-y-4 px-4 py-6"><section className="foodiz-card p-5"><h2 className="foodiz-title text-xl">Votre établissement</h2><p className="mt-2 text-xs text-foodiz-gray">Ces informations permettent à Foodiz de vérifier l'entreprise et préparer sa fiche publique.</p></section><section className="foodiz-card grid gap-4 p-5 md:grid-cols-2">{field("name", "Nom de l'établissement *")}{field("siret", "SIRET - 14 chiffres *")}{field("phone", "Téléphone professionnel *")}{field("city", "Ville *")}{field("address", "Adresse complète *")}{field("postalCode", "Code postal *")}<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description de l'établissement" className="min-h-28 rounded-2xl border border-foodiz-gold/10 bg-white/[0.03] px-4 py-3 text-foodiz-cream outline-none md:col-span-2"/><div className="rounded-xl border border-foodiz-gold/15 bg-foodiz-gold/5 p-3 text-xs text-foodiz-gray md:col-span-2">Les coordonnées bancaires seront demandées via Stripe Connect lors de l'activation des virements. Ne transmettez pas votre IBAN au support.</div><button onClick={submit} disabled={sending} className="foodiz-btn flex w-full items-center justify-center gap-2 py-4 disabled:opacity-50 md:col-span-2">{sending ? <CheckCircle2 size={18}/> : <FileText size={18}/>} {sending ? "Envoi..." : "Envoyer mon dossier"}</button></section></main></div>;
}
