import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ProtectedRoute() {
  // On utilise 'undefined' pour dire "on ne sait pas encore", 'null' pour "pas connecté"
  const [session, setSession] = useState<any>(undefined);

  useEffect(() => {
    // 1. On récupère la session immédiatement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. On écoute les changements (comme quand on vient de se connecter via Login.tsx)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // TANT QUE session est undefined (chargement en cours), on affiche le spinner
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center text-foodiz-gold">
        <div className="w-16 h-16 rounded-full border-2 border-foodiz-gold/20 border-t-foodiz-gold animate-spin mb-4"></div>
        <p className="text-sm animate-pulse">Chargement de votre espace...</p>
      </div>
    );
  }

  // Si session est null (chargement fini, mais pas de connexion), on renvoie à l'auth
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Si session existe, on affiche la page (Dashboard, Home, etc.)
  return <Outlet />;
}