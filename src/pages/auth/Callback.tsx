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
        const url = new URL(window.location.href);
        const callbackError = url.searchParams.get("error_description")
          || url.searchParams.get("error");
        if (callbackError) throw new Error(callbackError);

        // Supabase peut utiliser un code PKCE, un token_hash personnalisé ou
        // l'ancien hash implicite selon la configuration Auth et le template.
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const otpType = url.searchParams.get("type");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash) {
          const supportedTypes = new Set(["signup", "email", "recovery", "invite", "magiclink", "email_change"]);
          if (!otpType || !supportedTypes.has(otpType)) throw new Error("Type de confirmation invalide");
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType as "signup" | "email" | "recovery" | "invite" | "magiclink" | "email_change",
          });
          if (error) throw error;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          setError("Lien de confirmation invalide, expiré ou déjà utilisé.");
          return;
        }

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
