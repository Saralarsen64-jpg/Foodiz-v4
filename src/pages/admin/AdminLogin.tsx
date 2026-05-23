import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Mail, Lock, AlertCircle, ShieldCheck } from "lucide-react";

const ALLOWED_ADMIN_EMAIL = "adminfoodiz@gmail.com";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkSession = async () => {
       const { data: { session } } = await supabase.auth.getSession();
       if (session?.user?.email === ALLOWED_ADMIN_EMAIL) {
           navigate("/admin");
       }
    }
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Vérification stricte de l'email avant même d'essayer de se connecter
    if (email !== ALLOWED_ADMIN_EMAIL) {
        setError("Accès strictement réservé. Cette tentative a été enregistrée.");
        setLoading(false);
        return;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("Identifiants incorrects.");
      setLoading(false);
      return;
    }

    if (data.user && data.user.email === ALLOWED_ADMIN_EMAIL) {
      navigate("/admin");
    } else {
      setError("Vous n'êtes pas autorisé à accéder à ce portail.");
      await supabase.auth.signOut();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111111] p-8 border border-[#D8A84F]/30 shadow-2xl rounded-2xl">
        <div className="flex justify-center mb-6">
          <div className="p-3 rounded-full bg-[#D8A84F]/10 border border-[#D8A84F]/20">
            <ShieldCheck size={32} className="text-[#D8A84F]" />
          </div>
        </div>
        <h1 className="text-2xl font-serif italic text-[#D8A84F] text-center mb-2">Foodiz Admin</h1>
        <p className="text-center text-gray-500 text-xs uppercase tracking-widest mb-8">Portail de gestion ultra-sécurisé</p>
        
        {error && (
          <div className="p-3 rounded-lg text-sm mb-6 bg-red-900/20 text-red-400 border border-red-500/20 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#D8A84F]/30 bg-black focus-within:border-[#D8A84F] transition-colors">
            <Mail size={18} className="text-[#D8A84F]" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-transparent text-white outline-none text-sm" placeholder="admin@foodiz.co" />
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#D8A84F]/30 bg-black focus-within:border-[#D8A84F] transition-colors">
            <Lock size={18} className="text-[#D8A84F]" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 bg-transparent text-white outline-none text-sm" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-[#D8A84F] text-black font-bold py-4 rounded-xl hover:bg-[#c49642] transition-colors mt-4 disabled:opacity-50">
            {loading ? "Vérification..." : "Accéder au Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
