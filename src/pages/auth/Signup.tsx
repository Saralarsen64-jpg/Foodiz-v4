import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Mail, Lock, User, Phone, MapPin, Hash, Briefcase, AlertCircle, CheckCircle } from "lucide-react";
import { normalizePublicSignupRole } from "../../utils/authRoles";
import WaitlistPage from "../prelaunch/Waitlist";

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = normalizePublicSignupRole(searchParams.get("role"));
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

  if (role === "partner" || role === "courier") {
    return (
      <WaitlistPage
        registrationRole={role === "partner" ? "partenaire" : "livreur"}
      />
    );
  }

  return (
    <div className="min-h-screen bg-weello-black flex items-center justify-center p-4">
      <div className="w-full max-w-md weello-card p-8 border border-weello-gold/20 shadow-2xl">
        <div className="flex justify-center mb-6">
          <img src="/images/weello-wordmark.png" alt="Weello" className="w-64 max-w-full h-auto rounded-2xl" />
        </div>
        <h1 className="weello-title text-2xl text-center mb-2 text-weello-cream">
          Inscription Client
        </h1>
        {refCode && <p className="text-center text-weello-gold text-xs mb-4">Code parrain détecté : +500 pts offerts !</p>}
        <p className="text-center text-weello-gray text-sm mb-6">Rejoignez l'écosystème Weello</p>

        {status && (
          <div className={`p-4 rounded-xl text-sm mb-6 flex items-start gap-3 border ${status.type === 'error' ? 'bg-weello-red/5 text-weello-red border-weello-red/20' : 'bg-weello-green/5 text-weello-green border-weello-green/20'}`}>
            {status.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span>{status.msg}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-weello-gold/30 bg-weello-black">
              <User size={16} className="text-weello-gold" />
              <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="flex-1 bg-transparent text-weello-cream outline-none text-sm" placeholder="Prénom" />
            </div>
            <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-weello-gold/30 bg-weello-black">
              <User size={16} className="text-weello-gold" />
              <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="flex-1 bg-transparent text-weello-cream outline-none text-sm" placeholder="Nom" />
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-weello-gold/30 bg-weello-black">
            <Mail size={18} className="text-weello-gold" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-transparent text-weello-cream outline-none text-sm" placeholder="Adresse email" />
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-weello-gold/30 bg-weello-black">
            <Phone size={18} className="text-weello-gold" />
            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 bg-transparent text-weello-cream outline-none text-sm" placeholder="Téléphone" />
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-weello-gold/30 bg-weello-black">
            <MapPin size={18} className="text-weello-gold" />
            <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className="flex-1 bg-transparent text-weello-cream outline-none text-sm" placeholder="Adresse postale" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-weello-gold/30 bg-weello-black">
              <Hash size={16} className="text-weello-gold" />
              <input type="text" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="flex-1 bg-transparent text-weello-cream outline-none text-sm" placeholder="Code Postal" />
            </div>
            <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-weello-gold/30 bg-weello-black">
              <MapPin size={16} className="text-weello-gold" />
              <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} className="flex-1 bg-transparent text-weello-cream outline-none text-sm" placeholder="Ville" />
            </div>
          </div>

          {isPartner && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-weello-gold/30 bg-weello-black">
              <Briefcase size={18} className="text-weello-gold" />
              <input type="text" required value={siret} onChange={(e) => setSiret(e.target.value)} className="flex-1 bg-transparent text-weello-cream outline-none text-sm" placeholder="Numéro SIRET" />
            </div>
          )}

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-weello-gold/30 bg-weello-black">
            <Lock size={18} className="text-weello-gold" />
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 bg-transparent text-weello-cream outline-none text-sm" placeholder="Mot de passe" />
          </div>

          <div className="flex items-start gap-3 px-2">
            <input type="checkbox" required checked={cguAccepted} onChange={(e) => setCguAccepted(e.target.checked)} className="mt-1 w-4 h-4 rounded border-weello-gold/30 bg-weello-black text-weello-gold focus:ring-weello-gold" />
            <p className="text-[10px] text-weello-gray leading-relaxed">
              J'accepte les{" "}
              <Link to="/cgu" className="text-weello-gold underline">Conditions Générales d'Utilisation</Link>
              {" "}et la{" "}
              <Link to="/confidentialite" className="text-weello-gold underline">politique de confidentialité</Link>.
            </p>
          </div>

          <button type="submit" disabled={loading} className="w-full weello-btn py-4 mt-2 text-base font-bold disabled:opacity-50">
            {loading ? "Création en cours..." : "Créer mon compte"}
          </button>
        </form>
        
        <p className="text-center text-xs text-weello-gray mt-6">
          Déjà un compte ? <button onClick={() => navigate(`/auth/login?role=${role}`)} className="text-weello-gold font-bold hover:underline">Se connecter</button>
        </p>
        <nav className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] text-weello-gray">
          <Link to="/mentions-legales" className="hover:text-weello-gold">Mentions légales</Link>
          <Link to="/cgv" className="hover:text-weello-gold">CGV</Link>
          <Link to="/cookies" className="hover:text-weello-gold">Cookies</Link>
        </nav>
      </div>
    </div>
  );
}
