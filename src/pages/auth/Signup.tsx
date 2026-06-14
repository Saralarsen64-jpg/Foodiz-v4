import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Mail, Lock, User, Phone, MapPin, Hash, Briefcase, AlertCircle, CheckCircle } from "lucide-react";
import Logo from "../../components/Logo";

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "client";
  const refCode = searchParams.get("ref");
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [siret, setSiret] = useState("");
  const [cguAccepted, setCguAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const isPartner = role === 'partner';

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cguAccepted) {
      setStatus({ type: 'error', msg: "Vous devez accepter les conditions générales d'utilisation." });
      return;
    }
    setLoading(true);
    setStatus(null);

    try {
      // 1. Créer l'utilisateur Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role,
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim(),
            phone,
            address,
            postal_code: postalCode,
            city,
            siret: role === "partner" ? siret : null,
            business_name: role === "partner" ? `${firstName} ${lastName}`.trim() : null,
            ref_code: role === "client" ? refCode : null,
            cgu_accepted: cguAccepted,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Erreur lors de la création du compte");
      }

      setLoading(false);
      setStatus({ type: 'success', msg: "Un email de confirmation vous a été envoyé. Veuillez vérifier votre boîte mail (et vos spams)." });
      
      // Redirection après 3 secondes
      setTimeout(() => navigate('/auth'), 3000);

    } catch (err: any) {
      setLoading(false);
      console.error("ERREUR INSCRIPTION:", err);
      setStatus({ type: 'error', msg: err.message || "Erreur lors de l'inscription" });
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black flex items-center justify-center p-4">
      <div className="w-full max-w-md foodiz-card p-8 border border-foodiz-gold/20 shadow-2xl">
        <div className="flex justify-center mb-6"><Logo size="md" /></div>
        <h1 className="foodiz-title text-2xl text-center mb-2 text-foodiz-cream">
          Inscription {role === 'partner' ? 'Partenaire' : role === 'courier' ? 'Livreur' : 'Client'}
        </h1>
        {refCode && <p className="text-center text-foodiz-gold text-xs mb-4">Code parrain détecté : +500 pts offerts !</p>}
        <p className="text-center text-foodiz-gray text-sm mb-6">Rejoignez l'écosystème Foodiz</p>

        {status && (
          <div className={`p-4 rounded-xl text-sm mb-6 flex items-start gap-3 border ${status.type === 'error' ? 'bg-foodiz-red/5 text-foodiz-red border-foodiz-red/20' : 'bg-foodiz-green/5 text-foodiz-green border-foodiz-green/20'}`}>
            {status.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span>{status.msg}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
              <User size={16} className="text-foodiz-gold" />
              <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Prénom" />
            </div>
            <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
              <User size={16} className="text-foodiz-gold" />
              <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Nom" />
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
            <Mail size={18} className="text-foodiz-gold" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Adresse email" />
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
            <Phone size={18} className="text-foodiz-gold" />
            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Téléphone" />
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
            <MapPin size={18} className="text-foodiz-gold" />
            <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Adresse postale" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
              <Hash size={16} className="text-foodiz-gold" />
              <input type="text" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Code Postal" />
            </div>
            <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
              <MapPin size={16} className="text-foodiz-gold" />
              <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Ville" />
            </div>
          </div>

          {isPartner && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
              <Briefcase size={18} className="text-foodiz-gold" />
              <input type="text" required value={siret} onChange={(e) => setSiret(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Numéro SIRET" />
            </div>
          )}

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
            <Lock size={18} className="text-foodiz-gold" />
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Mot de passe" />
          </div>

          <div className="flex items-start gap-3 px-2">
            <input type="checkbox" required checked={cguAccepted} onChange={(e) => setCguAccepted(e.target.checked)} className="mt-1 w-4 h-4 rounded border-foodiz-gold/30 bg-foodiz-black text-foodiz-gold focus:ring-foodiz-gold" />
            <p className="text-[10px] text-foodiz-gray leading-relaxed">J'accepte les <span className="text-foodiz-gold underline">Conditions Générales d'Utilisation</span>.</p>
          </div>

          <button type="submit" disabled={loading} className="w-full foodiz-btn py-4 mt-2 text-base font-bold disabled:opacity-50">
            {loading ? "Création en cours..." : "Créer mon compte"}
          </button>
        </form>
        
        <p className="text-center text-xs text-foodiz-gray mt-6">
          Déjà un compte ? <button onClick={() => navigate(`/auth/login?role=${role}`)} className="text-foodiz-gold font-bold hover:underline">Se connecter</button>
        </p>
      </div>
    </div>
  );
}
