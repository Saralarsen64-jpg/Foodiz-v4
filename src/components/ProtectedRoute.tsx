import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ProtectedRoute() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Écouter les changements d'authentification en temps réel
    // Dès que le Login.tsx réussit la connexion, Supabase envoie un signal ici automatiquement.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Vérifier la session actuelle au chargement de la page (au cas où on est déjà connecté)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Nettoyage de l'écouteur quand on quitte la page
    return () => subscription.unsubscribe();
  }, []);

  // Pendant que ça charge (quelques millisecondes), on affiche un spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center text-foodiz-gold">
        <div className="w-16 h-16 rounded-full border-2 border-foodiz-gold/20 border-t-foodiz-gold animate-spin mb-4"></div>
        <p className="text-sm animate-pulse">Chargement de votre espace...</p>
      </div>
    );
  }

  // Si aucune session n'est détectée après le chargement, on renvoie à l'authentification
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Si une session est active, on affiche la page demandée (Dashboard, Home, etc.)
  return <Outlet />;
}