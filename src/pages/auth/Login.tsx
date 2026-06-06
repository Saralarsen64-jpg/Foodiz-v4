import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get("role") || "client";
  const [showPwd, setShowPwd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Connexion
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        toast.error("Erreur de connexion");
        setLoading(false);
        return;
      }

      // 2. Vérifier que la session est bien établie
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Session non établie");
        setLoading(false);
        return;
      }

      // 3. Récupérer le rôle depuis le profil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        console.error('Profil non trouvé:', profileError);
        toast.error("Profil utilisateur non trouvé");
        setLoading(false);
        return;
      }

      // 4. Rediriger selon le rôle
      const userRole = profile.role || 'client';
      if (userRole === 'admin') navigate('/admin');
      else if (userRole === 'partner') navigate('/partner');
      else if (userRole === 'courier') navigate('/courier');
      else navigate('/client');

    } catch (err: any) {
      console.error('Erreur login:', err);
      toast.error(err.message || "Erreur lors de la connexion");
      setLoading(false);
    }
  };

  const roleLabel = role === "partner" ? "Espace partenaire" : role === "courier" ? "Espace livreur" : "Espace client";

  return (
    <div className="min-h-screen bg-foodiz-black flex flex-col">
      <div className="relative bg-gradient-to-b from-foodiz-kraft/15 to-transparent pt-6 pb-4 px-6">
        <button onClick={() => navigate("/auth")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
          <ChevronLeft size={18} /> Retour
        </button>
        <div className="flex flex-col items-center">
          <img src="https://i.imgur.com/gtCArFr.png" alt="Foodiz" className="w-48 h-auto" />
          <p className="text-foodiz-gray text-[10px] mt-3 tracking-widest uppercase">{roleLabel}</p>
        </div>
      </div>

      <main className="flex-1 max-w-md mx-auto w-full px-6 py-8">
        <h1 className="foodiz-title text-2xl text-center mb-2">Connexion</h1>
        <p className="text-foodiz-gray text-sm text-center mb-8">Heureux de vous revoir</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="foodiz-card p-4">
            <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">E-mail</label>
            <div className="flex items-center gap-3 mt-2">
              <GoldIcon icon={Mail} size={16} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="vous@email.com" className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none placeholder-foodiz-gray/40" required />
            </div>
          </div>

          <div className="foodiz-card p-4">
            <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Mot de passe</label>
            <div className="flex items-center gap-3 mt-2">
              <GoldIcon icon={Lock} size={16} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPwd ? "text" : "password"} placeholder="••••••••" className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none placeholder-foodiz-gray/40" required />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-foodiz-gold/50 hover:text-foodiz-gold">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="button" className="text-foodiz-gold text-xs font-medium block ml-auto">Mot de passe oublié ?</button>

          <button type="submit" disabled={loading} className="w-full foodiz-btn !py-4">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="text-center mt-8">
          <p className="text-foodiz-gray text-xs">
            Pas encore de compte ? <button onClick={() => navigate(`/auth/signup?role=${role}`)} className="text-foodiz-gold font-semibold hover:underline">S'inscrire</button>
          </p>
        </div>
      </main>
    </div>
  );
}