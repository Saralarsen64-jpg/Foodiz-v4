import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

type AppRole = "client" | "partner" | "courier" | "admin";

type ProtectedRouteProps = {
  allowedRoles?: AppRole[];
};

function homeForRole(role: AppRole | null | undefined) {
  if (role === "admin") return "/admin";
  if (role === "partner") return "/partner";
  if (role === "courier") return "/courier";
  return "/client";
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const [session, setSession] = useState<any>(undefined);
  const [role, setRole] = useState<AppRole | null | undefined>(undefined);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session?.user) {
        setRole(null);
        return;
      }

      supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => setRole((data?.role as AppRole) || "client"));
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session?.user) {
        setRole(null);
        return;
      }

      supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => setRole((data?.role as AppRole) || "client"));
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined || role === undefined) {
    return (
      <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center text-foodiz-gold">
        <div className="w-16 h-16 rounded-full border-2 border-foodiz-gold/20 border-t-foodiz-gold animate-spin mb-4"></div>
        <p className="text-sm animate-pulse">Chargement de votre espace...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles?.length && (!role || !allowedRoles.includes(role))) {
    return <Navigate to={homeForRole(role)} replace />;
  }

  return <Outlet />;
}
