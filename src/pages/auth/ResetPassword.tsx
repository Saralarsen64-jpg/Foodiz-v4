import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import toast from "react-hot-toast";
import Logo from "../../components/Logo";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkValid, setLinkValid] = useState(false);

  const passwordErrorMessage = (error: { code?: string; message?: string }) => {
    const code = error.code || "";
    const message = (error.message || "").toLowerCase();
    if (code === "same_password" || message.includes("same password") || message.includes("different from the old")) {
      return "Choisissez un mot de passe différent de l’ancien.";
    }
    if (code === "weak_password" || message.includes("weak") || message.includes("characters")) {
      return "Ce mot de passe est trop faible. Utilisez au moins 10 caractères avec une majuscule, une minuscule, un chiffre et un symbole.";
    }
    if (code === "session_not_found" || code === "refresh_token_not_found" || message.includes("session")) {
      return "La session de récupération n’est plus valide. Demandez un nouveau lien.";
    }
    return "Le mot de passe n’a pas pu être modifié. Choisissez-en un nouveau plus robuste et réessayez.";
  };

  useEffect(() => {
    let active = true;
    const prepareRecoverySession = async () => {
      try {
        const url = new URL(window.location.href);
        const callbackError = url.searchParams.get("error_description")
          || url.searchParams.get("error");
        if (callbackError) throw new Error(callbackError);

        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (error) throw error;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) throw error || new Error("Recovery session unavailable");
        if (active) setLinkValid(true);
      } catch {
        if (active) setLinkValid(false);
      } finally {
        if (active) setCheckingLink(false);
      }
    };
    void prepareRecoverySession();
    return () => { active = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!linkValid) {
      toast.error("Le lien est invalide ou expiré. Demandez-en un nouveau.");
      return;
    }
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmation) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(passwordErrorMessage(error));
      return;
    }
    toast.success("Votre mot de passe a été modifié.");
    navigate("/auth/login", { replace: true });
  };

  return <div className="min-h-screen bg-weello-black flex items-center justify-center p-4"><div className="w-full max-w-md weello-card p-8 border border-weello-gold/20"><div className="flex justify-center mb-6"><Logo size="md" /></div><h1 className="weello-title text-2xl text-center">Nouveau mot de passe</h1>{checkingLink ? <p className="text-sm text-weello-gray text-center mt-4">Vérification du lien sécurisé…</p> : !linkValid ? <div className="mt-5 text-center"><p className="text-sm text-weello-red">Ce lien est invalide, expiré ou déjà utilisé.</p><button type="button" onClick={() => navigate("/auth/login")} className="mt-5 text-sm text-weello-gold underline">Demander un nouveau lien</button></div> : <><p className="text-sm text-weello-gray text-center mt-2 mb-6">Choisissez un nouveau mot de passe sécurisé.</p><form onSubmit={submit} className="space-y-4">{[{ value: password, set: setPassword, placeholder: "Nouveau mot de passe" }, { value: confirmation, set: setConfirmation, placeholder: "Confirmer le mot de passe" }].map((field) => <div key={field.placeholder} className="flex items-center gap-3 px-4 py-4 rounded-2xl border border-weello-gold/20 bg-weello-black"><Lock size={17} className="text-weello-gold" /><input type="password" value={field.value} onChange={(event) => field.set(event.target.value)} placeholder={field.placeholder} className="flex-1 bg-transparent text-weello-cream outline-none text-sm" required /></div>)}<button disabled={loading} className="weello-btn w-full py-4 disabled:opacity-50">{loading ? "Modification..." : "Modifier mon mot de passe"}</button></form></>}</div></div>;
}
