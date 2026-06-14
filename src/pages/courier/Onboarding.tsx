import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bike, CheckCircle2, FileText, MapPin, Phone, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import CourierShell from "../../components/CourierShell";
import { supabase } from "../../lib/supabase";

export default function CourierOnboarding() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", city: "", vehicle: "bike" });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: profile }, { data: application }] = await Promise.all([
        supabase.from("profiles").select("full_name,phone,city").eq("id", user.id).maybeSingle(),
        supabase.from("courier_applications").select("city,vehicle_type").eq("user_id", user.id).maybeSingle(),
      ]);
      setForm({ name: profile?.full_name || "", phone: profile?.phone || "", city: application?.city || profile?.city || "", vehicle: application?.vehicle_type || "bike" });
    })();
  }, []);

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.city.trim()) return toast.error("Complétez votre nom, téléphone et ville.");
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté.");
      const results = await Promise.all([
        supabase.from("profiles").update({ full_name: form.name.trim(), phone: form.phone.trim(), city: form.city.trim() }).eq("id", user.id),
        supabase.from("courier_applications").update({ city: form.city.trim(), vehicle_type: form.vehicle, updated_at: new Date().toISOString() }).eq("user_id", user.id),
      ]);
      const error = results.find((result) => result.error)?.error;
      if (error) throw error;
      toast.success("Dossier livreur envoyé.");
      window.setTimeout(() => navigate("/courier/validation-status"), 700);
    } catch (error: any) {
      toast.error(error.message || "Impossible d'envoyer le dossier.");
      setSending(false);
    }
  };

  const field = (key: "name" | "phone" | "city", placeholder: string, Icon: typeof UserRound) => <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4"><Icon size={17} className="text-foodiz-gold"/><input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} className="w-full bg-transparent py-4 text-foodiz-cream outline-none"/></div>;

  return <CourierShell title="Rejoindre la flotte" back="/courier">
    <section className="rounded-[2rem] border border-foodiz-gold/20 bg-foodiz-gold/[0.06] p-6"><FileText size={25} className="text-foodiz-gold"/><h2 className="foodiz-title mt-4 text-2xl">Votre dossier livreur</h2><p className="mt-2 text-sm text-foodiz-gray">Ces informations servent à vérifier votre profil professionnel.</p></section>
    <section className="foodiz-card mt-4 space-y-4 p-5">{field("name", "Nom complet", UserRound)}{field("phone", "Téléphone", Phone)}{field("city", "Ville", MapPin)}<div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4"><Bike size={17} className="text-foodiz-gold"/><select value={form.vehicle} onChange={(event) => setForm((current) => ({ ...current, vehicle: event.target.value }))} className="w-full bg-transparent py-4 text-foodiz-cream outline-none"><option className="bg-foodiz-card" value="bike">Vélo</option><option className="bg-foodiz-card" value="scooter">Scooter</option><option className="bg-foodiz-card" value="motorcycle">Moto</option><option className="bg-foodiz-card" value="car">Voiture</option></select></div><div className="rounded-xl border border-foodiz-gold/15 bg-foodiz-gold/5 p-3 text-xs text-foodiz-gray">Les coordonnées bancaires seront demandées uniquement via Stripe Connect lors de l'activation des virements.</div><button onClick={submit} disabled={sending} className="foodiz-btn flex w-full items-center justify-center gap-2 py-4 disabled:opacity-50">{sending ? <CheckCircle2 size={18}/> : <FileText size={18}/>} {sending ? "Envoi..." : "Envoyer mon dossier"}</button></section>
  </CourierShell>;
}
