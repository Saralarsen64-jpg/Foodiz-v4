import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { resolveRedirectPath } from "../../utils/authProfile";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 1. Récupérer la session. Supabase échange automatiquement le hash de l'URL (#access_token=...) contre une session valide.
        // C'est CETTE étape qui confirme l'email côté Supabase (passe le statut de pending à active).
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          setError("Lien de confirmation invalide, expiré ou déjà utilisé.");
          return;
        }

        // 2. Rediriger vers l'étape réellement accessible pour ce compte.
        navigate(await resolveRedirectPath());

      } catch (err) {
        console.error("Erreur lors du callback:", err);
        setError("Une erreur technique est survenue. Veuillez réessayer de vous connecter.");
      }
    };

    handleCallback();
  }, [navigate]);

  // Affichage en cas d'erreur (lien invalide)
  if (error) {
    return (
      <div className="min-h-screen bg-weello-black flex flex-col items-center justify-center text-weello-cream p-6 text-center">
        <h1 className="weello-title text-2xl text-weello-red mb-4">Oups !</h1>
        <p className="text-weello-gray mb-6">{error}</p>
        <button onClick={() => navigate('/auth/login')} className="weello-btn px-6 py-3">Retour à la connexion</button>
      </div>
    );
  }

  // Affichage pendant le chargement
  return (
    <div className="min-h-screen bg-weello-black flex flex-col items-center justify-center text-weello-gold">
      <div className="w-16 h-16 rounded-full border-2 border-weello-gold/20 border-t-weello-gold animate-spin mb-4"></div>
      <p className="text-sm animate-pulse">Confirmation de votre compte Weello en cours...</p>
      <p className="text-[10px] text-weello-gray mt-2">Ne fermez pas cette page.</p>
    </div>
  );
}
