import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { clearAdminAccess, hasValidAdminAccess } from "../utils/adminAccess";

type AppRole = "client" | "partner" | "courier" | "admin";

type ProtectedRouteProps = {
  allowedRoles?: AppRole[];
  requireValidated?: boolean;
  requireAdminLogin?: boolean;
};

function homeForRole(role: AppRole | null | undefined) {
  if (role === "admin") return "/admin";
  if (role === "partner") return "/partner";
  if (role === "courier") return "/courier";
  return "/client";
}

export default function ProtectedRoute({
  allowedRoles,
  requireValidated = false,
  requireAdminLogin = false,
}: ProtectedRouteProps) {
  const [session, setSession] = useState<any>(undefined);
  const [role, setRole] = useState<AppRole | null | undefined>(undefined);
  const [validationRedirect, setValidationRedirect] = useState<string | null | undefined>(undefined);
  const [adminAccessGranted, setAdminAccessGranted] = useState<boolean | undefined>(
    requireAdminLogin ? undefined : true,
  );

  useEffect(() => {
    const loadAccess = async (currentSession: any) => {
      setSession(currentSession);
      if (!currentSession?.user) {
        clearAdminAccess();
        setRole(null);
        setValidationRedirect(null);
        setAdminAccessGranted(!requireAdminLogin);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role,status")
        .eq("id", currentSession.user.id)
        .single();
      if (profileError || !profile) {
        setSession(null);
        setRole(null);
        setValidationRedirect(null);
        setAdminAccessGranted(!requireAdminLogin);
        return;
      }
      const currentRole = profile.role as AppRole;
      setRole(currentRole);
      setAdminAccessGranted(
        !requireAdminLogin
        || (currentRole === "admin" && hasValidAdminAccess(currentSession.user.id)),
      );
      if (currentRole !== "admin" && ["suspended", "rejected"].includes(profile.status || "")) {
        await supabase.auth.signOut();
        clearAdminAccess();
        setSession(null);
        setRole(null);
        setValidationRedirect(null);
        setAdminAccessGranted(!requireAdminLogin);
        return;
      }

      if (!requireValidated) {
        setValidationRedirect(null);
        return;
      }

      if (currentRole === "partner") {
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("status,is_active")
          .eq("owner_id", currentSession.user.id)
          .maybeSingle();
        setValidationRedirect(!restaurant ? "/partner/onboarding" : restaurant.status === "active" && restaurant.is_active ? null : "/partner/validation-status");
        return;
      }

      if (currentRole === "courier") {
        const { data: application } = await supabase
          .from("courier_applications")
          .select("status,document_review_status")
          .eq("user_id", currentSession.user.id)
          .maybeSingle();
        setValidationRedirect(
          !application
            ? "/courier/onboarding"
            : application.status === "validated" && application.document_review_status === "approved"
              ? null
              : "/courier/validation-status",
        );
        return;
      }

      setValidationRedirect(null);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadAccess(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      void loadAccess(session);
    });

    return () => subscription.unsubscribe();
  }, [requireAdminLogin, requireValidated]);

  useEffect(() => {
    if (!requireAdminLogin || role !== "admin" || !session?.user?.id) return;

    const verifyAdminGrant = () => {
      setAdminAccessGranted(hasValidAdminAccess(session.user.id));
    };
    const interval = window.setInterval(verifyAdminGrant, 15_000);
    return () => window.clearInterval(interval);
  }, [requireAdminLogin, role, session?.user?.id]);

  if (
    session === undefined
    || role === undefined
    || validationRedirect === undefined
    || adminAccessGranted === undefined
  ) {
    return (
      <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center text-foodiz-gold">
        <div className="w-16 h-16 rounded-full border-2 border-foodiz-gold/20 border-t-foodiz-gold animate-spin mb-4"></div>
        <p className="text-sm animate-pulse">Chargement de votre espace...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to={requireAdminLogin ? "/admin/auth" : "/auth"} replace />;
  }

  if (allowedRoles?.length && (!role || !allowedRoles.includes(role))) {
    if (requireAdminLogin) clearAdminAccess();
    return <Navigate to={homeForRole(role)} replace />;
  }

  if (requireAdminLogin && !adminAccessGranted) {
    return <Navigate to="/admin/auth" replace />;
  }

  if (validationRedirect) {
    return <Navigate to={validationRedirect} replace />;
  }

  return <Outlet />;
}
