import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle2, FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function PartnerOnboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("Maison K");
  const [siret, setSiret] = useState("");
  const [city, setCity] = useState("Paris");
  const [iban, setIban] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté.");

      const { error: restaurantError } = await supabase.from("restaurants").upsert({
        owner_id: user.id,
        name,
        city,
        siret,
        status: "pending_admin_review",
        updated_at: new Date().toISOString(),
      });
      if (restaurantError) throw restaurantError;

      const { error: applicationError } = await supabase
        .from("partner_applications")
        .update({ city, status: "pending", updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (applicationError) throw applicationError;

      setSent(true);
      toast.success("Dossier partenaire envoyé.");
      window.setTimeout(() => navigate("/partner/validation-status"), 900);
    } catch (err: any) {
      toast.error(err.message || "Impossible d'envoyer le dossier.");
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">Onboarding partenaire</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="foodiz-card p-5"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom établissement" className="w-full bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-foodiz-cream outline-none" /></div>
        <div className="foodiz-card p-5"><input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="SIRET" className="w-full bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-foodiz-cream outline-none" /></div>
        <div className="foodiz-card p-5"><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" className="w-full bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-foodiz-cream outline-none" /></div>
        <div className="foodiz-card p-5"><input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="IBAN" className="w-full bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-foodiz-cream outline-none" /></div>
        <button onClick={submit} className="w-full foodiz-btn py-4 flex items-center justify-center gap-2">{sent ? <CheckCircle2 size={18} /> : <FileText size={18} />} Envoyer mon dossier</button>
      </main>
    </div>
  );
}
