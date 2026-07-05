import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  // LOGIQUE DE CONNEXION RÉELLE AJOUTÉE ICI
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.user) navigate(await resolveRedirectPath());
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-foodiz-black">
      {/* ─── Kraft Envelope Header ───────────────────────────────────── */}
      <div className="relative w-full overflow-hidden pb-10">
        <img
          src="/images/weello-wordmark.png"
          alt="Weello"
          className="block w-full h-auto align-top"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent via-foodiz-black/35 to-foodiz-black" />
      </div>

      {/* ─── Main Content ─────────────────────────────────────────────── */}
      <section
        className="relative z-10 mx-4 -mt-16 max-w-[520px] overflow-hidden rounded-[34px] border border-foodiz-gold/35 md:mx-auto"
        style={{
          background:
            "radial-gradient(circle at top, rgba(216, 168, 79, 0.08), transparent 38%), #050505",
          boxShadow:
            "0 -1px 0 rgba(224, 180, 92, 0.35), 0 28px 90px rgba(0, 0, 0, 0.7), 0 0 48px rgba(216, 168, 79, 0.13)",
        }}
      >
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-foodiz-gold/70 to-transparent" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-foodiz-gold/10 blur-3xl" />

      <main className="relative z-10 max-w-md mx-auto px-6 pt-8 pb-6">
        {/* Title */}
        <h1
          className="text-center text-3xl mb-4"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
        >
          <span className="text-foodiz-cream">Envie de vous faire </span>
          <span className="text-foodiz-gold italic">livrer</span>
          <span className="text-foodiz-cream"> ?</span>
        </h1>
        <p className="text-foodiz-gray text-sm text-center mb-8 leading-relaxed">
          Vos adresses préférées, vos envies du moment,
          <br />
          livrées simplement.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-foodiz-gold/30 hover:border-foodiz-gold/50 focus-within:border-foodiz-gold transition-all">
            <Mail
              size={18}
              className="text-foodiz-gold shrink-0"
              strokeWidth={1.8}
              style={{ filter: "drop-shadow(0 0 4px rgba(216, 168, 79, 0.4))" }}
            />
            <input
              type="email"
              placeholder="Adresse email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none placeholder-foodiz-gray/60"
            />
          </div>

          {/* Password */}
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-foodiz-gold/30 hover:border-foodiz-gold/50 focus-within:border-foodiz-gold transition-all">
            <Lock
              size={18}
              className="text-foodiz-gold shrink-0"
              strokeWidth={1.8}
              style={{ filter: "drop-shadow(0 0 4px rgba(216, 168, 79, 0.4))" }}
            />
            <input
              type={showPwd ? "text" : "password"}
              placeholder="Mot de passe"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none placeholder-foodiz-gray/60"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="text-foodiz-gold/70 hover:text-foodiz-gold transition-colors"
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Big Gold Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl text-foodiz-black font-semibold text-base transition-all hover:shadow-xl hover:shadow-foodiz-gold/30 hover:-translate-y-0.5 disabled:opacity-50"
            style={{
              background:
                "linear-gradient(180deg, #E0B45C 0%, #D8A84F 50%, #C9A45C 100%)",
              boxShadow:
                "0 4px 20px rgba(216, 168, 79, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
            }}
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        {/* Create account */}
        <p className="text-center text-sm text-foodiz-gray mt-6">
          Pas encore de compte ?{" "}
          <button
            onClick={() => navigate("/auth/signup?role=client")}
            className="text-foodiz-gold font-semibold hover:underline ml-1"
          >
            Créer mon compte
          </button>
        </p>


        {/* Divider: Vous êtes professionnel ? + chef hat */}
        <div className="my-8">
          <div className="flex justify-center mb-3">
            <div className="bg-foodiz-black px-2">
              <ChefHat
                size={20}
                className="text-foodiz-gold"
                strokeWidth={1.8}
                style={{ filter: "drop-shadow(0 0 6px rgba(216, 168, 79, 0.5))" }}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-foodiz-gold/30" />
            <span className="text-xs text-foodiz-gold font-semibold tracking-wide whitespace-nowrap">
              Vous êtes professionnel ?
            </span>
            <div className="flex-1 h-px bg-foodiz-gold/30" />
          </div>
        </div>

        {/* Pro Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Restaurants & Épiciers Card */}
          <div className="relative rounded-2xl border border-foodiz-gold/30 overflow-hidden bg-foodiz-card flex flex-col">
            <div className="p-4 pt-5 flex flex-col items-center text-center flex-1">
              {/* Circular gold icon */}
              <div className="w-14 h-14 rounded-full border-2 border-foodiz-gold flex items-center justify-center mb-3"
                style={{ boxShadow: "0 0 16px rgba(216, 168, 79, 0.25), inset 0 0 10px rgba(216, 168, 79, 0.08)" }}>
                <Store
                  size={26}
                  className="text-foodiz-gold"
                  strokeWidth={1.5}
                  style={{ filter: "drop-shadow(0 0 4px rgba(216, 168, 79, 0.5))" }}
                />
              </div>
              <h3
                className="text-lg leading-tight mb-2 text-foodiz-cream"
                style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
              >
                Restaurants<br />& Épiciers
              </h3>
              <p className="text-[11px] text-foodiz-gray leading-relaxed mb-4 px-1">
                Faites découvrir vos meilleures offres aux clients de votre ville.
              </p>
              <button
                onClick={() => navigate("/auth/signup?role=partner")}
                className="w-full py-2.5 rounded-xl text-foodiz-black text-xs font-semibold mb-2 transition-all hover:shadow-lg hover:shadow-foodiz-gold/30"
                style={{
                  background: "linear-gradient(180deg, #E0B45C 0%, #D8A84F 100%)",
                  boxShadow: "0 2px 10px rgba(216, 168, 79, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                }}
              >
                S'inscrire
              </button>
              <button
                onClick={() => navigate("/auth/login?role=partner")}
                className="w-full py-2.5 rounded-xl border border-foodiz-gold/50 text-foodiz-gold text-xs font-semibold hover:bg-foodiz-gold/5 transition-all"
              >
                Se connecter
              </button>
            </div>
            {/* Image at bottom — partially visible */}
            <div className="h-20 overflow-hidden bg-foodiz-black">
              <img src="/images/auth-restaurant.jpg" alt="" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Livreurs Card */}
          <div className="relative rounded-2xl border border-foodiz-gold/30 overflow-hidden bg-foodiz-card flex flex-col">
            <div className="p-4 pt-5 flex flex-col items-center text-center flex-1">
              <div className="w-14 h-14 rounded-full border-2 border-foodiz-gold flex items-center justify-center mb-3"
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
                  className="text-foodiz-gold"
                  style={{ filter: "drop-shadow(0 0 4px rgba(216, 168, 79, 0.5))" }}
                >
                  <circle cx="6" cy="17" r="3" />
                  <circle cx="18" cy="17" r="3" />
                  <path d="M6 17h7l2-5h-3l-1-3H8" />
                  <path d="M15 12V6h4" />
                </svg>
              </div>
              <h3
                className="text-lg leading-tight mb-2 text-foodiz-cream"
                style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
              >
                Livreurs
              </h3>
              <p className="text-[11px] text-foodiz-gray leading-relaxed mb-4 px-1">
                Rejoignez une expérience de livraison plus premium, plus claire, mieux pilotée.
              </p>
              <button
                onClick={() => navigate("/auth/signup?role=courier")}
                className="w-full py-2.5 rounded-xl text-foodiz-black text-xs font-semibold mb-2 transition-all hover:shadow-lg hover:shadow-foodiz-gold/30"
                style={{
                  background: "linear-gradient(180deg, #E0B45C 0%, #D8A84F 100%)",
                  boxShadow: "0 2px 10px rgba(216, 168, 79, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                }}
              >
                S'inscrire
              </button>
              <button
                onClick={() => navigate("/auth/login?role=courier")}
                className="w-full py-2.5 rounded-xl border border-foodiz-gold/50 text-foodiz-gold text-xs font-semibold hover:bg-foodiz-gold/5 transition-all"
              >
                Se connecter
              </button>
            </div>
            {/* Image at bottom — partially visible */}
            <div className="h-20 overflow-hidden bg-foodiz-black">
              <img src="/images/auth-courier.jpg" alt="" className="w-full h-full object-cover object-center" />
            </div>
          </div>
        </div>

        {/* Trust Badges Row */}
        <div className="grid grid-cols-4 gap-2 mt-10">
          {[
            { icon: Award, label: "Qualité\nsélectionnée" },
            { icon: MapPin, label: "Livraison\nrapide" },
            { icon: ShieldCheck, label: "Paiement\nsécurisé" },
            { icon: Headphones, label: "Support\ndisponible" },
          ].map((badge) => (
            <div key={badge.label} className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full border border-foodiz-gold/50 flex items-center justify-center mb-2"
                style={{ boxShadow: "0 0 10px rgba(216, 168, 79, 0.15)" }}>
                <badge.icon
                  size={18}
                  className="text-foodiz-gold"
                  strokeWidth={1.5}
                  style={{ filter: "drop-shadow(0 0 3px rgba(216, 168, 79, 0.4))" }}
                />
              </div>
              <p className="text-[10px] text-foodiz-gray leading-tight whitespace-pre-line">
                {badge.label}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-md mx-auto px-6 py-6 text-center">
        <p className="text-[10px] text-foodiz-gray/40 tracking-widest">
          © {new Date().getFullYear()} · WEELLO
        </p>
      </footer>
      </section>
    </div>
  );
}
