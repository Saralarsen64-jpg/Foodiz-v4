import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ProtectedRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // On essaie de récupérer la session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // VÉRIFICATION CRITIQUE : L'email doit être confirmé
        if (!session.user.email_confirmed_at) {
          await supabase.auth.signOut();
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } else {
        // Si pas de session du tout
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  // Pendant la vérification (quelques millisecondes), on affiche un chargement pour ne pas rediriger brutalement
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center text-foodiz-gold">
        <div className="w-16 h-16 rounded-full border-2 border-foodiz-gold/20 border-t-foodiz-gold animate-spin mb-4"></div>
        <p className="text-sm animate-pulse">Sécurisation de l'accès...</p>
      </div>
    );
  }

  // Si pas connecté ou email non confirmé, on renvoie à l'auth
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Si tout est bon, on affiche la page demandée (Dashboard, Home, etc.)
  return <Outlet />;
}