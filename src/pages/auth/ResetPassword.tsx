import { useState } from "react";
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
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
      toast.error("Le lien est invalide ou expiré. Demandez-en un nouveau.");
      return;
    }
    toast.success("Votre mot de passe a été modifié.");
    navigate("/auth/login", { replace: true });
  };

  return <div className="min-h-screen bg-weello-black flex items-center justify-center p-4"><div className="w-full max-w-md weello-card p-8 border border-weello-gold/20"><div className="flex justify-center mb-6"><Logo size="md" /></div><h1 className="weello-title text-2xl text-center">Nouveau mot de passe</h1><p className="text-sm text-weello-gray text-center mt-2 mb-6">Choisissez un nouveau mot de passe sécurisé.</p><form onSubmit={submit} className="space-y-4">{[{ value: password, set: setPassword, placeholder: "Nouveau mot de passe" }, { value: confirmation, set: setConfirmation, placeholder: "Confirmer le mot de passe" }].map((field) => <div key={field.placeholder} className="flex items-center gap-3 px-4 py-4 rounded-2xl border border-weello-gold/20 bg-weello-black"><Lock size={17} className="text-weello-gold" /><input type="password" value={field.value} onChange={(event) => field.set(event.target.value)} placeholder={field.placeholder} className="flex-1 bg-transparent text-weello-cream outline-none text-sm" required /></div>)}<button disabled={loading} className="weello-btn w-full py-4 disabled:opacity-50">{loading ? "Modification..." : "Modifier mon mot de passe"}</button></form></div></div>;
}
