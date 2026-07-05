import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ALWAYS_AVAILABLE = ["/waitlist", "/prelaunch-confirmed", "/activate", "/courier-documents", "/partner-documents", "/auth", "/admin-auth", "/admin/auth"];

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export default function LaunchBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isLocalDesignStudio = import.meta.env.DEV && location.pathname === "/design-studio";
  const [launched, setLaunched] = useState<boolean | null>(null);
  const [sessionRole, setSessionRole] = useState<string | null | undefined>(undefined);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      try {
        const response = await fetch("/api/launch-status", {
          cache: "no-store",
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        });
        const payload = await response.json();
        if (active) {
          setLaunched(payload.launched === true);
          setAccessAllowed(payload.accessAllowed === true);
          setSessionRole(payload.role || null);
        }
      } catch {
        // Fail closed: an unavailable launch-status endpoint must never expose the app.
        if (active) {
          setLaunched(false);
          setAccessAllowed(false);
          setSessionRole(null);
        }
      }

      if (!active) return;
      if (!session?.user) {
        setHasSession(false);
        setSessionRole(null);
        return;
      }
      setHasSession(true);
    };

    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => void load());
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!isLocalDesignStudio && (launched === null || sessionRole === undefined || hasSession === null || accessAllowed === null)) {
    return (
      <div className="min-h-screen bg-foodiz-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border border-foodiz-gold/20 border-t-foodiz-gold animate-spin" />
      </div>
    );
  }

  const availableBeforeLaunch = ALWAYS_AVAILABLE.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
  ) || isAdminPath(location.pathname);

  // The public domain root is always the public waitlist before launch,
  // including when an administrator session is already present.
  if (!isLocalDesignStudio && !launched && location.pathname === "/") {
    return <Navigate to="/waitlist" replace />;
  }

  if (!isLocalDesignStudio && !launched && location.pathname === "/auth/signup") {
    return <Navigate to="/waitlist" replace />;
  }

  if (!isLocalDesignStudio && !launched && !accessAllowed && !availableBeforeLaunch) {
    if (sessionRole === "admin") return <Navigate to="/waitlist" replace />;
    if (hasSession) return <Navigate to="/prelaunch-confirmed" replace />;
    return <Navigate to="/waitlist" replace />;
  }

  if (!isLocalDesignStudio && launched && location.pathname === "/waitlist") {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
