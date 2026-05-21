import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Mail, Lock, User, Phone, Eye, EyeOff, Check } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function SignupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = (params.get("role") || "client") as "client" | "partner" | "courier";
  const [showPwd, setShowPwd] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) return;
    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/auth/login?role=${role}`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            role,
            first_name: firstName,
            last_name: lastName,
            phone,
            referral_code: referralCode || null,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Impossible de créer le compte.");

      // Le profil et les demandes partner/courier sont créés par trigger SQL côté Supabase.
      toast.success("Compte créé. Vérifiez votre boîte mail pour confirmer votre inscription.");
      navigate(`/auth/login?role=${role}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = role === "partner" ? "Inscription partenaire" : role === "courier" ? "Inscription livreur" : "Créer un compte client";
  const ctaLabel = role === "partner" ? "Devenir partenaire" : role === "courier" ? "Devenir livreur" : "Créer mon compte";

  return (
    <div className="min-h-screen bg-foodiz-black flex flex-col">
      <div className="relative bg-gradient-to-b from-foodiz-kraft/15 to-transparent pt-6 pb-4 px-6">
        <button onClick={() => navigate("/auth")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
          <ChevronLeft size={18} /> Retour
        </button>
        <div className="flex flex-col items-center">
          <img src="https://i.imgur.com/gtCArFr.png" alt="Foodiz" className="w-48 h-auto" />
          <p className="text-foodiz-gray text-[10px] mt-3 tracking-widest uppercase">{roleLabel}</p>
        </div>
      </div>

      <main className="flex-1 max-w-md mx-auto w-full px-6 py-8">
        <h1 className="foodiz-title text-2xl text-center mb-2">Inscription</h1>
        <p className="text-foodiz-gray text-sm text-center mb-8">Rejoignez la communauté Foodiz</p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="foodiz-card p-4">
              <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Prénom</label>
              <div className="flex items-center gap-2 mt-2">
                <GoldIcon icon={User} size={14} />
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} type="text" placeholder="Jean" required className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none placeholder-foodiz-gray/40 min-w-0" />
              </div>
            </div>
            <div className="foodiz-card p-4">
              <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Nom</label>
              <div className="flex items-center gap-2 mt-2">
                <GoldIcon icon={User} size={14} />
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} type="text" placeholder="Dupont" required className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none placeholder-foodiz-gray/40 min-w-0" />
              </div>
            </div>
          </div>

          <div className="foodiz-card p-4">
            <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">E-mail</label>
            <div className="flex items-center gap-3 mt-2">
              <GoldIcon icon={Mail} size={16} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="vous@email.com" required className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none placeholder-foodiz-gray/40" />
            </div>
          </div>

          <div className="foodiz-card p-4">
            <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Téléphone</label>
            <div className="flex items-center gap-3 mt-2">
              <GoldIcon icon={Phone} size={16} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+33 6 12 34 56 78" required className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none placeholder-foodiz-gray/40" />
            </div>
          </div>

          <div className="foodiz-card p-4">
            <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Mot de passe</label>
            <div className="flex items-center gap-3 mt-2">
              <GoldIcon icon={Lock} size={16} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPwd ? "text" : "password"} placeholder="••••••••" required minLength={8} className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none placeholder-foodiz-gray/40" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-foodiz-gold/50 hover:text-foodiz-gold">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {role === "client" && (
            <div className="foodiz-card p-4 bg-foodiz-gradient-gold border-foodiz-gold/20">
              <p className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest mb-1">Code parrainage (optionnel)</p>
              <input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} type="text" placeholder="Ex: ALEX123" className="w-full bg-transparent text-foodiz-cream text-sm outline-none placeholder-foodiz-gray/40 mt-1" />
              <p className="text-[10px] text-foodiz-gold/60 mt-1">+500 points Foodiz à votre parrain</p>
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer py-2">
            <button type="button" onClick={() => setAccepted(!accepted)} className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${accepted ? "bg-foodiz-gold border-foodiz-gold" : "border-foodiz-gold/30"}`}>
              {accepted && <Check size={12} className="text-foodiz-black" strokeWidth={3} />}
            </button>
            <span className="text-[11px] text-foodiz-gray leading-relaxed">
              J'accepte les <span className="text-foodiz-gold">conditions générales</span> et la <span className="text-foodiz-gold">politique de confidentialité</span> de Foodiz.
            </span>
          </label>

          <button type="submit" disabled={!accepted || loading} className={`w-full !py-4 rounded-xl text-sm font-semibold transition-all ${accepted && !loading ? "foodiz-btn" : "bg-foodiz-gold/20 text-foodiz-gold/50 cursor-not-allowed"}`}>
            {loading ? "Création en cours..." : ctaLabel}
          </button>
        </form>

        {(role === "partner" || role === "courier") && (
          <p className="text-center text-[10px] text-foodiz-gray mt-4">
            Après confirmation email, votre dossier sera soumis à validation admin.
          </p>
        )}

        <div className="text-center mt-6">
          <p className="text-foodiz-gray text-xs">
            Déjà un compte ? <button onClick={() => navigate(`/auth/login?role=${role}`)} className="text-foodiz-gold font-semibold hover:underline">Se connecter</button>
          </p>
        </div>
      </main>
    </div>
  );
}
