import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Mail, Lock, User, Phone } from "lucide-react";

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "client";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role,
          full_name: fullName,
          phone: phone,
        },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
    } else if (data.session) {
      // Si la confirmation email est désactivée, l'utilisateur est directement connecté
      setMessage("Compte créé avec succès ! Redirection...");
      setTimeout(() => {
        // Redirection selon le rôle
        if (role === 'partner') navigate("/partner");
        else if (role === 'courier') navigate("/courier");
        else if (role === 'admin') navigate("/admin");
        else navigate("/client");
      }, 1500);
    } else {
      setMessage("Un lien de confirmation a été envoyé à votre adresse email.");
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black flex items-center justify-center p-4">
      <div className="w-full max-w-md foodiz-card p-8 border border-foodiz-gold/20">
        <h1 className="foodiz-title text-2xl text-center mb-2 text-foodiz-cream">
          Créer un compte {role === 'partner' ? 'Partenaire' : role === 'courier' ? 'Livreur' : 'Client'}
        </h1>
        <p className="text-center text-foodiz-gray text-sm mb-6">
          Rejoignez l'aventure Foodiz
        </p>

        {message && (
          <div className={`p-3 rounded-lg text-sm mb-4 ${message.includes("succès") ? "bg-foodiz-green/10 text-foodiz-green" : "bg-foodiz-red/10 text-foodiz-red"}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-foodiz-gray uppercase font-bold">Nom complet</label>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
              <User size={18} className="text-foodiz-gold" />
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Jean Dupont" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-foodiz-gray uppercase font-bold">Email</label>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
              <Mail size={18} className="text-foodiz-gold" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="jean@exemple.com" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-foodiz-gray uppercase font-bold">Téléphone</label>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
              <Phone size={18} className="text-foodiz-gold" />
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="06 12 34 56 78" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-foodiz-gray uppercase font-bold">Mot de passe (min. 6 caractères)</label>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
              <Lock size={18} className="text-foodiz-gold" />
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full foodiz-btn py-4 mt-4 text-base font-bold">
            {loading ? "Création en cours..." : "S'inscrire"}
          </button>
        </form>

        <p className="text-center text-sm text-foodiz-gray mt-6">
          Déjà un compte ? <button onClick={() => navigate("/auth/login")} className="text-foodiz-gold font-bold hover:underline">Se connecter</button>
        </p>
      </div>
    </div>
  );
}