import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Mail, Lock, AlertCircle, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "client";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success', msg: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new Error("Email ou mot de passe incorrect.");

      if (data.user) {
        setStatus({ type: 'success', msg: "Connexion réussie, chargement du profil..." });
        
        // Petit délai pour l'UX
        await new Promise(r => setTimeout(r, 800));

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_approved, full_name')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          throw new Error("Profil introuvable. Veuillez contacter le support.");
        } 
        
        if (!profile.is_approved) {
          setStatus({ type: 'error', msg: `Bonjour ${profile.full_name}, votre compte est en attente de validation par l'administrateur.` });
          await supabase.auth.signOut();
        } else {
          // Redirection selon le rôle réel dans la base de données
          if (profile.role === 'partner') navigate("/partner");
          else if (profile.role === 'courier') navigate("/courier");
          else if (profile.role === 'admin') navigate("/admin");
          else navigate("/client");
        }
      }
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black flex items-center justify-center p-4">
      <div className="w-full max-w-md foodiz-card p-8 border border-foodiz-gold/20 shadow-2xl">
        <h1 className="foodiz-title text-2xl text-center mb-2 text-foodiz-cream">
          Heureux de vous revoir
        </h1>
        <p className="text-center text-foodiz-gray text-sm mb-6">
          Espace {role === 'partner' ? 'Partenaire' : role === 'courier' ? 'Livreur' : role === 'admin' ? 'Admin' : 'Client'}
        </p>
        
        {status && (
          <div className={`p-4 rounded-xl text-sm mb-6 flex items-start gap-3 border ${
            status.type === 'error' 
              ? 'bg-foodiz-red/5 text-foodiz-red border-foodiz-red/20' 
              : 'bg-foodiz-green/5 text-foodiz-green border-foodiz-green/20'
          }`}>
            {status.type === 'error' ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <CheckCircle size={18} className="shrink-0 mt-0.5" />}
            <span>{status.msg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider mb-1 block">Adresse Email</label>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black focus-within:border-foodiz-gold transition-colors">
              <Mail size={18} className="text-foodiz-gold" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="jean@exemple.com" />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider mb-1 block">Mot de passe</label>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black focus-within:border-foodiz-gold transition-colors">
              <Lock size={18} className="text-foodiz-gold" />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full foodiz-btn py-4 mt-4 text-base font-bold disabled:opacity-50 flex justify-center items-center gap-2">
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}