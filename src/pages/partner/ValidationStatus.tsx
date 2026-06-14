import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Clock3 } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function PartnerValidationStatus() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("partner_applications").select("status").eq("user_id", user.id).single();
      if (data?.status) setStatus(data.status);
    };
    load();
  }, []);

  const labels: Record<string, { title: string; description: string }> = {
    pending: { title: "En attente d’examen", description: "Votre dossier partenaire est en cours de vérification par Foodiz." },
    validated: { title: "Dossier validé", description: "Votre établissement a été validé par Foodiz." },
    missing_documents: { title: "Documents manquants", description: "Des informations complémentaires sont nécessaires pour valider votre dossier." },
    rejected: { title: "Dossier refusé", description: "Votre dossier n’a pas été retenu. Contactez le support pour plus d’informations." },
    suspended: { title: "Compte suspendu", description: "Votre accès partenaire est temporairement suspendu." },
  };
  const current = labels[status] || labels.pending;
  return (
    <div className="min-h-screen bg-foodiz-black pb-24">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">État de validation</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="foodiz-card p-6">
          <div className="flex items-center gap-3 mb-3"><Clock3 size={18} className="text-foodiz-gold" /><h2 className="foodiz-title text-lg">{current.title}</h2></div>
          <p className="text-sm text-foodiz-gray">{current.description}</p>
        </div>
      </main>
    </div>
  );
}
