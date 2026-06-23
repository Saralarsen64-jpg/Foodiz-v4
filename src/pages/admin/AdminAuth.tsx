import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Mail, Lock, ShieldAlert } from "lucide-react";
import { clearAdminAccess, grantAdminAccess } from "../../utils/adminAccess";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Visiting the dedicated portal always requires a fresh admin password.
    clearAdminAccess();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authError) {
      setError("Identifiants incorrects.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,status")
      .eq("id", data.user.id)
      .single();
    
    if (!profileError && profile?.role === "admin" && profile.status !== "suspended") {
      grantAdminAccess(data.user.id);
      navigate("/admin", { replace: true });
    } else {
      clearAdminAccess();
      await supabase.auth.signOut();
      setError("Accès refusé. Cette zone est strictement réservée aux administrateurs Foodiz.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-foodiz-black flex items-center justify-center p-4">
      <div className="w-full max-w-md foodiz-card p-8 border border-foodiz-red/20 shadow-2xl bg-[#0A0A0A]">
        <div className="flex justify-center mb-6 text-foodiz-red"><ShieldAlert size={48} /></div>
        <h1 className="foodiz-title text-2xl text-center mb-2 text-foodiz-cream">Portail Administrateur</h1>
        <p className="text-center text-foodiz-gray text-xs mb-6 uppercase tracking-widest">Accès strictement réservé</p>

        {error && <div className="p-3 rounded-lg bg-foodiz-red/10 text-foodiz-red border border-foodiz-red/20 text-xs mb-4 text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
            <Mail size={18} className="text-foodiz-gold" />
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" 
              placeholder="Email administrateur" 
              autoComplete="username"
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
            <Lock size={18} className="text-foodiz-gold" />
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" 
              placeholder="Mot de passe" 
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-foodiz-red text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50">
            {loading ? "Vérification..." : "Accéder au Dashboard"}
          </button>
        </form>
        <p className="mt-5 text-center text-[10px] leading-relaxed text-foodiz-gray">
          L’accès expire automatiquement après 30 minutes et reste limité à cet onglet.
        </p>
      </div>
    </div>
  );
}
