import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Mail, Lock, User, Phone, Building2, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import Logo from "../../components/Logo";

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "client";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Champs Pros
  const [siret, setSiret] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [holderName, setHolderName] = useState("");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role,
          full_name: fullName,
          phone: phone,
          siret: siret,
        },
      },
    });

    if (error) {
      setStatus({ type: 'error', msg: error.message });
      setLoading(false);
      return;
    }

    // Si l'inscription réussit et que c'est un pro, on enregistre l'IBAN immédiatement
    if (data.user && (role === 'partner' || role === 'courier')) {
      const { error: bankError } = await supabase.from('bank_accounts').insert({
        user_id: data.user.id,
        iban: iban.toUpperCase(),
        bic: bic.toUpperCase(),
        holder_name: holderName
      });

      if (bankError) {
        setStatus({ type: 'error', msg: "Compte créé mais erreur IBAN. Contactez le support." });
        setLoading(false);
        return;
      }
    }

    setStatus({ type: 'success', msg: "Compte créé avec succès ! Redirection..." });
    setTimeout(() => {
      if (role === 'partner') navigate("/partner");
      else if (role === 'courier') navigate("/courier");
      else navigate("/client");
    }, 1500);
    
    setLoading(false);
  };

  const isPro = role === 'partner' || role === 'courier';

  return (
    <div className="min-h-screen bg-foodiz-black flex items-center justify-center p-4">
      <div className="w-full max-w-md foodiz-card p-8 border border-foodiz-gold/20 shadow-2xl">
        <div className="flex justify-center mb-6"><Logo size="md" /></div>
        <h1 className="foodiz-title text-2xl text-center mb-2 text-foodiz-cream">
          Inscription {isPro ? (role === 'partner' ? 'Partenaire' : 'Livreur') : 'Client'}
        </h1>
        <p className="text-center text-foodiz-gray text-sm mb-6">
          Rejoignez l'écosystème Foodiz
        </p>

        {status && (
          <div className={`p-4 rounded-xl text-sm mb-6 flex items-start gap-3 border ${
            status.type === 'error' ? 'bg-foodiz-red/5 text-foodiz-red border-foodiz-red/20' : 'bg-foodiz-green/5 text-foodiz-green border-foodiz-green/20'
          }`}>
            {status.type === 'error' ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <CheckCircle size={18} className="shrink-0 mt-0.5" />}
            <span>{status.msg}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Infos de base */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
            <User size={18} className="text-foodiz-gold" />
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Nom complet / Raison sociale" />
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
            <Mail size={18} className="text-foodiz-gold" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Adresse email" />
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
            <Phone size={18} className="text-foodiz-gold" />
            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Téléphone" />
          </div>

          {/* Champs Pros Obligatoires */}
          {isPro && (
            <>
              <div className="pt-2 pb-1">
                <p className="text-[10px] uppercase font-bold text-foodiz-gold tracking-wider">Informations Légales & Bancaires</p>
              </div>
              
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
                <Building2 size={18} className="text-foodiz-gold" />
                <input type="text" required value={siret} onChange={(e) => setSiret(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm font-mono" placeholder="Numéro SIRET (14 chiffres)" />
              </div>

              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
                <User size={18} className="text-foodiz-gold" />
                <input type="text" required value={holderName} onChange={(e) => setHolderName(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Titulaire du compte bancaire" />
              </div>

              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
                <CreditCard size={18} className="text-foodiz-gold" />
                <input type="text" required value={iban} onChange={(e) => setIban(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm font-mono uppercase tracking-widest" placeholder="IBAN (FR76...)" />
              </div>

              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
                <CreditCard size={18} className="text-foodiz-gold" />
                <input type="text" required value={bic} onChange={(e) => setBic(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm font-mono uppercase" placeholder="Code BIC/SWIFT" />
              </div>
            </>
          )}

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-foodiz-gold/30 bg-foodiz-black">
            <Lock size={18} className="text-foodiz-gold" />
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream outline-none text-sm" placeholder="Mot de passe (min. 6 caractères)" />
          </div>

          <button type="submit" disabled={loading} className="w-full foodiz-btn py-4 mt-4 text-base font-bold disabled:opacity-50">
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