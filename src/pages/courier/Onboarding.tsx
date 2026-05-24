import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle2, FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function CourierOnboarding() {
  const navigate = useNavigate();
  const [name, setName] = useState("Karim");
  const [city, setCity] = useState("Paris");
  const [vehicle, setVehicle] = useState("Scooter");
  const [iban, setIban] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté.");

      const { error } = await supabase
        .from("courier_applications")
        .update({ city, vehicle_type: vehicle, status: "pending", updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) throw error;

      setSent(true);
      toast.success("Dossier livreur envoyé.");
      window.setTimeout(() => navigate("/courier/validation-status"), 900);
    } catch (err: any) {
      toast.error(err.message || "Impossible d'envoyer le dossier.");
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/courier")} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">Onboarding livreur</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="foodiz-card p-5"><input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-foodiz-cream outline-none" /></div>
        <div className="foodiz-card p-5"><input value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-foodiz-cream outline-none" /></div>
        <div className="foodiz-card p-5"><input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="w-full bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-foodiz-cream outline-none" /></div>
        <div className="foodiz-card p-5"><input value={iban} onChange={(e) => setIban(e.target.value)} className="w-full bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-foodiz-cream outline-none" /></div>
        <button onClick={submit} className="w-full foodiz-btn py-4 flex items-center justify-center gap-2">{sent ? <CheckCircle2 size={18} /> : <FileText size={18} />} Envoyer mon dossier</button>
      </main>
    </div>
  );
}
