import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "client";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Vérifier le statut d'approbation dans la table profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_approved')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        setError("Erreur de profil. Contactez le support.");
      } else if (!profile.is_approved) {
        setError("Votre compte est en attente de validation par l'administrateur Foodiz.");
        await supabase.auth.signOut(); // Déconnecter si pas approuvé
      } else {
        // Connexion réussie et approuvée, redirection selon le rôle
        if (profile.role === 'partner') navigate("/partner");
        else if (profile.role === 'courier') navigate("/courier");
        else if (profile.role === 'admin') navigate("/admin");
        else navigate("/client");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-foodiz-black flex items-center justify-center p-4">
      <div className="w-full max-w-md foodiz-card p-8 border border-foodiz-gold/20">
        <h1 className="foodiz-title text-2xl text-center mb-2 text-foodiz-cream">
          Connexion {role === 'partner' ? 'Partenaire' : role === 'courier' ? 'Livreur' : 'Client'}
        </h1>
        
        {error && (
          <div className="p-3 rounded-lg text-sm mb-4 bg-foodiz-red/10 text-foodiz-red border border-foodiz-red/20">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 mt-6">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
            <Mail size={18} className="text-foodiz-gold" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Adresse email" />
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
            <Lock size={18} className="text-foodiz-gold" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Mot de passe" />
          </div>

          <button type="submit" disabled={loading} className="w-full foodiz-btn py-4 mt-4 text-base font-bold">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}