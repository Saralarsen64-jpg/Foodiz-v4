import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Store,
  Award,
  MapPin,
  ShieldCheck,
  Headphones,
  ChefHat,
  LoaderCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import { resolveRedirectPath } from "../../utils/authProfile";

export default function AuthPage() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = "Saisissez votre adresse email.";
    if (!password) nextErrors.password = "Saisissez votre mot de passe.";
    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        const message =
          error.message.toLowerCase().includes("invalid")
            ? "Adresse email ou mot de passe incorrect."
            : "Connexion momentanément indisponible. Réessayez dans quelques instants.";
        setFormError(message);
        toast.error(message);
        return;
      }

      if (data.user) navigate(await resolveRedirectPath());
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setFieldErrors((current) => ({
        ...current,
        email: "Saisissez d’abord votre adresse email.",
      }));
      return;
    }

    setResettingPassword(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/reset-password` },
    );
    setResettingPassword(false);

    if (error) {
      toast.error("Impossible d’envoyer le lien pour le moment.");
      return;
    }
    toast.success("Un lien de réinitialisation vient de vous être envoyé.");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-weello-black">
      {/* ─── Weello wordmark header ──────────────────────────────────── */}
      <div className="relative w-full overflow-hidden pb-10">
        <img
          src="/images/weello-wordmark.png"
          alt="Weello"
          className="relative left-[50vw] block h-auto w-screen max-w-none -translate-x-1/2 align-top"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-weello-black/45 to-weello-black" />
        <div className="pointer-events-none absolute inset-x-0 bottom-8 h-px bg-gradient-to-r from-transparent via-weello-gold/35 to-transparent shadow-[0_0_24px_rgba(216,168,79,.24)]" />
      </div>

      {/* ─── Main Content ─────────────────────────────────────────────── */}
      <section
        className="weello-auth-panel relative z-10 mx-4 -mt-16 max-w-[520px] overflow-hidden rounded-[34px] border border-weello-gold/40 md:mx-auto"
        style={{
          background:
            "radial-gradient(circle at top, rgba(216, 168, 79, 0.08), transparent 38%), #050505",
          boxShadow:
            "0 -1px 0 rgba(224, 180, 92, 0.35), 0 28px 90px rgba(0, 0, 0, 0.7), 0 0 48px rgba(216, 168, 79, 0.13)",
        }}
      >
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-weello-gold/70 to-transparent" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-weello-gold/10 blur-3xl" />

      <main className="relative z-10 mx-auto max-w-md px-5 pb-6 pt-8 sm:px-6">
        {/* Title */}
        <h1
          className="weello-auth-reveal text-center text-[1.75rem] leading-tight sm:text-3xl mb-4"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
        >
          <span className="text-weello-cream">Envie de vous faire </span>
          <span className="text-weello-gold italic">livrer</span>
          <span className="text-weello-cream"> ?</span>
        </h1>
        <p className="weello-auth-reveal weello-auth-delay-1 text-weello-gray text-sm text-center mb-8 leading-relaxed">
          Vos adresses préférées, vos envies du moment,
          <br />
          livrées simplement.
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="weello-auth-reveal weello-auth-delay-2 space-y-4"
          noValidate
        >
          {formError && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-2xl border border-weello-red/35 bg-weello-red/10 px-4 py-3 text-sm leading-relaxed text-weello-cream"
            >
              {formError}
            </div>
          )}
          {/* Email */}
          <div>
            <label htmlFor="weello-auth-email" className="sr-only">
              Adresse email
            </label>
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-300 hover:border-weello-gold/55 focus-within:border-weello-gold focus-within:ring-2 focus-within:ring-weello-gold/15 focus-within:shadow-[0_0_26px_rgba(216,168,79,.12)] ${fieldErrors.email ? "border-weello-red/55" : "border-weello-gold/30"}`}>
              <Mail
                size={18}
                className="text-weello-gold shrink-0"
                strokeWidth={1.8}
                aria-hidden="true"
                style={{ filter: "drop-shadow(0 0 4px rgba(216, 168, 79, 0.4))" }}
              />
              <input
                id="weello-auth-email"
                name="email"
                type="email"
                placeholder="Adresse email"
                autoComplete="email"
                inputMode="email"
                value={email}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "weello-auth-email-error" : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                  }
                  if (formError) setFormError("");
                }}
                className="min-w-0 flex-1 bg-transparent text-weello-cream text-sm outline-none placeholder-weello-gray/60"
              />
            </div>
            {fieldErrors.email && (
              <p id="weello-auth-email-error" className="mt-2 px-1 text-xs text-weello-red">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="weello-auth-password" className="sr-only">
              Mot de passe
            </label>
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-300 hover:border-weello-gold/55 focus-within:border-weello-gold focus-within:ring-2 focus-within:ring-weello-gold/15 focus-within:shadow-[0_0_26px_rgba(216,168,79,.12)] ${fieldErrors.password ? "border-weello-red/55" : "border-weello-gold/30"}`}>
              <Lock
                size={18}
                className="text-weello-gold shrink-0"
                strokeWidth={1.8}
                aria-hidden="true"
                style={{ filter: "drop-shadow(0 0 4px rgba(216, 168, 79, 0.4))" }}
              />
              <input
                id="weello-auth-password"
                name="password"
                type={showPwd ? "text" : "password"}
                placeholder="Mot de passe"
                autoComplete="current-password"
                value={password}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "weello-auth-password-error" : undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                  }
                  if (formError) setFormError("");
                }}
                className="min-w-0 flex-1 bg-transparent text-weello-cream text-sm outline-none placeholder-weello-gray/60"
              />
              <button
                type="button"
                aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                aria-pressed={showPwd}
                onClick={() => setShowPwd(!showPwd)}
                className="rounded-lg p-1.5 text-weello-gold/70 transition-colors hover:text-weello-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weello-gold/50"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="weello-auth-password-error" className="mt-2 px-1 text-xs text-weello-red">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={resettingPassword}
              onClick={() => void handleForgotPassword()}
              className="rounded px-1 py-1 text-xs font-semibold text-weello-gold transition hover:text-weello-gold-light hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weello-gold/50 disabled:cursor-wait disabled:opacity-60"
            >
              {resettingPassword ? "Envoi du lien…" : "Mot de passe oublié ?"}
            </button>
          </div>

          {/* Big Gold Button */}
          <button
            type="submit"
            disabled={loading}
            className="weello-premium-button flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weello-gold focus-visible:ring-offset-2 focus-visible:ring-offset-weello-black disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                Connexion en cours…
              </>
            ) : "Se connecter"}
          </button>
        </form>

        {/* Create account */}
        <p className="weello-auth-reveal weello-auth-delay-3 text-center text-sm text-weello-gray mt-6">
          Pas encore de compte ?{" "}
          <button
            type="button"
            onClick={() => navigate("/auth/signup?role=client")}
            className="ml-1 rounded text-weello-gold font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weello-gold/50"
          >
            Créer mon compte
          </button>
        </p>


        {/* Divider: Vous êtes professionnel ? + chef hat */}
        <div className="weello-auth-reveal weello-auth-delay-3 my-8">
          <div className="flex justify-center mb-3">
            <div className="bg-weello-black px-2">
              <ChefHat
                size={20}
                className="text-weello-gold"
                strokeWidth={1.8}
                style={{ filter: "drop-shadow(0 0 6px rgba(216, 168, 79, 0.5))" }}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-weello-gold/30" />
            <span className="text-xs text-weello-gold font-semibold tracking-wide whitespace-nowrap">
              Vous êtes professionnel ?
            </span>
            <div className="flex-1 h-px bg-weello-gold/30" />
          </div>
        </div>

        {/* Pro Cards */}
        <div className="weello-auth-reveal weello-auth-delay-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Restaurants & Épiciers Card */}
          <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-weello-gold/30 bg-weello-card transition-all duration-300 hover:-translate-y-1 hover:border-weello-gold/60 hover:shadow-[0_18px_45px_rgba(216,168,79,.13)] focus-within:border-weello-gold/70">
            <button
              type="button"
              aria-label="Créer un dossier partenaire"
              onClick={() => navigate("/auth/signup?role=partner")}
              className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-weello-gold"
            />
            <div className="pointer-events-none relative z-10 p-4 pt-5 flex flex-col items-center text-center flex-1">
              {/* Circular gold icon */}
              <div className="w-14 h-14 rounded-full border-2 border-weello-gold flex items-center justify-center mb-3"
                style={{ boxShadow: "0 0 16px rgba(216, 168, 79, 0.25), inset 0 0 10px rgba(216, 168, 79, 0.08)" }}>
                <Store
                  size={26}
                  className="text-weello-gold"
                  strokeWidth={1.5}
                  style={{ filter: "drop-shadow(0 0 4px rgba(216, 168, 79, 0.5))" }}
                />
              </div>
              <h3
                className="mb-2 flex min-h-[46px] items-center justify-center text-lg leading-tight text-weello-cream"
                style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
              >
                Restaurants<br />& Épiciers
              </h3>
              <p className="mb-4 min-h-[52px] px-1 text-[11px] leading-relaxed text-weello-gray">
                Faites découvrir vos meilleures offres aux clients de votre ville.
              </p>
              <button
                type="button"
                onClick={() => navigate("/auth/signup?role=partner")}
                className="weello-premium-button pointer-events-auto mb-2 w-full rounded-xl py-2.5 text-xs font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weello-cream"
              >
                S'inscrire
              </button>
              <button
                type="button"
                onClick={() => navigate("/auth/login?role=partner")}
                className="weello-premium-button-outline pointer-events-auto w-full rounded-xl py-2.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weello-gold/60"
              >
                Se connecter
              </button>
            </div>
            {/* Visual at bottom */}
            <div className="pointer-events-none relative z-10 h-52 overflow-hidden border-t border-weello-gold/20 bg-weello-black">
              <img src="/images/auth-restaurant.jpg" alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
              <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-weello-card/85 to-transparent" />
            </div>
          </div>

          {/* Livreurs Card */}
          <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-weello-gold/30 bg-weello-card transition-all duration-300 hover:-translate-y-1 hover:border-weello-gold/60 hover:shadow-[0_18px_45px_rgba(216,168,79,.13)] focus-within:border-weello-gold/70">
            <button
              type="button"
              aria-label="Créer un dossier livreur"
              onClick={() => navigate("/auth/signup?role=courier")}
              className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-weello-gold"
            />
            <div className="pointer-events-none relative z-10 p-4 pt-5 flex flex-col items-center text-center flex-1">
              <div className="w-14 h-14 rounded-full border-2 border-weello-gold flex items-center justify-center mb-3"
                style={{ boxShadow: "0 0 16px rgba(216, 168, 79, 0.25), inset 0 0 10px rgba(216, 168, 79, 0.08)" }}>
                {/* Scooter SVG */}
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-weello-gold"
                  style={{ filter: "drop-shadow(0 0 4px rgba(216, 168, 79, 0.5))" }}
                >
                  <circle cx="6" cy="17" r="3" />
                  <circle cx="18" cy="17" r="3" />
                  <path d="M6 17h7l2-5h-3l-1-3H8" />
                  <path d="M15 12V6h4" />
                </svg>
              </div>
              <h3
                className="mb-2 flex min-h-[46px] items-center justify-center text-lg leading-tight text-weello-cream"
                style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
              >
                Livreurs
              </h3>
              <p className="mb-4 min-h-[52px] px-1 text-[11px] leading-relaxed text-weello-gray">
                Rejoignez une expérience de livraison plus premium, plus claire, mieux pilotée.
              </p>
              <button
                type="button"
                onClick={() => navigate("/auth/signup?role=courier")}
                className="weello-premium-button pointer-events-auto mb-2 w-full rounded-xl py-2.5 text-xs font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weello-cream"
              >
                S'inscrire
              </button>
              <button
                type="button"
                onClick={() => navigate("/auth/login?role=courier")}
                className="weello-premium-button-outline pointer-events-auto w-full rounded-xl py-2.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weello-gold/60"
              >
                Se connecter
              </button>
            </div>
            {/* Visual at bottom */}
            <div className="pointer-events-none relative z-10 h-52 overflow-hidden border-t border-weello-gold/20 bg-weello-black">
              <img
                src="/images/auth-courier-weello.jpg"
                alt="Livreur Weello en scooter"
                className="h-full w-full object-cover object-[center_58%] transition duration-500 group-hover:scale-[1.025]"
              />
              <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-weello-card/85 to-transparent" />
            </div>
          </div>
        </div>

        {/* Trust Badges Row */}
        <div className="weello-auth-reveal weello-auth-delay-4 mt-10 grid grid-cols-2 gap-4 min-[420px]:grid-cols-4 min-[420px]:gap-2">
          {[
            { icon: Award, label: "Qualité\nsélectionnée" },
            { icon: MapPin, label: "Livraison\nrapide" },
            { icon: ShieldCheck, label: "Paiement\nsécurisé" },
            { icon: Headphones, label: "Support\ndisponible" },
          ].map((badge) => (
            <div key={badge.label} className="group flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full border border-weello-gold/50 flex items-center justify-center mb-2 transition-all duration-300 group-hover:border-weello-gold group-hover:bg-weello-gold/5 group-hover:shadow-[0_0_18px_rgba(216,168,79,.22)]"
                style={{ boxShadow: "0 0 10px rgba(216, 168, 79, 0.15)" }}>
                <badge.icon
                  size={18}
                  className="text-weello-gold"
                  strokeWidth={1.5}
                  aria-hidden="true"
                  style={{ filter: "drop-shadow(0 0 3px rgba(216, 168, 79, 0.4))" }}
                />
              </div>
              <p className="text-[10px] text-weello-gray leading-tight whitespace-pre-line">
                {badge.label}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-md mx-auto px-6 py-6 text-center">
        <nav
          aria-label="Informations légales"
          className="mb-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] text-weello-gray/70"
        >
          <Link to="/cgu" className="rounded hover:text-weello-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weello-gold/50">CGU</Link>
          <Link to="/cgv" className="rounded hover:text-weello-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weello-gold/50">CGV</Link>
          <Link to="/confidentialite" className="rounded hover:text-weello-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weello-gold/50">Confidentialité</Link>
        </nav>
        <p className="text-[10px] text-weello-gray/40 tracking-widest">
          © {new Date().getFullYear()} · WEELLO
        </p>
      </footer>
      </section>
    </div>
  );
}
