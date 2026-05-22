import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import Logo from "../../components/Logo";

// LE CODE MAÎTRE SECRET (Tu pourras le changer plus tard)
const MASTER_ADMIN_CODE = "04052021"; 

export default function AdminSecureAccess() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth/login?role=admin"); // Redirige vers le login normal si pas connecté
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_approved')
        .eq('id', session.user.id)
        .single();

      if (!profile || profile.role !== 'admin' || !profile.is_approved) {
        navigate("/client"); // Si pas admin, va sur l'accueil client
        return;
      }

      setUserRole(profile.role);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === MASTER_ADMIN_CODE) {
      // On enregistre la session sécurisée
      sessionStorage.setItem('foodiz_admin_verified', 'true');
      navigate("/admin");
    } else {
      setError("Code maître incorrect. Accès refusé.");
    }
  };

  if (loading) return <div className="min-h-screen bg-foodiz-black flex items-center justify-center text-foodiz-gold">Vérification des identifiants...</div>;

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Effet de fond discret */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-foodiz-gold to-transparent opacity-50" />
      
      <div className="w-full max-w-md foodiz-card p-8 border border-foodiz-gold/30 shadow-[0_0_50px_rgba(216,168,79,0.1)] relative z-10">
        <div className="flex justify-center mb-6">
          <div className="p-3 rounded-full bg-foodiz-gold/10 border border-foodiz-gold/20">
            <ShieldAlert size={32} className="text-foodiz-gold" />
          </div>
        </div>
        
        <h1 className="foodiz-title text-2xl text-center mb-2 text-foodiz-cream">Accès Restreint</h1>
        <p className="text-center text-foodiz-gray text-xs uppercase tracking-widest mb-8">
          Zone Administrative Sécurisée Foodiz
        </p>

        {error && (
          <div className="p-3 rounded-lg text-sm mb-6 bg-foodiz-red/10 text-foodiz-red border border-foodiz-red/20 flex items-center justify-center gap-2">
            <Lock size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider mb-2 block text-center">
              Entrez le Code Maître
            </label>
            <div className="flex items-center gap-3 px-4 py-4 rounded-xl border border-foodiz-gold/30 bg-foodiz-black focus-within:border-foodiz-gold transition-all">
              <Lock size={18} className="text-foodiz-gold" />
              <input 
                type="password" 
                required 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                className="flex-1 bg-transparent text-foodiz-cream outline-none text-center text-lg tracking-[0.2em] font-mono" 
                placeholder="••••••••" 
                autoFocus
              />
            </div>
          </div>

          <button type="submit" className="w-full foodiz-btn py-4 text-base font-bold flex justify-center items-center gap-2 group">
            <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" /> 
            Valider l'Accès
          </button>
        </form>
        
        <p className="text-center text-[10px] text-foodiz-gray/50 mt-8">
          Toute tentative d'intrusion non autorisée est enregistrée et poursuivie.
        </p>
      </div>
    </div>
  );
}