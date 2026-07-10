import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function DeleteAccountPage() {
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const deleteAccount = async () => {
    if (confirmation !== "SUPPRIMER") return;
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      navigate("/auth");
      return;
    }

    const response = await fetch("/api/delete-account", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!response.ok) {
      toast.error("Impossible de supprimer le compte pour le moment.");
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    toast.success("Votre compte Weello a été supprimé.");
    navigate("/auth", { replace: true });
  };
  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-weello-gold text-sm mb-6"><ChevronLeft size={18} /> Compte</button>
      <div className="weello-card p-6 border-weello-red/30 bg-weello-red/5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={24} className="text-weello-red" />
          <h1 className="weello-title text-xl text-weello-red">Zone de danger</h1>
        </div>
        <p className="text-sm text-weello-gray mb-6">La suppression de votre compte est irréversible. Vous perdrez tous vos points Weello et votre historique.</p>
        <label className="block text-xs text-weello-gray mb-2">Écrivez <strong className="text-weello-cream">SUPPRIMER</strong> pour confirmer.</label>
        <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-2xl border border-weello-red/20 bg-weello-black px-4 py-3 text-weello-cream outline-none focus:border-weello-red/50 mb-4" />
        <button disabled={confirmation !== "SUPPRIMER" || loading} onClick={deleteAccount} className="w-full py-4 rounded-2xl bg-weello-red text-weello-black font-bold text-sm hover:bg-weello-red/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed">{loading ? "Suppression..." : "Supprimer définitivement mon compte"}</button>
      </div>
    </div>
  );
}
