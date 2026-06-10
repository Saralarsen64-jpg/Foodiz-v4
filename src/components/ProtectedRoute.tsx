import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ProtectedRoute() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. L'écouteur temps réel (il se déclenche IMMÉDIATEMENT avec la session actuelle)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false); // On ne débloque la porte que quand on a une réponse claire ici
    });

    // 2. Vérification de secours (mais on ne débloque la porte QUE si on a une session valide)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setLoading(false);
      }
      // Si session est null ici, on ne fait rien : on attend que l'écouteur (point 1) nous donne la réponse.
    });

    return () => subscription.unsubscribe();
  }, []);

  // Tant qu'on n'a pas de réponse claire (session ou confirmation de déconnexion), on affiche le chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center text-foodiz-gold">
        <div className="w-16 h-16 rounded-full border-2 border-foodiz-gold/20 border-t-foodiz-gold animate-spin mb-4"></div>
        <p className="text-sm animate-pulse">Sécurisation de l'accès...</p>
      </div>
    );
  }

  // Si le chargement est fini et qu'il n'y a toujours pas de session, alors on renvoie à l'auth
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Si on a une session, on ouvre la porte !
  return <Outlet />;
}