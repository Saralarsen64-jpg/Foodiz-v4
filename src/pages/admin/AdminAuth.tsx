import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Mail, Lock, ShieldAlert } from "lucide-react";
import { clearAdminAccess, grantAdminAccess } from "../../utils/adminAccess";
import {
  clearAdminLoginThrottle,
  getAdminLoginThrottle,
  recordAdminLoginFailure,
} from "../../utils/adminLoginThrottle";

function formatLockDuration(milliseconds: number) {
  const minutes = Math.max(1, Math.ceil(milliseconds / 60_000));
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lockRemainingMs, setLockRemainingMs] = useState(() => (
    getAdminLoginThrottle().remainingLockMs
  ));

  useEffect(() => {
    // Visiting the dedicated portal always requires a fresh admin password.
    clearAdminAccess();
    const throttle = getAdminLoginThrottle();
    if (throttle.locked) {
      setLockRemainingMs(throttle.remainingLockMs);
      setError(`Trop de tentatives. Réessayez dans ${formatLockDuration(throttle.remainingLockMs)}.`);
    }
  }, []);

  useEffect(() => {
    if (lockRemainingMs <= 0) return undefined;

    const interval = window.setInterval(() => {
      setLockRemainingMs(getAdminLoginThrottle().remainingLockMs);
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [lockRemainingMs]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const throttle = getAdminLoginThrottle();
    if (throttle.locked) {
      setLockRemainingMs(throttle.remainingLockMs);
      setError(`Trop de tentatives. Réessayez dans ${formatLockDuration(throttle.remainingLockMs)}.`);
      return;
    }

    setLoading(true);
    setError("");
    
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authError) {
      const nextThrottle = recordAdminLoginFailure();
      setLockRemainingMs(nextThrottle.remainingLockMs);
      setError(
        nextThrottle.locked
          ? `Trop de tentatives. Réessayez dans ${formatLockDuration(nextThrottle.remainingLockMs)}.`
          : "Identifiants incorrects.",
      );
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,status")
      .eq("id", data.user.id)
      .single();
    
    if (!profileError && profile?.role === "admin" && profile.status !== "suspended") {
      clearAdminLoginThrottle();
      grantAdminAccess(data.user.id);
      navigate("/admin", { replace: true });
    } else {
      const nextThrottle = recordAdminLoginFailure();
      clearAdminAccess();
      await supabase.auth.signOut();
      setLockRemainingMs(nextThrottle.remainingLockMs);
      setError(
        nextThrottle.locked
          ? `Trop de tentatives. Réessayez dans ${formatLockDuration(nextThrottle.remainingLockMs)}.`
          : "Accès refusé. Cette zone est strictement réservée aux administrateurs Weello.",
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-weello-black flex items-center justify-center p-4">
      <div className="w-full max-w-md weello-card p-8 border border-weello-red/20 shadow-2xl bg-[#0A0A0A]">
        <div className="flex justify-center mb-6 text-weello-red"><ShieldAlert size={48} /></div>
        <h1 className="weello-title text-2xl text-center mb-2 text-weello-cream">Portail Administrateur</h1>
        <p className="text-center text-weello-gray text-xs mb-6 uppercase tracking-widest">Accès strictement réservé</p>

        {error && <div className="p-3 rounded-lg bg-weello-red/10 text-weello-red border border-weello-red/20 text-xs mb-4 text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-weello-gold/30 bg-weello-black">
            <Mail size={18} className="text-weello-gold" />
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="flex-1 bg-transparent text-weello-cream outline-none text-sm"
              placeholder="Email administrateur" 
              autoComplete="username"
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-weello-gold/30 bg-weello-black">
            <Lock size={18} className="text-weello-gold" />
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="flex-1 bg-transparent text-weello-cream outline-none text-sm"
              placeholder="Mot de passe" 
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={loading || lockRemainingMs > 0} className="w-full bg-weello-red text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50">
            {loading
              ? "Vérification..."
              : lockRemainingMs > 0
                ? `Réessayez dans ${formatLockDuration(lockRemainingMs)}`
                : "Accéder au Dashboard"}
          </button>
        </form>
        <p className="mt-5 text-center text-[10px] leading-relaxed text-weello-gray">
          L’accès expire automatiquement après 30 minutes et reste limité à cet onglet.
        </p>
      </div>
    </div>
  );
}
