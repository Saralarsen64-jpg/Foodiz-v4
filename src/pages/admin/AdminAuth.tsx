import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Mail, Lock, ShieldAlert, ShieldCheck } from "lucide-react";

const ADMIN_EMAIL = "adminfoodiz@gmail.com";

export default function AdminAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === ADMIN_EMAIL) {
        navigate("/admin");
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (email !== ADMIN_EMAIL) {
      setError("Accès strictement réservé. Cette tentative a été enregistrée.");
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Identifiants incorrects.");
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_approved')
        .eq('id', data.user.id)
        .single();

      if (profile?.role === 'admin' && profile?.is_approved) {
        navigate("/admin");
      } else {
        setError("Compte non autorisé ou en attente de validation.");
        await supabase.auth.signOut();
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-foodiz-gold to-transparent opacity-80" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-foodiz-gold to-transparent opacity-80" />
      
      <div className="w-full max-w-md foodiz-card p-10 border border-foodiz-gold/40 shadow-[0_0_100px_rgba(216,168,79,0.15)] rounded-2xl relative z-10">
        <div className="flex justify-center mb-8">
          <div className="p-4 rounded-full bg-foodiz-gold/10 border border-foodiz-gold/30">
            <ShieldCheck size={48} className="text-foodiz-gold" />
          </div>
        </div>
        
        <h1 className="foodiz-title text-3xl text-foodiz-gold text-center mb-2 tracking-wide">Foodiz Admin</h1>
        <p className="text-center text-foodiz-gray text-[10px] uppercase tracking-[0.3em] mb-10">
          Portail de Gestion Sécurisé
        </p>
        
        {error && (
          <div className="p-4 rounded-xl text-sm mb-6 bg-foodiz-red/10 text-foodiz-red border border-foodiz-red/20 flex items-center gap-3">
            <ShieldAlert size={18} className="shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider ml-1">Identifiant Administrateur</label>
            <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-foodiz-gold/30 bg-foodiz-black focus-within:border-foodiz-gold transition-all">
              <Mail size={20} className="text-foodiz-gold" />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm font-mono tracking-wide" 
                placeholder="admin@foodiz.co" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider ml-1">Clé d'Accès</label>
            <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-foodiz-gold/30 bg-foodiz-black focus-within:border-foodiz-gold transition-all">
              <Lock size={20} className="text-foodiz-gold" />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm font-mono tracking-[0.2em]" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full foodiz-btn py-4 rounded-xl mt-4 disabled:opacity-50 flex justify-center items-center gap-2 text-sm uppercase tracking-widest"
          >
            {loading ? "Vérification des privilèges..." : "Accéder au Dashboard"}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-[10px] text-foodiz-gray/50">
            Toute tentative d'intrusion non autorisée est enregistrée et poursuivie.
          </p>
        </div>
      </div>
    </div>
  );
}
