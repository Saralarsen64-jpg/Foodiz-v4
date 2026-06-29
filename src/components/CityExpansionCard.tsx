import { CheckCircle2, MapPin, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { supabase } from "../lib/supabase";

type CoverageStatus = "available" | "coming_soon" | "address_required";

export default function CityExpansionCard({
  status,
  city,
  alreadyRequested = false,
  onRequested,
}: {
  status: CoverageStatus;
  city?: string | null;
  alreadyRequested?: boolean;
  onRequested?: () => void;
}) {
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [requested, setRequested] = useState(alreadyRequested);

  if (status === "available") return null;

  const requestExpansion = async () => {
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/city-expansion-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
          "X-Foodiz-Client": "web",
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Demande impossible.");
      setRequested(true);
      onRequested?.();
      toast.success(payload.message || "Votre ville est maintenant dans le radar Foodiz.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Réessayez dans un instant.");
    } finally {
      setSending(false);
    }
  };

  if (status === "address_required") {
    return (
      <section className="foodiz-card overflow-hidden border-foodiz-gold/25 bg-[radial-gradient(circle_at_top_right,rgba(216,168,79,.14),transparent_40%),#090909] p-6 text-center">
        <MapPin className="mx-auto text-foodiz-gold" size={26} />
        <h3 className="foodiz-title mt-4 text-xl">Où doit-on vous régaler ?</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-foodiz-gray">
          Ajoutez une adresse française vérifiée pour découvrir les partenaires disponibles autour de vous.
        </p>
        <button onClick={() => navigate("/client/account/addresses")} className="foodiz-btn mt-5 px-5 py-3 text-sm">
          Ajouter mon adresse
        </button>
      </section>
    );
  }

  return (
    <section className="foodiz-card overflow-hidden border-foodiz-gold/25 bg-[radial-gradient(circle_at_top_right,rgba(216,168,79,.16),transparent_42%),#090909] p-6 text-center">
      {requested ? (
        <CheckCircle2 className="mx-auto text-foodiz-green" size={28} />
      ) : (
        <Sparkles className="mx-auto text-foodiz-gold" size={28} />
      )}
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[.22em] text-foodiz-gold">
        Foodiz se prépare
      </p>
      <h3 className="foodiz-title mt-2 text-2xl">
        {requested
          ? `${city || "Votre ville"} est dans notre radar`
          : `Bientôt à ${city || "votre adresse"}`
        }
      </h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-foodiz-gray">
        {requested
          ? "Votre demande est enregistrée. Nous vous informerons dès que les premières adresses Foodiz seront prêtes autour de chez vous."
          : "Aucun partenaire n’est encore disponible autour de votre adresse. Signalez votre intérêt : cela nous aide à prioriser les prochaines ouvertures."
        }
      </p>
      {!requested && (
        <button disabled={sending} onClick={() => void requestExpansion()} className="foodiz-btn mt-5 px-6 py-3 text-sm disabled:opacity-50">
          {sending ? "Enregistrement…" : "Je veux Foodiz dans ma ville"}
        </button>
      )}
      <p className="mt-4 text-[10px] text-foodiz-gray">
        Votre compte reste actif partout en France, même avant l’arrivée des premiers partenaires.
      </p>
    </section>
  );
}
