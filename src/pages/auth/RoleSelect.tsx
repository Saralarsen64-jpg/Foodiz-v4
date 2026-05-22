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

export default function AuthPage() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/client");
  };

  return (
    <div className="min-h-screen bg-foodiz-black">
      {/* ─── Kraft Envelope Header ───────────────────────────────────── */}
      <div className="relative w-full overflow-hidden pb-10">
        <img
          src="https://i.imgur.com/gtCArFr.png"
          alt="Foodiz"
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
            className="w-full py-4 rounded-2xl text-foodiz-black font-semibold text-base transition-all hover:shadow-xl hover:shadow-foodiz-gold/30 hover:-translate-y-0.5"
            style={{
              background:
                "linear-gradient(180deg, #E0B45C 0%, #D8A84F 50%, #C9A45C 100%)",
              boxShadow:
                "0 4px 20px rgba(216, 168, 79, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
            }}
          >
            Se connecter
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

        {/* Divider: ou continuer avec */}
        <div className="flex items-center gap-4 my-7">
          <div className="flex-1 h-px bg-foodiz-gold/30" />
          <span className="text-xs text-foodiz-gold font-medium tracking-wide whitespace-nowrap">
            ou continuer avec
          </span>
          <div className="flex-1 h-px bg-foodiz-gold/30" />
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button className="py-3 rounded-2xl border border-foodiz-gold/30 text-foodiz-cream text-sm font-medium flex items-center justify-center gap-3 hover:border-foodiz-gold/60 hover:bg-foodiz-gold/5 transition-all">
            {/* Real Google G logo */}
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            <span>Continuer avec Google</span>
          </button>
          <button className="py-3 rounded-2xl border border-foodiz-gold/30 text-foodiz-cream text-sm font-medium flex items-center justify-center gap-3 hover:border-foodiz-gold/60 hover:bg-foodiz-gold/5 transition-all">
            {/* Apple logo */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-foodiz-cream">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span>Continuer avec Apple</span>
          </button>
        </div>

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
          © {new Date().getFullYear()} · FOODIZ
        </p>
        {/* Hidden Admin Access - Positionné de manière fixe en bas à droite pour être trouvé à tâtons */}
        <button 
          onClick={() => navigate('/admin/auth')}
          className="fixed bottom-2 right-2 w-8 h-8 flex items-center justify-center text-[#050505] hover:text-[#0a0a0a] transition-colors text-[8px] select-none z-[100] cursor-default opacity-0"
          aria-hidden="true"
        >
          -
        </button>
      </footer>
      </section>
    </div>
  );
}
