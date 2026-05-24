import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getCurrentUserProfile } from "../utils/authProfile";
import toast from "react-hot-toast";

const ADMIN_EMAIL = "adminfoodiz@gmail.com";

export default function AdminAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
        throw new Error("Accès refusé. Cette page est réservée à l’administration Foodiz.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { profile } = await getCurrentUserProfile();

      if (!profile || profile.email?.toLowerCase() !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        throw new Error("Compte admin non reconnu.");
      }

      if (profile.role !== "admin") {
        await supabase.from("profiles").update({ role: "admin", status: "active" }).eq("id", profile.id);
      }

      toast.success("Connexion admin validée.");
      navigate("/admin");
    } catch (err: any) {
      toast.error(err.message || "Connexion admin impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black flex items-center justify-center px-6">
      <div className="w-full max-w-md foodiz-card p-8 bg-[linear-gradient(145deg,rgba(216,168,79,0.06),rgba(17,17,17,0.96)_28%,rgba(5,5,5,1)_100%)] border-foodiz-gold/20 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-foodiz-gold/10 border border-foodiz-gold/15 flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-foodiz-gold" />
          </div>
          <h1 className="foodiz-title text-2xl">Admin Foodiz</h1>
          <p className="text-foodiz-gray text-xs mt-2">Accès administration sécurisé</p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="foodiz-card p-4 bg-white/[0.02]">
            <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Adresse admin</label>
            <div className="flex items-center gap-3 mt-2">
              <Mail size={16} className="text-foodiz-gold" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none"
                required
              />
            </div>
          </div>

          <div className="foodiz-card p-4 bg-white/[0.02]">
            <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Mot de passe</label>
            <div className="flex items-center gap-3 mt-2">
              <Lock size={16} className="text-foodiz-gold" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-foodiz-gold/50 hover:text-foodiz-gold">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full foodiz-btn !py-4 text-sm font-semibold">
            {loading ? "Vérification..." : "Accéder au dashboard admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
