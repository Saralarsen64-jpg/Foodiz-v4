import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ProtectedRoute() {
  // 'undefined' signifie "on ne sait pas encore". 'null' signifie "pas connecté".
  const [session, setSession] = useState<any>(undefined);

  useEffect(() => {
    // 1. On vérifie la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. On écoute les changements (c'est lui qui va capter la connexion réussie de Login.tsx)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // TANT QUE session est undefined (chargement en cours), on affiche le spinner
  // Cela empêche le code de te renvoyer vers /auth trop vite !
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